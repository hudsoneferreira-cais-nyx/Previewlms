# Esquema antigo do projeto Supabase "LMS" (substituído em 19/10/2026)

Migração original: `20260827104950_lms_init_schema_and_rls`. Todas as tabelas estavam vazias (0 linhas), o bucket `lms-content` não tinha arquivos.
O usuário `hudsonelias66@gmail.com` (auth) foi mantido.

## Tabelas
- organizations: id, name, slug, logo_initials, accent (#6658d5), created_at
- profiles: id, organization_id, full_name, email, job_title, avatar_color, role (user_role, padrão employee), is_platform_admin, manager_id, created_at
- tracks: id, organization_id, title, description, audience, status, tone, created_by, created_at, updated_at
- modules: id, track_id, title, description, order_index, created_at
- contents: id, organization_id, module_id, title, description, type, body_text, storage_path, external_url, cover_color, tag, duration_seconds, order_index, status, created_by, created_at, updated_at
- user_progress: id, user_id, content_id, status, progress_percent, last_position_seconds, completed_at, updated_at
- favorites: user_id, content_id, created_at
- certificates: id, user_id, track_id, issued_at

## Tipos
user_role, publish_status, audience, content_type, progress_status

## Funções
- auth_org_id(), auth_role(), auth_is_platform_admin(), can_see_org(org), can_manage_org(org)
- handle_new_user(): criava o perfil lendo `organization_id` e `role` do metadata do cadastro.
  Problema: qualquer pessoa podia se cadastrar escolhendo empresa e papel. O esquema novo usa convites.

## Motivo da troca
O esquema novo cobre as 26 funções do MVP: multiempresa com licença da biblioteca da consultoria,
departamentos, grupos, convites, atribuições com prazo, quiz corrigido no servidor, SCORM, certificados
automáticos, LGPD, notificações, relatórios e usuários ativos por mês.
