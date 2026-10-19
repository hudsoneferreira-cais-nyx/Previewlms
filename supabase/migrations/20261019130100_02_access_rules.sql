-- =====================================================================
-- 02 · Regras de acesso (RLS)
-- Papéis:
--   platform_admin  consultor da cais: vê e administra todas as empresas
--   company_admin   administrador do cliente: tudo dentro da própria empresa
--   manager         gestor: vê a própria equipe e atribui a ela
--   learner         colaborador: vê o que é dele e o catálogo liberado
-- As funções auxiliares ficam no schema "private", fora da API pública.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create or replace function private.my_company_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select company_id from public.profiles where id = (select auth.uid()) $$;

create or replace function private.my_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) and status <> 'inactive' $$;

create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select private.my_role()) = 'platform_admin', false) $$;

-- Administra a empresa (admin do cliente) ou é consultor da plataforma.
create or replace function private.is_company_admin(target_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select private.is_platform_admin())
      or (target_company is not null
          and target_company = (select private.my_company_id())
          and (select private.my_role()) = 'company_admin')
$$;

-- Admin ou gestor da empresa.
create or replace function private.is_company_staff(target_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select private.is_platform_admin())
      or (target_company is not null
          and target_company = (select private.my_company_id())
          and (select private.my_role()) in ('company_admin', 'manager'))
$$;

-- A pessoa é da equipe direta do usuário atual.
create or replace function private.manages(target_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user and p.manager_id = (select auth.uid())
  )
$$;

-- Pode ver os dados de aprendizagem desta pessoa (ela mesma, o gestor dela, o admin da empresa).
create or replace function private.can_see_user_data(target_user uuid, target_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select target_user = (select auth.uid())
      or (select private.is_company_admin(target_company))
      or (select private.manages(target_user))
$$;

create or replace function private.audience_ok(a public.audience)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select a <> 'manager'
      or (select private.my_role()) in ('manager', 'company_admin', 'platform_admin')
$$;

-- Trilha visível: publicada e da minha empresa, ou da biblioteca da consultoria com licença.
create or replace function private.can_view_track(target_track uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tracks t
    where t.id = target_track
      and (
        (select private.is_platform_admin())
        or (t.company_id is not null and (select private.is_company_admin(t.company_id)))
        or (
          t.status = 'published'
          and (select private.audience_ok(t.audience))
          and (
            t.company_id = (select private.my_company_id())
            or (t.company_id is null and exists (
                  select 1 from public.library_licenses l
                  where l.track_id = t.id and l.company_id = (select private.my_company_id())))
          )
        )
      )
  )
$$;

-- Conteúdo visível: publicado e da minha empresa, ou licenciado direto, ou parte de trilha licenciada.
create or replace function private.can_view_content(target_content uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.contents c
    where c.id = target_content
      and (
        (select private.is_platform_admin())
        or (c.company_id is not null and (select private.is_company_admin(c.company_id)))
        or (
          c.status = 'published'
          and (select private.audience_ok(c.audience))
          and (
            c.company_id = (select private.my_company_id())
            or (c.company_id is null and (
                  exists (select 1 from public.library_licenses l
                          where l.content_id = c.id and l.company_id = (select private.my_company_id()))
                  or exists (select 1 from public.track_items ti
                             join public.track_modules tm on tm.id = ti.module_id
                             join public.library_licenses l on l.track_id = tm.track_id
                             where ti.content_id = c.id and l.company_id = (select private.my_company_id()))
               ))
          )
        )
      )
  )
$$;

-- Pode editar conteúdo/trilha: admin da empresa dona, ou consultor para a biblioteca global.
create or replace function private.can_edit_owned(owner_company uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case when owner_company is null then (select private.is_platform_admin())
              else (select private.is_company_admin(owner_company)) end
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- Liga RLS em tudo
-- ---------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;
alter table public.categories enable row level security;
alter table public.contents enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.tracks enable row level security;
alter table public.track_modules enable row level security;
alter table public.track_items enable row level security;
alter table public.library_licenses enable row level security;
alter table public.assignments enable row level security;
alter table public.enrollments enable row level security;
alter table public.content_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.privacy_consents enable row level security;
alter table public.support_requests enable row level security;
alter table public.user_activity_days enable row level security;

-- Empresas ------------------------------------------------------------
create policy "companies: membros veem a própria" on public.companies for select to authenticated
  using (id = (select private.my_company_id()) or (select private.is_platform_admin()));
create policy "companies: admin edita a própria" on public.companies for update to authenticated
  using ((select private.is_company_admin(id))) with check ((select private.is_company_admin(id)));
create policy "companies: consultor cria" on public.companies for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy "companies: consultor remove" on public.companies for delete to authenticated
  using ((select private.is_platform_admin()));

-- Departamentos, grupos, categorias -----------------------------------
create policy "departments: empresa vê" on public.departments for select to authenticated
  using (company_id = (select private.my_company_id()) or (select private.is_platform_admin()));
create policy "departments: admin grava" on public.departments for all to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));

