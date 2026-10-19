-- =====================================================================
-- 00 · Rascunho de agosto (tabelas vazias) movido para o schema "legacy",
--      sem apagar nada. Definição documentada em supabase/backup/.
-- O gatilho on_auth_user_created continua em auth.users (o Supabase não deixa
-- removê-lo daqui); a função que ele chama, public.handle_new_user, é
-- substituída na migração 03.
-- =====================================================================
create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;

alter table public.favorites set schema legacy;
alter table public.certificates set schema legacy;
alter table public.user_progress set schema legacy;
alter table public.contents set schema legacy;
alter table public.modules set schema legacy;
alter table public.tracks set schema legacy;
alter table public.profiles set schema legacy;
alter table public.organizations set schema legacy;

alter function public.can_manage_org(uuid) set schema legacy;
alter function public.can_see_org(uuid) set schema legacy;
alter function public.auth_is_platform_admin() set schema legacy;
alter function public.auth_role() set schema legacy;
alter function public.auth_org_id() set schema legacy;

alter type public.user_role set schema legacy;
alter type public.publish_status set schema legacy;
alter type public.audience set schema legacy;
alter type public.content_type set schema legacy;
alter type public.progress_status set schema legacy;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$ begin return new; end $$;
