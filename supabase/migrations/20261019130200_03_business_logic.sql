-- =====================================================================
-- 03 · Regras de negócio
--   · cadastro entra na empresa pelo convite
--   · atribuição vira inscrição para cada pessoa do alvo (inclusive quem entra depois)
--   · progresso do conteúdo recalcula a trilha, emite certificado e notifica
--   · quiz corrigido no servidor
--   · aceite da LGPD, registro de uso diário, verificação pública de certificado
-- Funções confiáveis ligam a flag lms.trusted só durante a execução,
-- para poder atualizar campos protegidos do perfil (xp, aceite LGPD).
-- =====================================================================

create or replace function private.trusted_on() returns void
language sql set search_path = '' as $$ select set_config('lms.trusted', 'on', true) $$;
create or replace function private.trusted_off() returns void
language sql set search_path = '' as $$ select set_config('lms.trusted', 'off', true) $$;

-- ---------------------------------------------------------------------
-- Novo usuário → perfil (com empresa e papel vindos do convite)
-- ---------------------------------------------------------------------
-- O gatilho on_auth_user_created (em auth.users) já existe e chama esta função.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  inv public.invitations%rowtype;
begin
  select * into inv from public.invitations
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1;

  insert into public.profiles (id, email, full_name, company_id, role, department_id, manager_id, job_title, status)
  values (
    new.id,
    new.email,
    coalesce(inv.full_name, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    inv.company_id,
    coalesce(inv.role, 'learner'),
    inv.department_id,
    inv.manager_id,
    inv.job_title,
    'active'
  );

  if inv.id is not null then
    update public.invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Garante que registros de aprendizagem herdam a empresa da pessoa (ninguém grava em outra empresa).
create or replace function private.stamp_company_from_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.company_id := (select company_id from public.profiles where id = new.user_id);
  return new;
end;
$$;

create trigger content_progress_company before insert or update of user_id, company_id on public.content_progress
  for each row execute function private.stamp_company_from_user();
create trigger quiz_attempts_company before insert on public.quiz_attempts
  for each row execute function private.stamp_company_from_user();
create trigger enrollments_company before insert on public.enrollments
  for each row execute function private.stamp_company_from_user();
create trigger privacy_consents_company before insert on public.privacy_consents
  for each row execute function private.stamp_company_from_user();
create trigger support_requests_company before insert on public.support_requests
  for each row execute function private.stamp_company_from_user();

-- ---------------------------------------------------------------------
-- Atribuição → inscrições
-- ---------------------------------------------------------------------
create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, company_id, kind, title, body, link)
  select p_user, p.company_id, p_kind, p_title, p_body, p_link
  from public.profiles p where p.id = p_user and p.status <> 'inactive';
$$;

create or replace function private.item_title(p_content uuid, p_track uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select title from public.contents where id = p_content),
                  (select title from public.tracks where id = p_track))
$$;

-- Inscreve uma pessoa a partir de uma atribuição. Se já estava inscrita, mantém o progresso
-- e só reforça obrigatoriedade e prazo (o prazo mais curto vence).
create or replace function private.enroll_from_assignment(p_user uuid, a public.assignments)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  inserted boolean;
begin
  if a.content_id is not null then
    insert into public.enrollments (company_id, user_id, content_id, assignment_id, mandatory, due_date)
    values (a.company_id, p_user, a.content_id, a.id, a.mandatory, a.due_date)
    on conflict (user_id, content_id) where content_id is not null do update
      set mandatory = public.enrollments.mandatory or excluded.mandatory,
          due_date = least(public.enrollments.due_date, excluded.due_date),
          assignment_id = coalesce(public.enrollments.assignment_id, excluded.assignment_id)
    returning (xmax = 0) into inserted;
  else
    insert into public.enrollments (company_id, user_id, track_id, assignment_id, mandatory, due_date)
    values (a.company_id, p_user, a.track_id, a.id, a.mandatory, a.due_date)
    on conflict (user_id, track_id) where track_id is not null do update
      set mandatory = public.enrollments.mandatory or excluded.mandatory,
          due_date = least(public.enrollments.due_date, excluded.due_date),
          assignment_id = coalesce(public.enrollments.assignment_id, excluded.assignment_id)
    returning (xmax = 0) into inserted;
  end if;

  if inserted then
    perform private.notify(
      p_user,
      case when a.mandatory then 'assignment' else 'recommendation' end,
      case when a.mandatory then 'Novo treinamento atribuído' else 'Recomendação de desenvolvimento' end,
      private.item_title(a.content_id, a.track_id)
        || case when a.due_date is not null then ' · prazo ' || to_char(a.due_date, 'DD/MM/YYYY') else '' end,
      case when a.track_id is not null then '/trilhas/' || a.track_id else '/conteudos/' || a.content_id end
    );
  end if;
