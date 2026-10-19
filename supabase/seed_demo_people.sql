-- =====================================================================
-- Pessoas de demonstração com progresso (para os painéis terem vida)
--   · Marina, Bruno, Carla, Diego e Elisa entram como registros de
--     autenticação SEM senha: existem só como dados, ninguém faz login com eles.
--   · Hudson passa a morar na Empresa Demonstração (continua consultor da
--     plataforma) e é o gestor da equipe, para ver as três áreas com dados reais.
-- Rodar uma única vez, depois de seed.sql.
-- =====================================================================
do $$
declare
  demo uuid := (select id from public.companies where slug = 'demo');
  hudson uuid := (select id from auth.users where lower(email) = 'hudsonelias66@gmail.com');
  g_lid uuid := (select id from public.groups where company_id = demo and name = 'Líderes');
  t_lid uuid := (select id from public.tracks where title = 'Liderança na prática');
  t_ges uuid := (select id from public.tracks where title = 'Formação de gestores 2026');
  t_onb uuid := (select id from public.tracks where title = 'Primeiros 30 dias');
  marina uuid := gen_random_uuid(); bruno uuid := gen_random_uuid(); carla uuid := gen_random_uuid();
  diego uuid := gen_random_uuid(); elisa uuid := gen_random_uuid();
  r record;
begin
  update public.companies set primary_color = '#6658D5', secondary_color = '#20272A' where id = demo;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
    (marina, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marina.souza@demo.example.com', '{"demo":true}', now(), now()),
    (bruno,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bruno.lima@demo.example.com',  '{"demo":true}', now(), now()),
    (carla,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla.nunes@demo.example.com', '{"demo":true}', now(), now()),
    (diego,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diego.alves@demo.example.com', '{"demo":true}', now(), now()),
    (elisa,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'elisa.monteiro@demo.example.com', '{"demo":true}', now(), now());

  -- Hudson: empresa demo, gestor da equipe, no grupo de líderes
  update public.profiles set company_id = demo, job_title = 'Diretor de desenvolvimento' where id = hudson;
  update public.profiles set manager_id = hudson where id in (marina, bruno, carla, diego, elisa);
  insert into public.group_members (group_id, user_id) values (g_lid, hudson), (g_lid, bruno) on conflict do nothing;

  -- Inscrições na trilha da biblioteca (autoinscrição)
  insert into public.enrollments (company_id, user_id, track_id)
  select demo, u, t_lid from unnest(array[hudson, marina, carla, elisa]) u
  on conflict do nothing;

  -- Progresso: (pessoa, trilha, quantos itens concluídos, dias atrás do 1º)
  for r in select * from (values
      (marina, t_onb, 2, 40), (marina, t_lid, 7, 30),
      (bruno,  t_onb, 2, 35), (bruno,  t_ges, 2, 12),
      (carla,  t_onb, 1, 9),  (carla,  t_lid, 3, 6),
      (elisa,  t_onb, 2, 20), (elisa,  t_lid, 6, 14),
      (hudson, t_onb, 1, 4),  (hudson, t_ges, 1, 3), (hudson, t_lid, 2, 2)
    ) v(person, track, done, ago) loop
    insert into public.content_progress (user_id, content_id, status, progress_pct, time_spent_seconds, started_at, completed_at)
    select r.person, x.content_id, 'completed', 100, (x.dur * 60)::int,
           now() - make_interval(days => r.ago - x.n), now() - make_interval(days => r.ago - x.n)
    from (select ti.content_id, coalesce(c.duration_minutes, 10) dur,
                 row_number() over (order by tm.position, ti.position) - 1 as n
          from public.track_items ti join public.track_modules tm on tm.id = ti.module_id
          join public.contents c on c.id = ti.content_id
          where tm.track_id = r.track) x
    where x.n < r.done
    on conflict do nothing;
  end loop;

  -- Conteúdos começados e não terminados
  insert into public.content_progress (user_id, content_id, status, progress_pct, time_spent_seconds, started_at)
  select hudson, c.id, 'in_progress', 40, 300, now() - interval '1 day' from public.contents c where c.title = 'Delegação com clareza'
  on conflict do nothing;
  insert into public.content_progress (user_id, content_id, status, progress_pct, time_spent_seconds, started_at)
  select hudson, c.id, 'in_progress', 72, 520, now() - interval '3 hours' from public.contents c where c.title = 'Feedback sem ruído'
  on conflict do nothing;
  insert into public.content_progress (user_id, content_id, status, progress_pct, time_spent_seconds, started_at)
  select carla, c.id, 'in_progress', 35, 200, now() - interval '2 days' from public.contents c where c.title = 'Conversas que desenvolvem'
  on conflict do nothing;

  -- Diego está atrasado na integração
  update public.enrollments set due_date = current_date - 5 where user_id = diego and track_id = t_onb;
  update public.enrollments set due_date = current_date + 2 where user_id = carla and track_id = t_onb;

  -- Favoritos e dias de acesso do Hudson (sequência de 5 dias)
  insert into public.favorites (user_id, content_id)
  select hudson, id from public.contents where title in ('Feedback sem ruído', 'Rituais de alinhamento')
  on conflict do nothing;
  insert into public.user_activity_days (user_id, company_id, day)
  select hudson, demo, current_date - g from generate_series(0, 4) g on conflict do nothing;
  insert into public.user_activity_days (user_id, company_id, day)
  select u, demo, current_date - g from unnest(array[marina, bruno, carla, elisa]) u, generate_series(0, 10, 3) g
  on conflict do nothing;
end $$;
