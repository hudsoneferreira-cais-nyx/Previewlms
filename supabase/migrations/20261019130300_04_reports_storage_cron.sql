-- =====================================================================
-- 04 · Relatórios, arquivos e rotina diária
-- As views usam security_invoker: cada pessoa só enxerga as linhas que as
-- regras de acesso já permitem (o aluno vê a si, o gestor a equipe, o admin a empresa).
-- =====================================================================

-- Progresso por pessoa e item (base de quase todos os relatórios e da exportação CSV)
create view public.report_learner_progress
with (security_invoker = true) as
select
  en.id as enrollment_id,
  en.company_id,
  p.id as user_id,
  p.full_name,
  p.email,
  p.job_title,
  p.unit,
  d.name as department,
  m.full_name as manager_name,
  case when en.track_id is not null then 'trilha' else 'conteúdo' end as item_kind,
  coalesce(t.title, c.title) as item_title,
  en.mandatory,
  en.status,
  en.progress_pct,
  en.due_date,
  en.started_at,
  en.completed_at,
  case
    when en.status = 'completed' then 'Concluído'
    when en.due_date is null then 'Sem prazo'
    when en.due_date < current_date then 'Atrasado'
    when en.due_date <= current_date + 3 then 'Vence em breve'
    else 'No prazo'
  end as situation
from public.enrollments en
join public.profiles p on p.id = en.user_id
left join public.departments d on d.id = p.department_id
left join public.profiles m on m.id = p.manager_id
left join public.tracks t on t.id = en.track_id
left join public.contents c on c.id = en.content_id;

-- Conformidade: só o que é obrigatório
create view public.report_compliance
with (security_invoker = true) as
select * from public.report_learner_progress where mandatory;

-- Painel da empresa
create view public.report_company_overview
with (security_invoker = true) as
select
  co.id as company_id,
  co.name as company_name,
  (select count(*) from public.profiles p where p.company_id = co.id and p.status = 'active') as active_people,
  (select count(distinct a.user_id) from public.user_activity_days a
     where a.company_id = co.id and a.day >= date_trunc('month', current_date)::date) as active_users_this_month,
  (select count(*) from public.enrollments e where e.company_id = co.id) as enrollments,
  (select count(*) from public.enrollments e where e.company_id = co.id and e.status = 'completed') as completed,
  (select count(*) from public.enrollments e where e.company_id = co.id and e.status <> 'completed'
     and e.due_date < current_date) as overdue,
  (select count(*) from public.certificates ce where ce.company_id = co.id) as certificates,
  (select round(avg(e.progress_pct), 1) from public.enrollments e where e.company_id = co.id) as avg_progress_pct
from public.companies co;

-- Usuários ativos por mês (cobrança por usuário ativo)
create view public.report_monthly_active_users
with (security_invoker = true) as
select
  a.company_id,
  date_trunc('month', a.day)::date as month,
  count(distinct a.user_id) as active_users
from public.user_activity_days a
group by a.company_id, date_trunc('month', a.day);

-- Desempenho por conteúdo
create view public.report_content_stats
with (security_invoker = true) as
select
  c.id as content_id,
  c.company_id,
  c.title,
  c.type,
  count(cp.user_id) as started,
  count(cp.user_id) filter (where cp.status = 'completed') as completed,
  round(avg(cp.score), 1) as avg_score,
  round(sum(cp.time_spent_seconds) / 3600.0, 1) as hours_spent
from public.contents c
left join public.content_progress cp on cp.content_id = c.id
group by c.id;

-- Ranking por XP dentro da empresa
create view public.report_leaderboard
with (security_invoker = true) as
select p.company_id, p.id as user_id, p.full_name, d.name as department, p.xp,
       rank() over (partition by p.company_id order by p.xp desc) as position
from public.profiles p
left join public.departments d on d.id = p.department_id
where p.status = 'active' and p.company_id is not null;

grant select on public.report_learner_progress, public.report_compliance, public.report_company_overview,
  public.report_monthly_active_users, public.report_content_stats, public.report_leaderboard to authenticated;
revoke select on public.report_learner_progress, public.report_compliance, public.report_company_overview,
  public.report_monthly_active_users, public.report_content_stats, public.report_leaderboard from anon;

-- ---------------------------------------------------------------------
-- Arquivos (Storage)
--   content/{company_id|global}/...   vídeos, PDFs, pacotes SCORM (privado)
--   branding/{company_id}/...         logo, favicon, capas (público)
--   certificates/{company_id}/{user_id}/...  PDFs de certificado (privado)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('content', 'content', false, 52428800),
  ('branding', 'branding', true, 5242880),
  ('certificates', 'certificates', false, 5242880)
on conflict (id) do nothing;

create or replace function private.folder_company(object_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case when (storage.foldername(object_name))[1] ~ '^[0-9a-f-]{36}$'
              then ((storage.foldername(object_name))[1])::uuid end
$$;
grant execute on function private.folder_company(text) to authenticated;

create policy "content: lê da própria empresa e da biblioteca" on storage.objects for select to authenticated
  using (bucket_id = 'content' and (
    (storage.foldername(name))[1] = 'global'
    or private.folder_company(name) = (select private.my_company_id())
    or (select private.is_platform_admin())));
create policy "content: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'content' and (
    ((storage.foldername(name))[1] = 'global' and (select private.is_platform_admin()))
    or (select private.is_company_admin(private.folder_company(name)))));
create policy "content: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'content' and (
    ((storage.foldername(name))[1] = 'global' and (select private.is_platform_admin()))
    or (select private.is_company_admin(private.folder_company(name)))));
create policy "content: admin remove" on storage.objects for delete to authenticated
  using (bucket_id = 'content' and (
    ((storage.foldername(name))[1] = 'global' and (select private.is_platform_admin()))
    or (select private.is_company_admin(private.folder_company(name)))));

create policy "branding: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (select private.is_company_admin(private.folder_company(name))));
create policy "branding: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (select private.is_company_admin(private.folder_company(name))));
create policy "branding: admin remove" on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (select private.is_company_admin(private.folder_company(name))));

create policy "certificates: dono e admin leem" on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or (select private.is_company_admin(private.folder_company(name)))));
-- PDFs de certificado são gravados pela Edge Function com a service role.

-- ---------------------------------------------------------------------
-- Rotina diária: lembretes de prazo às 8h (horário de Brasília = 11h UTC)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule('lms-lembretes-de-prazo', '0 11 * * *', $$ select private.generate_due_reminders(); $$);
