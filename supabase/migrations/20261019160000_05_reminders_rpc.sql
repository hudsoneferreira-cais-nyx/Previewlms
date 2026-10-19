-- =====================================================================
-- 05 · Lembrete manual (botão "Enviar lembrete" do gestor e do admin)
-- O gestor só alcança a própria equipe; o admin, a empresa inteira.
-- =====================================================================
create or replace function public.send_reminder(p_user_ids uuid[], p_message text default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  me_name text;
  n integer := 0;
  u uuid;
begin
  if me is null then raise exception 'É preciso estar logado.'; end if;
  select full_name into me_name from public.profiles where id = me;

  foreach u in array coalesce(p_user_ids, '{}') loop
    if private.manages(u)
       or private.is_company_admin((select company_id from public.profiles where id = u)) then
      perform private.notify(u, 'reminder', 'Lembrete de ' || coalesce(me_name, 'seu gestor'),
                             coalesce(nullif(trim(p_message), ''), 'Você tem treinamentos pendentes. Que tal continuar hoje?'),
                             '/minha-jornada');
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

revoke execute on function public.send_reminder(uuid[], text) from public, anon;
grant execute on function public.send_reminder(uuid[], text) to authenticated;
