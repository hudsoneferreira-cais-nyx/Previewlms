-- =====================================================================
-- Plataforma LMS de Desenvolvimento (Previewlms) — MVP
-- 01 · Estrutura principal
-- Modelo: uma consultoria (a cais) atende várias empresas-cliente.
-- Cada empresa fica isolada; a biblioteca da consultoria (company_id nulo)
-- é liberada para cada empresa por licença.
-- =====================================================================

create type public.app_role as enum ('platform_admin', 'company_admin', 'manager', 'learner');
create type public.user_status as enum ('invited', 'active', 'inactive');
create type public.content_type as enum ('video', 'pdf', 'text', 'scorm', 'quiz', 'link', 'assignment');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.audience as enum ('all', 'learner', 'manager');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.assignment_target as enum ('user', 'group', 'department', 'company');
create type public.support_status as enum ('open', 'answered', 'closed');

-- ---------------------------------------------------------------------
-- Empresas-cliente (com a marca de cada uma)
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  logo_url text,
  favicon_url text,
  primary_color text default '#6D28D9' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text default '#111827' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  custom_domain text unique,
  privacy_policy_url text,
  privacy_policy_version text not null default '1.0',
  active_user_limit integer check (active_user_limit is null or active_user_limit > 0),
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.companies is 'Empresas-cliente da consultoria. Cada uma vê só os próprios dados, com logo e cores próprios.';
comment on column public.companies.settings is 'Preferências da empresa: notificações, certificado, módulos ligados etc.';

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.departments(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

-- ---------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  role public.app_role not null default 'learner',
  status public.user_status not null default 'active',
  full_name text not null default '',
  email text not null,
  job_title text,
  unit text,
  avatar_url text,
  xp integer not null default 0,
  privacy_consented_at timestamptz,
  privacy_policy_version text,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.manager_id is 'Gestor direto. Define a área "Minha equipe".';

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Convites: o cadastro só entra numa empresa se houver convite para o e-mail.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'learner' check (role <> 'platform_admin'),
  department_id uuid references public.departments(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  job_title text,
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_pending_email_uq on public.invitations (lower(email)) where accepted_at is null;

-- ---------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
comment on column public.categories.company_id is 'Nulo = categoria da biblioteca da consultoria.';

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type public.content_type not null,
  title text not null,
  description text,
  body text,
  file_path text,
  external_url text,
  scorm_entry_path text,
  thumbnail_url text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  audience public.audience not null default 'all',
  status public.publish_status not null default 'draft',
  tags text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.contents.company_id is 'Nulo = conteúdo da biblioteca da consultoria, liberado por licença.';
comment on column public.contents.file_path is 'Caminho no Storage (bucket content): {company_id|global}/...';
comment on column public.contents.scorm_entry_path is 'Arquivo de entrada do pacote SCORM descompactado (ex.: index_lms.html).';

-- Questões de quiz. O gabarito fica numa tabela separada, que o aluno não lê.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  allow_multiple boolean not null default false,
  points integer not null default 1 check (points > 0)
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  position integer not null default 0,
  label text not null
);

create table public.quiz_answer_keys (
  option_id uuid primary key references public.quiz_options(id) on delete cascade,
  is_correct boolean not null default false
);

-- ---------------------------------------------------------------------
-- Trilhas
-- ---------------------------------------------------------------------
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  cover_url text,
  sequential boolean not null default false,
  certificate_enabled boolean not null default true,
  audience public.audience not null default 'all',
  status public.publish_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.tracks.sequential is 'Falso = conteúdos em qualquer ordem (padrão, como pede a Liderança A.T.I.V.A.).';

create table public.track_modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text
);

create table public.track_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.track_modules(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete restrict,
  position integer not null default 0,
  required boolean not null default true,
  unique (module_id, content_id)
);

-- Licença: libera um conteúdo ou trilha da biblioteca da consultoria para uma empresa.
create table public.library_licenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content_id uuid references public.contents(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(content_id, track_id) = 1)
);
create unique index library_licenses_content_uq on public.library_licenses (company_id, content_id) where content_id is not null;
create unique index library_licenses_track_uq on public.library_licenses (company_id, track_id) where track_id is not null;