end;
$$;

-- Pessoas que o alvo da atribuição alcança.
create or replace function private.assignment_users(a public.assignments)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.profiles p
  where p.company_id = a.company_id
    and p.status <> 'inactive'
    and (
      (a.target_type = 'company')
      or (a.target_type = 'user' and p.id = a.target_id)
      or (a.target_type = 'department' and p.department_id = a.target_id)
      or (a.target_type = 'group' and exists (select 1 from public.group_members gm
                                              where gm.group_id = a.target_id and gm.user_id = p.id))
    )
$$;

create or replace function private.on_assignment_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  u uuid;
begin
  for u in select * from private.assignment_users(new) loop
    perform private.enroll_from_assignment(u, new);
  end loop;
  return new;
end;
$$;
create trigger assignments_expand after insert on public.assignments
  for each row execute function private.on_assignment_created();

-- Quem entra depois (nova pessoa, troca de departamento, entrada em grupo) recebe as atribuições do alvo.
create or replace function private.apply_assignments_to_user(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.assignments;
begin
  for a in
    select x.* from public.assignments x
    join public.profiles p on p.id = p_user and p.company_id = x.company_id
    where p_user in (select * from private.assignment_users(x))
  loop
    perform private.enroll_from_assignment(p_user, a);
  end loop;
end;
$$;

create or replace function private.on_profile_membership_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.company_id is not null and (
       tg_op = 'INSERT'
       or new.company_id is distinct from old.company_id
       or new.department_id is distinct from old.department_id
       or (old.status = 'inactive' and new.status <> 'inactive')) then
    perform private.apply_assignments_to_user(new.id);
  end if;
  return new;
end;
$$;
create trigger profiles_apply_assignments after insert or update of company_id, department_id, status on public.profiles
  for each row execute function private.on_profile_membership_change();

create or replace function private.on_group_member_added()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.apply_assignments_to_user(new.user_id);
  return new;
end;
$$;
create trigger group_members_apply_assignments after insert on public.group_members
  for each row execute function private.on_group_member_added();

-- ---------------------------------------------------------------------
-- Progresso → inscrição do conteúdo, trilhas, certificado, XP
-- ---------------------------------------------------------------------
create or replace function private.issue_track_certificate(p_user uuid, p_track uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tracks;
  workload integer;
begin
  select * into t from public.tracks where id = p_track;
  if not t.certificate_enabled then return; end if;

  select coalesce(sum(c.duration_minutes), 0) into workload
  from public.track_items ti
  join public.track_modules tm on tm.id = ti.module_id
  join public.contents c on c.id = ti.content_id
  where tm.track_id = p_track and ti.required;

  insert into public.certificates (company_id, user_id, track_id, title, recipient_name, workload_minutes)
  select p.company_id, p.id, t.id, t.title, p.full_name, nullif(workload, 0)
  from public.profiles p where p.id = p_user
  on conflict (user_id, track_id) where track_id is not null do nothing;

  perform private.notify(p_user, 'certificate', 'Certificado disponível',
                         'Você concluiu a trilha ' || t.title || '.', '/certificados');
end;
$$;

create or replace function private.on_content_progress_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  just_completed boolean := new.status = 'completed'
                            and (tg_op = 'INSERT' or old.status is distinct from 'completed');
  e record;
  total integer;
  done integer;
  pct numeric;
begin
  perform private.trusted_on();

  -- Inscrição no conteúdo avulso: atualiza se existe; cria só se o conteúdo
  -- não estiver sendo feito dentro de uma trilha (para não duplicar nos relatórios).
  update public.enrollments
     set status = case when status = 'completed' then 'completed'::public.progress_status else new.status end,
         progress_pct = greatest(progress_pct, new.progress_pct),
         started_at = coalesce(started_at, new.started_at),
         completed_at = coalesce(completed_at, new.completed_at)
   where user_id = new.user_id and content_id = new.content_id;

  if not found and not exists (
       select 1 from public.enrollments en
       join public.track_modules tm on tm.track_id = en.track_id
       join public.track_items ti on ti.module_id = tm.id
       where en.user_id = new.user_id and ti.content_id = new.content_id) then
    insert into public.enrollments (company_id, user_id, content_id, status, progress_pct, started_at, completed_at)
    values (new.company_id, new.user_id, new.content_id, new.status, new.progress_pct, new.started_at, new.completed_at)
    on conflict do nothing;
  end if;

  if just_completed then
    update public.profiles set xp = xp + 10 where id = new.user_id;
  end if;

  -- Trilhas em que esse conteúdo aparece e em que a pessoa está inscrita.
  for e in
    select distinct en.id, en.track_id, en.status
    from public.enrollments en
    join public.track_modules tm on tm.track_id = en.track_id
    join public.track_items ti on ti.module_id = tm.id and ti.content_id = new.content_id
    where en.user_id = new.user_id and en.track_id is not null
  loop
    select count(*),
           count(*) filter (where cp.status = 'completed')
      into total, done
    from public.track_items ti
    join public.track_modules tm on tm.id = ti.module_id
    left join public.content_progress cp on cp.content_id = ti.content_id and cp.user_id = new.user_id
    where tm.track_id = e.track_id and ti.required;

    pct := case when total = 0 then 0 else round(done * 100.0 / total, 2) end;

    update public.enrollments
       set progress_pct = pct,
           status = case when pct >= 100 then 'completed'::public.progress_status
                         else 'in_progress'::public.progress_status end,
           started_at = coalesce(started_at, now()),
           completed_at = case when pct >= 100 then coalesce(completed_at, now()) else completed_at end
     where id = e.id;

    if pct >= 100 and e.status <> 'completed' then
      update public.profiles set xp = xp + 50 where id = new.user_id;
      perform private.issue_track_certificate(new.user_id, e.track_id);
    end if;
  end loop;

  perform private.trusted_off();
  return new;
end;
$$;
create trigger content_progress_rollup after insert or update of status, progress_pct on public.content_progress
  for each row execute function private.on_content_progress_change();

-- Conclusão é definitiva: carimba a data e não deixa voltar para "em andamento".
create or replace function private.content_progress_normalize()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'completed' then
    new.status := 'completed';
    new.completed_at := old.completed_at;
    new.progress_pct := 100;
  elsif new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
    new.progress_pct := 100;
  end if;
  return new;
end;
$$;
create trigger content_progress_normalize before insert or update on public.content_progress
  for each row execute function private.content_progress_normalize();

-- ---------------------------------------------------------------------
-- RPCs públicas (chamadas pelo app)
-- ---------------------------------------------------------------------

-- Corrige o quiz no servidor. p_answers: {"<question_id>": ["<option_id>", ...], ...}
create or replace function public.submit_quiz(p_content_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  q record;
  chosen uuid[];
  correct uuid[];
  got integer := 0;
  max_pts integer := 0;
  pct numeric;
  needed integer;
  ok boolean;
  detail jsonb := '[]'::jsonb;
begin
  if me is null then raise exception 'É preciso estar logado.'; end if;
  if not private.can_view_content(p_content_id) then raise exception 'Conteúdo não disponível.'; end if;

  select pass_score into needed from public.contents where id = p_content_id and type = 'quiz';
  if needed is null then raise exception 'Este conteúdo não é um quiz.'; end if;

  for q in select id, points from public.quiz_questions where content_id = p_content_id loop
    select coalesce(array_agg(distinct x.val::uuid order by x.val::uuid), '{}')
      into chosen from jsonb_array_elements_text(coalesce(p_answers -> q.id::text, '[]'::jsonb)) as x(val);
    select coalesce(array_agg(o.id order by o.id), '{}')
      into correct from public.quiz_options o join public.quiz_answer_keys k on k.option_id = o.id
     where o.question_id = q.id and k.is_correct;

    ok := chosen = correct;
    max_pts := max_pts + q.points;
    if ok then got := got + q.points; end if;
    detail := detail || jsonb_build_object('question_id', q.id, 'correct', ok);
  end loop;

  if max_pts = 0 then raise exception 'Quiz sem perguntas.'; end if;
  pct := round(got * 100.0 / max_pts, 2);

  insert into public.quiz_attempts (user_id, content_id, answers, score, points, max_points, passed)
  values (me, p_content_id, p_answers, pct, got, max_pts, pct >= needed);

  insert into public.content_progress (user_id, content_id, status, progress_pct, score)
  values (me, p_content_id,
          case when pct >= needed then 'completed'::public.progress_status else 'in_progress'::public.progress_status end,
          case when pct >= needed then 100 else 0 end, pct)
  on conflict (user_id, content_id) do update
    set score = greatest(public.content_progress.score, excluded.score),
        status = case when public.content_progress.status = 'completed' then 'completed'::public.progress_status
                      else excluded.status end,
        progress_pct = greatest(public.content_progress.progress_pct, excluded.progress_pct);

  return jsonb_build_object('score', pct, 'points', got, 'max_points', max_pts,
                            'passed', pct >= needed, 'pass_score', needed, 'questions', detail);
end;
$$;

-- Aceite da política de privacidade (LGPD).
create or replace function public.record_privacy_consent(p_user_agent text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  version text;
begin
  if me is null then raise exception 'É preciso estar logado.'; end if;
  select coalesce(c.privacy_policy_version, '1.0') into version
  from public.profiles p left join public.companies c on c.id = p.company_id where p.id = me;

  insert into public.privacy_consents (user_id, policy_version, user_agent) values (me, version, left(p_user_agent, 500));

  perform private.trusted_on();
  update public.profiles set privacy_consented_at = now(), privacy_policy_version = version where id = me;
  perform private.trusted_off();
end;
$$;

-- Registra o acesso do dia (base da cobrança por usuário ativo). Chamar ao abrir o app.
create or replace function public.touch_activity()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return; end if;
  insert into public.user_activity_days (user_id, company_id, day)
  select me, company_id, current_date from public.profiles where id = me
  on conflict do nothing;
  perform private.trusted_on();
  update public.profiles set last_active_at = now() where id = me;
  perform private.trusted_off();
end;
$$;

-- Verificação pública de certificado pelo código (página aberta, sem login).
create or replace function public.verify_certificate(p_code text)
returns table (recipient_name text, title text, company_name text, workload_minutes integer, issued_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.recipient_name, c.title, co.name, c.workload_minutes, c.issued_at
  from public.certificates c left join public.companies co on co.id = c.company_id
  where c.code = upper(trim(p_code))
$$;

revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
revoke execute on function public.record_privacy_consent(text) from public, anon;
revoke execute on function public.touch_activity() from public, anon;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
grant execute on function public.record_privacy_consent(text) to authenticated;
grant execute on function public.touch_activity() to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Lembretes de prazo (rodado diariamente pelo pg_cron)
-- ---------------------------------------------------------------------
create or replace function private.generate_due_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select en.user_id, en.due_date, en.content_id, en.track_id,
           case when en.due_date < current_date then 'overdue' else 'due_soon' end as kind
    from public.enrollments en
    join public.profiles p on p.id = en.user_id and p.status = 'active'
    where en.status <> 'completed'
      and en.due_date is not null
      and (en.due_date = current_date + 3 or en.due_date = current_date or en.due_date = current_date - 1
           or (en.due_date < current_date and extract(dow from current_date) = 1)) -- atrasados: toda segunda
  loop
    perform private.notify(
      r.user_id, r.kind,
      case when r.kind = 'overdue' then 'Treinamento atrasado' else 'Prazo chegando' end,
      private.item_title(r.content_id, r.track_id) || ' · prazo ' || to_char(r.due_date, 'DD/MM/YYYY'),
      case when r.track_id is not null then '/trilhas/' || r.track_id else '/conteudos/' || r.content_id end);
    n := n + 1;
  end loop;
  return n;
end;
$$;