create policy "groups: empresa vê" on public.groups for select to authenticated
  using (company_id = (select private.my_company_id()) or (select private.is_platform_admin()));
create policy "groups: admin grava" on public.groups for all to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));

create policy "group_members: empresa vê" on public.group_members for select to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id
                 and (g.company_id = (select private.my_company_id()) or (select private.is_platform_admin()))));
create policy "group_members: admin grava" on public.group_members for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and (select private.is_company_admin(g.company_id))))
  with check (exists (select 1 from public.groups g where g.id = group_id and (select private.is_company_admin(g.company_id))));

create policy "categories: vê da empresa e da biblioteca" on public.categories for select to authenticated
  using (company_id is null or company_id = (select private.my_company_id()) or (select private.is_platform_admin()));
create policy "categories: dono grava" on public.categories for all to authenticated
  using ((select private.can_edit_owned(company_id))) with check ((select private.can_edit_owned(company_id)));

-- Pessoas -------------------------------------------------------------
create policy "profiles: colegas da empresa se veem" on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or company_id = (select private.my_company_id())
         or (select private.is_platform_admin()));
create policy "profiles: cada um edita o seu" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin edita a empresa" on public.profiles for update to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));

-- Impede que alguém promova a si mesmo ou troque de empresa.
create or replace function private.guard_profile_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor_role public.app_role := (select private.my_role());
begin
  -- Chamadas internas (service role, ou funções confiáveis do próprio banco) passam.
  if (select auth.uid()) is null or current_setting('lms.trusted', true) = 'on' then
    return new;
  end if;

  if actor_role = 'platform_admin' then
    return new;
  end if;

  if new.role = 'platform_admin' and old.role is distinct from 'platform_admin' then
    raise exception 'Somente a consultoria pode criar administradores da plataforma.';
  end if;

  if new.company_id is distinct from old.company_id then
    raise exception 'Não é permitido trocar a pessoa de empresa.';
  end if;

  if actor_role = 'company_admin' and old.company_id = (select private.my_company_id()) then
    return new;
  end if;

  -- Usuário comum editando o próprio perfil: só campos pessoais.
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.manager_id is distinct from old.manager_id
     or new.department_id is distinct from old.department_id
     or new.xp is distinct from old.xp
     or new.email is distinct from old.email
     or new.privacy_consented_at is distinct from old.privacy_consented_at
     or new.privacy_policy_version is distinct from old.privacy_policy_version then
    raise exception 'Você só pode alterar nome, cargo, unidade e foto do seu perfil.';
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile_update();

create policy "invitations: admin gerencia" on public.invitations for all to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));

-- Conteúdo e trilhas --------------------------------------------------
create policy "contents: quem pode ver" on public.contents for select to authenticated
  using ((select private.can_view_content(id)));
create policy "contents: dono insere" on public.contents for insert to authenticated
  with check ((select private.can_edit_owned(company_id)));
create policy "contents: dono edita" on public.contents for update to authenticated
  using ((select private.can_edit_owned(company_id))) with check ((select private.can_edit_owned(company_id)));
create policy "contents: dono remove" on public.contents for delete to authenticated
  using ((select private.can_edit_owned(company_id)));

create policy "quiz_questions: quem vê o conteúdo" on public.quiz_questions for select to authenticated
  using ((select private.can_view_content(content_id)));
create policy "quiz_questions: dono grava" on public.quiz_questions for all to authenticated
  using (exists (select 1 from public.contents c where c.id = content_id and (select private.can_edit_owned(c.company_id))))
  with check (exists (select 1 from public.contents c where c.id = content_id and (select private.can_edit_owned(c.company_id))));

create policy "quiz_options: quem vê o conteúdo" on public.quiz_options for select to authenticated
  using (exists (select 1 from public.quiz_questions q where q.id = question_id and (select private.can_view_content(q.content_id))));
create policy "quiz_options: dono grava" on public.quiz_options for all to authenticated
  using (exists (select 1 from public.quiz_questions q join public.contents c on c.id = q.content_id
                 where q.id = question_id and (select private.can_edit_owned(c.company_id))))
  with check (exists (select 1 from public.quiz_questions q join public.contents c on c.id = q.content_id
                 where q.id = question_id and (select private.can_edit_owned(c.company_id))));

-- Gabarito: só quem edita o conteúdo.
create policy "quiz_answer_keys: só o dono" on public.quiz_answer_keys for all to authenticated
  using (exists (select 1 from public.quiz_options o join public.quiz_questions q on q.id = o.question_id
                 join public.contents c on c.id = q.content_id
                 where o.id = option_id and (select private.can_edit_owned(c.company_id))))
  with check (exists (select 1 from public.quiz_options o join public.quiz_questions q on q.id = o.question_id
                 join public.contents c on c.id = q.content_id
                 where o.id = option_id and (select private.can_edit_owned(c.company_id))));

create policy "tracks: quem pode ver" on public.tracks for select to authenticated
  using ((select private.can_view_track(id)));