-- ---------------------------------------------------------------------
-- Atribuição, inscrição e progresso
-- ---------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  target_type public.assignment_target not null,
  target_id uuid,
  content_id uuid references public.contents(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  mandatory boolean not null default true,
  due_date date,
  message text,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(content_id, track_id) = 1),
  check ((target_type = 'company') = (target_id is null))
);
comment on table public.assignments is 'Atribuição a pessoa, grupo, departamento ou empresa inteira. Gera inscrições automaticamente. mandatory = falso equivale a "recomendar".';

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid references public.contents(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  mandatory boolean not null default false,
  due_date date,
  status public.progress_status not null default 'not_started',
  progress_pct numeric(5,2) not null default 0 check (progress_pct between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(content_id, track_id) = 1)
);
create unique index enrollments_user_content_uq on public.enrollments (user_id, content_id) where content_id is not null;
create unique index enrollments_user_track_uq on public.enrollments (user_id, track_id) where track_id is not null;

create table public.content_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  progress_pct numeric(5,2) not null default 0 check (progress_pct between 0 and 100),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  last_position text,
  scorm_data jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
comment on column public.content_progress.scorm_data is 'Dados SCORM: suspend_data, lesson_location, lesson_status, score.raw.';

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  answers jsonb not null,
  score numeric(5,2) not null,
  points integer not null,
  max_points integer not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Certificados, favoritos, notificações, LGPD, suporte, uso
-- ---------------------------------------------------------------------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  content_id uuid references public.contents(id) on delete set null,
  title text not null,
  recipient_name text not null,
  workload_minutes integer,
  pdf_path text,
  issued_at timestamptz not null default now()
);
create unique index certificates_user_track_uq on public.certificates (user_id, track_id) where track_id is not null;

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid references public.contents(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(content_id, track_id) = 1)
);
create unique index favorites_content_uq on public.favorites (user_id, content_id) where content_id is not null;
create unique index favorites_track_uq on public.favorites (user_id, track_id) where track_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
comment on column public.notifications.emailed_at is 'Preenchido pela Edge Function que envia e-mail (fase seguinte).';

create table public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  policy_version text not null,
  user_agent text,
  consented_at timestamptz not null default now()
);
comment on table public.privacy_consents is 'Registro de aceite da política de privacidade (LGPD): quem, qual versão e quando.';

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status public.support_status not null default 'open',
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);
comment on table public.user_activity_days is 'Um registro por pessoa por dia de acesso. Base da cobrança por usuário ativo no mês.';

-- ---------------------------------------------------------------------
-- Índices de chaves estrangeiras e filtros frequentes
-- ---------------------------------------------------------------------
create index on public.departments (company_id);
create index on public.departments (parent_id);
create index on public.profiles (company_id);
create index on public.profiles (department_id);
create index on public.profiles (manager_id);
create index on public.groups (company_id);
create index on public.group_members (user_id);
create index on public.invitations (company_id);
create index on public.invitations (department_id);
create index on public.invitations (manager_id);
create index on public.invitations (invited_by);
create index on public.categories (company_id);
create index on public.contents (company_id, status);
create index on public.contents (category_id);
create index on public.contents (created_by);
create index on public.quiz_questions (content_id);
create index on public.quiz_options (question_id);
create index on public.tracks (company_id, status);
create index on public.tracks (category_id);
create index on public.tracks (created_by);
create index on public.track_modules (track_id);
create index on public.track_items (content_id);
create index on public.library_licenses (content_id);
create index on public.library_licenses (track_id);
create index on public.assignments (company_id);
create index on public.assignments (content_id);
create index on public.assignments (track_id);
create index on public.assignments (assigned_by);
create index on public.enrollments (company_id, status);
create index on public.enrollments (content_id);
create index on public.enrollments (track_id);
create index on public.enrollments (assignment_id);
create index on public.enrollments (due_date) where status <> 'completed';
create index on public.content_progress (content_id);
create index on public.content_progress (company_id);
create index on public.quiz_attempts (user_id, content_id);
create index on public.quiz_attempts (content_id);
create index on public.quiz_attempts (company_id);
create index on public.certificates (company_id);
create index on public.certificates (track_id);
create index on public.certificates (content_id);
create index on public.favorites (content_id);
create index on public.favorites (track_id);
create index on public.notifications (user_id, read_at);
create index on public.notifications (company_id);
create index on public.privacy_consents (user_id);
create index on public.privacy_consents (company_id);
create index on public.support_requests (company_id, status);
create index on public.support_requests (user_id);
create index on public.support_requests (answered_by);
create index on public.user_activity_days (company_id, day);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger contents_updated_at before update on public.contents for each row execute function public.set_updated_at();
create trigger tracks_updated_at before update on public.tracks for each row execute function public.set_updated_at();
create trigger content_progress_updated_at before update on public.content_progress for each row execute function public.set_updated_at();
create trigger support_requests_updated_at before update on public.support_requests for each row execute function public.set_updated_at();
