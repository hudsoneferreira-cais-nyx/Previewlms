-- =====================================================================
-- Dados de demonstração (os mesmos nomes e conteúdos do protótipo)
--   · empresa "cais" (a consultoria) e "Empresa Demonstração" (cliente)
--   · biblioteca da consultoria com 2 trilhas licenciadas para o cliente
--   · trilha própria do cliente ("Primeiros 30 dias") atribuída à empresa toda
--   · convites para as 5 pessoas do protótipo (viram usuários ao se cadastrar)
-- Hudson (conta já existente) vira administrador da plataforma.
-- =====================================================================
do $$
declare
  cais uuid; demo uuid;
  hudson uuid := (select id from auth.users where lower(email) = 'hudsonelias66@gmail.com');
  d_dir uuid; d_com uuid; d_ops uuid; d_rh uuid;
  g_lid uuid; g_new uuid;
  cat_lid uuid; cat_com uuid; cat_cul uuid; cat_onb uuid;
  t_lid uuid; t_ges uuid; t_onb uuid;
  m uuid; c uuid; q uuid; o uuid;
  r record;
begin
  insert into public.companies (name, slug, primary_color, secondary_color)
  values ('cais', 'cais', '#111827', '#6D28D9') returning id into cais;
  insert into public.companies (name, slug, primary_color, secondary_color, active_user_limit)
  values ('Empresa Demonstração', 'demo', '#6D28D9', '#111827', 300) returning id into demo;

  if hudson is not null then
    insert into public.profiles (id, email, full_name, company_id, role, status, job_title)
    values (hudson, 'hudsonelias66@gmail.com', 'Hudson Ferreira', cais, 'platform_admin', 'active', 'Diretor criativo')
    on conflict (id) do update set company_id = excluded.company_id, role = excluded.role;
  end if;

  insert into public.departments (company_id, name) values (demo, 'Diretoria') returning id into d_dir;
  insert into public.departments (company_id, name) values (demo, 'Comercial') returning id into d_com;
  insert into public.departments (company_id, name) values (demo, 'Operações') returning id into d_ops;
  insert into public.departments (company_id, name) values (demo, 'Pessoas e Cultura') returning id into d_rh;

  insert into public.groups (company_id, name, description) values (demo, 'Líderes', 'Gestores com equipe direta') returning id into g_lid;
  insert into public.groups (company_id, name, description) values (demo, 'Novos colaboradores', 'Primeiros 90 dias na empresa') returning id into g_new;

  insert into public.categories (name) values ('Liderança') returning id into cat_lid;
  insert into public.categories (name) values ('Comunicação') returning id into cat_com;
  insert into public.categories (name) values ('Cultura') returning id into cat_cul;
  insert into public.categories (company_id, name) values (demo, 'Integração') returning id into cat_onb;

  -- ---------------- Biblioteca da consultoria: Liderança na prática ----------------
  insert into public.tracks (title, description, category_id, status, audience, created_by)
  values ('Liderança na prática', 'Fundamentos para liderar conversas, confiança e decisões no dia a dia.',
          cat_lid, 'published', 'all', hudson) returning id into t_lid;

  insert into public.track_modules (track_id, position, title) values (t_lid, 1, 'Confiança e segurança') returning id into m;
  for r in select * from (values
      (1, 'Como construir confiança', 'video', 12, cat_lid),
      (2, 'A segurança para discordar', 'text', 8, cat_com),
      (3, 'Feedback sem ruído', 'video', 15, cat_com)) v(pos, title, typ, dur, cat) loop
    insert into public.contents (title, type, duration_minutes, category_id, status, created_by,
                                 body, description)
    values (r.title, r.typ::public.content_type, r.dur, r.cat, 'published', hudson,
            case when r.typ = 'text' then 'Texto de demonstração.' end, 'Conteúdo da biblioteca da consultoria.')
    returning id into c;
    insert into public.track_items (module_id, content_id, position) values (m, c, r.pos);
  end loop;

  insert into public.track_modules (track_id, position, title) values (t_lid, 2, 'Rotina do líder') returning id into m;
  for r in select * from (values
      (1, 'Conversas que desenvolvem', 'video', 14, cat_lid),
      (2, 'Rituais de alinhamento', 'pdf', 10, cat_cul),
      (3, 'Decisões em cenários incertos', 'video', 11, cat_lid)) v(pos, title, typ, dur, cat) loop
    insert into public.contents (title, type, duration_minutes, category_id, status, created_by, description)
    values (r.title, r.typ::public.content_type, r.dur, r.cat, 'published', hudson, 'Conteúdo da biblioteca da consultoria.')
    returning id into c;
    insert into public.track_items (module_id, content_id, position) values (m, c, r.pos);
  end loop;

  -- Quiz final, corrigido no servidor
  insert into public.track_modules (track_id, position, title) values (t_lid, 3, 'Avaliação e próximos passos') returning id into m;
  insert into public.contents (title, type, duration_minutes, category_id, status, pass_score, created_by, description)
  values ('Avaliação: Liderança na prática', 'quiz', 10, cat_lid, 'published', 70, hudson, 'Três perguntas para fechar a trilha.')
  returning id into c;
  insert into public.track_items (module_id, content_id, position) values (m, c, 1);

  insert into public.quiz_questions (content_id, position, prompt) values (c, 1, 'O que mais sustenta a confiança de uma equipe?') returning id into q;
  insert into public.quiz_options (question_id, position, label) values (q, 1, 'Coerência entre o que o líder diz e faz') returning id into o;
  insert into public.quiz_answer_keys values (o, true);
  insert into public.quiz_options (question_id, position, label) values (q, 2, 'Metas mais altas a cada mês') returning id into o;
  insert into public.quiz_answer_keys values (o, false);
  insert into public.quiz_options (question_id, position, label) values (q, 3, 'Evitar conversas difíceis') returning id into o;
  insert into public.quiz_answer_keys values (o, false);

  insert into public.quiz_questions (content_id, position, prompt) values (c, 2, 'Um bom feedback deve ser…') returning id into q;
  insert into public.quiz_options (question_id, position, label) values (q, 1, 'Específico e ligado a um comportamento observado') returning id into o;
  insert into public.quiz_answer_keys values (o, true);
  insert into public.quiz_options (question_id, position, label) values (q, 2, 'Dado só na avaliação anual') returning id into o;
  insert into public.quiz_answer_keys values (o, false);

  insert into public.quiz_questions (content_id, position, prompt, allow_multiple) values (c, 3, 'Quais práticas ajudam o alinhamento do time? (marque todas)', true) returning id into q;
  insert into public.quiz_options (question_id, position, label) values (q, 1, 'Reunião 1:1 com pauta') returning id into o;
  insert into public.quiz_answer_keys values (o, true);
  insert into public.quiz_options (question_id, position, label) values (q, 2, 'Combinados registrados') returning id into o;
  insert into public.quiz_answer_keys values (o, true);
  insert into public.quiz_options (question_id, position, label) values (q, 3, 'Decidir tudo sozinho') returning id into o;
  insert into public.quiz_answer_keys values (o, false);

  -- ---------------- Biblioteca da consultoria: Formação de gestores 2026 (só gestores) ----------------
  insert into public.tracks (title, description, category_id, status, audience, created_by)
  values ('Formação de gestores 2026', 'Trilha de liderança para quem tem equipe.', cat_lid, 'published', 'manager', hudson)
  returning id into t_ges;
  insert into public.track_modules (track_id, position, title) values (t_ges, 1, 'Papel e rotina do gestor') returning id into m;
  for r in select * from (values
      (1, 'O papel da liderança hoje', 'video', 12),
      (2, 'Delegação com clareza', 'video', 10),
      (3, 'Conduzindo reuniões 1:1', 'text', 9)) v(pos, title, typ, dur) loop
    insert into public.contents (title, type, duration_minutes, category_id, status, audience, created_by, description, body)
    values (r.title, r.typ::public.content_type, r.dur, cat_lid, 'published', 'manager', hudson, 'Conteúdo para gestores.',
            case when r.typ = 'text' then 'Texto de demonstração.' end)
    returning id into c;
    insert into public.track_items (module_id, content_id, position) values (m, c, r.pos);
  end loop;
  insert into public.track_modules (track_id, position, title) values (t_ges, 2, 'Situações difíceis') returning id into m;
  for r in select * from (values
      (1, 'Gestão de conflitos', 'video', 13),
      (2, 'Decisões difíceis na liderança', 'video', 11),
      (3, 'Indicadores para desenvolver o time', 'pdf', 8)) v(pos, title, typ, dur) loop
    insert into public.contents (title, type, duration_minutes, category_id, status, audience, created_by, description)
    values (r.title, r.typ::public.content_type, r.dur, cat_lid, 'published', 'manager', hudson, 'Conteúdo para gestores.')
    returning id into c;
    insert into public.track_items (module_id, content_id, position) values (m, c, r.pos);
  end loop;

  insert into public.library_licenses (company_id, track_id) values (demo, t_lid), (demo, t_ges);

  -- ---------------- Trilha própria do cliente ----------------
  insert into public.tracks (company_id, title, description, category_id, status, sequential)
  values (demo, 'Primeiros 30 dias', 'Integração de novos colaboradores.', cat_onb, 'published', true) returning id into t_onb;
  insert into public.track_modules (track_id, position, title) values (t_onb, 1, 'Boas-vindas') returning id into m;
  insert into public.contents (company_id, title, type, duration_minutes, category_id, status, description, body)
  values (demo, 'Cultura de atendimento', 'text', 8, cat_onb, 'published', 'Como atendemos nossos clientes.', 'Texto de demonstração.')
  returning id into c;
  insert into public.track_items (module_id, content_id, position) values (m, c, 1);
  insert into public.contents (company_id, title, type, duration_minutes, category_id, status, description)
  values (demo, 'Plano de ação pessoal', 'assignment', 20, cat_onb, 'published', 'Defina três metas para seus primeiros 30 dias.')
  returning id into c;
  insert into public.track_items (module_id, content_id, position) values (m, c, 2);

  -- Atribuições: integração para todos (prazo 30 dias); formação para o grupo Líderes (recomendação)
  insert into public.assignments (company_id, target_type, track_id, mandatory, due_date, assigned_by)
  values (demo, 'company', t_onb, true, current_date + 30, hudson);
  insert into public.assignments (company_id, target_type, target_id, track_id, mandatory, due_date, assigned_by)
  values (demo, 'group', g_lid, t_ges, true, current_date + 60, hudson);

  -- Convites das pessoas do protótipo (e-mails fictícios de demonstração)
  insert into public.invitations (company_id, email, full_name, role, department_id, job_title, invited_by) values
    (demo, 'marina.souza@demo.example.com', 'Marina Souza', 'company_admin', d_rh, 'Analista de Pessoas', hudson),
    (demo, 'bruno.lima@demo.example.com', 'Bruno Lima', 'manager', d_com, 'Gerente comercial', hudson),
    (demo, 'carla.nunes@demo.example.com', 'Carla Nunes', 'learner', d_com, 'Executiva de contas', hudson),
    (demo, 'diego.alves@demo.example.com', 'Diego Alves', 'learner', d_ops, 'Coordenador de operações', hudson),
    (demo, 'elisa.monteiro@demo.example.com', 'Elisa Monteiro', 'learner', d_dir, 'Assistente de diretoria', hudson);
end $$;