create policy "tracks: dono insere" on public.tracks for insert to authenticated
  with check ((select private.can_edit_owned(company_id)));
create policy "tracks: dono edita" on public.tracks for update to authenticated
  using ((select private.can_edit_owned(company_id))) with check ((select private.can_edit_owned(company_id)));
create policy "tracks: dono remove" on public.tracks for delete to authenticated
  using ((select private.can_edit_owned(company_id)));

create policy "track_modules: quem vê a trilha" on public.track_modules for select to authenticated
  using ((select private.can_view_track(track_id)));
create policy "track_modules: dono grava" on public.track_modules for all to authenticated
  using (exists (select 1 from public.tracks t where t.id = track_id and (select private.can_edit_owned(t.company_id))))
  with check (exists (select 1 from public.tracks t where t.id = track_id and (select private.can_edit_owned(t.company_id))));

create policy "track_items: quem vê a trilha" on public.track_items for select to authenticated
  using (exists (select 1 from public.track_modules m where m.id = module_id and (select private.can_view_track(m.track_id))));
create policy "track_items: dono grava" on public.track_items for all to authenticated
  using (exists (select 1 from public.track_modules m join public.tracks t on t.id = m.track_id
                 where m.id = module_id and (select private.can_edit_owned(t.company_id))))
  with check (exists (select 1 from public.track_modules m join public.tracks t on t.id = m.track_id
                 where m.id = module_id and (select private.can_edit_owned(t.company_id))));

create policy "library_licenses: empresa vê as suas" on public.library_licenses for select to authenticated
  using (company_id = (select private.my_company_id()) or (select private.is_platform_admin()));
create policy "library_licenses: consultor gerencia" on public.library_licenses for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

-- Atribuições ---------------------------------------------------------
create policy "assignments: equipe da empresa vê" on public.assignments for select to authenticated
  using ((select private.is_company_staff(company_id)));
create policy "assignments: admin atribui a qualquer alvo" on public.assignments for insert to authenticated
  with check ((select private.is_company_admin(company_id)));
create policy "assignments: gestor atribui à própria equipe" on public.assignments for insert to authenticated
  with check (company_id = (select private.my_company_id())
              and (select private.my_role()) = 'manager'
              and target_type = 'user'
              and (select private.manages(target_id))
              and assigned_by = (select auth.uid()));
create policy "assignments: admin edita e remove" on public.assignments for update to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));
create policy "assignments: admin remove" on public.assignments for delete to authenticated
  using ((select private.is_company_admin(company_id)));

-- Inscrições: o aluno se inscreve sozinho pelo catálogo; o restante vem das atribuições.
create policy "enrollments: quem pode ver" on public.enrollments for select to authenticated
  using ((select private.can_see_user_data(user_id, company_id)));
create policy "enrollments: autoinscrição" on public.enrollments for insert to authenticated
  with check (user_id = (select auth.uid())
              and company_id = (select private.my_company_id())
              and assignment_id is null and mandatory = false
              and status = 'not_started' and progress_pct = 0 and completed_at is null
              and ((content_id is not null and (select private.can_view_content(content_id)))
                   or (track_id is not null and (select private.can_view_track(track_id)))));
create policy "enrollments: admin gerencia" on public.enrollments for update to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));
create policy "enrollments: admin ou o próprio remove" on public.enrollments for delete to authenticated
  using ((select private.is_company_admin(company_id)) or (user_id = (select auth.uid()) and assignment_id is null));

-- Progresso: o próprio aluno grava (player de vídeo/SCORM); gestor e admin leem.
create policy "content_progress: quem pode ver" on public.content_progress for select to authenticated
  using ((select private.can_see_user_data(user_id, company_id)));
create policy "content_progress: o próprio insere" on public.content_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.can_view_content(content_id)));
create policy "content_progress: o próprio atualiza" on public.content_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "quiz_attempts: quem pode ver" on public.quiz_attempts for select to authenticated
  using ((select private.can_see_user_data(user_id, company_id)));
-- Tentativas só entram pela função submit_quiz (que corrige no servidor).

create policy "certificates: quem pode ver" on public.certificates for select to authenticated
  using ((select private.can_see_user_data(user_id, company_id)));

create policy "favorites: só o próprio" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "notifications: só o próprio lê" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: só o próprio marca como lida" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: só o próprio apaga" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "privacy_consents: o próprio e o admin veem" on public.privacy_consents for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_company_admin(company_id)));
-- Aceite só entra pela função record_privacy_consent.

create policy "support_requests: o próprio e o admin veem" on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_company_admin(company_id)));
create policy "support_requests: o próprio abre" on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and company_id is not distinct from (select private.my_company_id())
              and status = 'open' and answer is null);
create policy "support_requests: admin responde" on public.support_requests for update to authenticated
  using ((select private.is_company_admin(company_id))) with check ((select private.is_company_admin(company_id)));

create policy "user_activity_days: admin vê" on public.user_activity_days for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_company_admin(company_id)));
