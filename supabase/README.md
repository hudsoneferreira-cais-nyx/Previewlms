# Banco de dados do Previewlms (Supabase)

Projeto Supabase **LMS** · `https://igsxucbtbcnyqtdtdfwz.supabase.co` · região São Paulo · plano grátis.
Montado e testado em 19/10/2026. As migrações desta pasta já estão aplicadas no projeto.

## Como o modelo funciona

- **Consultoria → empresas-cliente.** Cada empresa (`companies`) é isolada: ninguém vê dados de outra.
  A empresa tem logo, cores, domínio, versão da política de privacidade e limite de usuários ativos.
- **Biblioteca da consultoria.** Conteúdos e trilhas com `company_id` nulo são da cais. Cada cliente só
  enxerga o que recebeu em `library_licenses`. O cliente também pode ter trilhas próprias.
- **Papéis:** `platform_admin` (consultor da cais), `company_admin` (RH do cliente), `manager` (gestor),
  `learner` (colaborador).
- **Entrada por convite.** O admin cria um registro em `invitations`; quando a pessoa se cadastra com o
  mesmo e-mail, o perfil nasce na empresa, com papel, departamento e gestor certos. Sem convite, a pessoa
  fica sem empresa e não vê nada.
- **Atribuição → inscrição automática.** Uma linha em `assignments` (pessoa, grupo, departamento ou empresa
  inteira) inscreve todo mundo do alvo e avisa por notificação. Quem entrar depois no grupo, departamento
  ou empresa também é inscrito. `mandatory = false` funciona como "recomendar".
- **Progresso.** O app grava `content_progress` (vídeo, PDF, SCORM). O banco recalcula sozinho a trilha,
  emite o certificado ao chegar em 100%, soma XP (+10 por conteúdo, +50 por trilha) e notifica.
- **Quiz corrigido no servidor.** O gabarito (`quiz_answer_keys`) é invisível para o aluno.
- **Trilha em qualquer ordem por padrão** (`tracks.sequential = false`).

## O que o app chama

| Uso | Como |
|---|---|
| Ao abrir o app (conta usuário ativo do mês) | `rpc('touch_activity')` |
| Aceite da política de privacidade no 1º acesso | `rpc('record_privacy_consent', { p_user_agent })` |
| Enviar quiz | `rpc('submit_quiz', { p_content_id, p_answers: { [questionId]: [optionId] } })` |
| Página pública de verificação de certificado | `rpc('verify_certificate', { p_code })` (sem login) |
| Relatório por pessoa / exportar CSV | view `report_learner_progress` |
| Conformidade (obrigatórios: concluído, atrasado, vence em breve) | view `report_compliance` |
| Painel da empresa | view `report_company_overview` |
| Usuários ativos por mês (cobrança) | view `report_monthly_active_users` |
| Desempenho por conteúdo | view `report_content_stats` |
| Ranking | view `report_leaderboard` |

As views respeitam as regras de acesso: o aluno vê só a si, o gestor vê a equipe direta, o admin vê a empresa.

**Arquivos (Storage):** `content/{company_id ou global}/...` (privado), `branding/{company_id}/...`
(público), `certificates/{company_id}/{user_id}/...` (privado).

**Rotina diária:** às 8h (Brasília) o banco gera lembretes de prazo (3 dias antes, no dia, no dia
seguinte e, para atrasados, toda segunda).

## Dados de demonstração (`seed.sql`)

- Empresas **cais** e **Empresa Demonstração** (slug `demo`).
- Trilhas da biblioteca licenciadas ao cliente: *Liderança na prática* (6 conteúdos + quiz) e
  *Formação de gestores 2026* (só gestores). Trilha própria do cliente: *Primeiros 30 dias*,
  atribuída à empresa toda com prazo de 30 dias.
- Convites para Marina (admin), Bruno (gestor), Carla, Diego e Elisa (colaboradores), com e-mails
  fictícios `@demo.example.com`.
- A conta `hudsonelias66@gmail.com` é `platform_admin`.

## Teste feito (27 verificações, em transação desfeita no fim)

Perfis criados pelo convite · inscrição automática · grupo gera inscrição · colaborador não vê a trilha
de gestores nem o gabarito · não consegue se promover · não cria inscrição obrigatória para si ·
trilha vai a 86% e depois 100% com o quiz · quiz em branco reprova e certo aprova · certificado emitido e
verificável sem login · XP 120 · aceite LGPD registrado · gestor vê a equipe e recomenda trilha, mas não
atribui à empresa toda · admin do cliente vê relatórios, mas não edita a biblioteca da cais · outra
empresa não vê nada · visitante sem login não vê nada.

## Pendências fora do banco

1. **Ligar o front-end** (`app/page.tsx`) ao Supabase: hoje as telas usam dados fixos no código.
2. **E-mail** das notificações: Edge Function que lê `notifications` com `emailed_at` nulo e envia.
3. **PDF do certificado**: Edge Function que gera o PDF e grava em `certificates/`.
4. **Player SCORM** (biblioteca `scorm-again`) gravando em `content_progress.scorm_data`.
5. **Proteção contra senha vazada** (Auth → Settings no painel do Supabase).
6. O rascunho de agosto ficou guardado no schema `legacy` (vazio, fora da API). Pode ser apagado pelo
   painel quando quiser; o bucket antigo `lms-content` também.
