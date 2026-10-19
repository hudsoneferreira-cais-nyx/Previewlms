# Plataforma LMS de Desenvolvimento (desenvolve.)

Plataforma de trilhas de desenvolvimento para clientes de consultoria. O visual é o do protótipo aprovado; desde 19/10/2026 todas as telas leem e gravam no banco Supabase do projeto **LMS**.

## Rodar

```bash
cp .env.example .env.local   # chaves públicas do Supabase (já preenchidas)
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # versão de produção
```

Para publicar na Vercel: importe o repositório, branch `lms-desenvolvimento`, e cadastre as duas variáveis do `.env.example`.

**Depois de publicar**, no painel do Supabase › Authentication › URL Configuration, coloque o endereço do site em *Site URL* e em *Redirect URLs*. Sem isso, os e-mails de "entrar sem senha" e "esqueci a senha" apontam para localhost.

## Como está organizado

| Pasta | O que tem |
|---|---|
| `app/` | página única e estilos (`globals.css` do protótipo + adições no fim) |
| `components/platform.tsx` | casca: menu, busca, troca de perfil, roteamento das telas |
| `components/learner.tsx` | área do colaborador |
| `components/manager.tsx` | área do gestor |
| `components/admin.tsx` | área administrativa e relatórios |
| `components/drawers.tsx` | gavetas: player de conteúdo, quiz, trilha, pessoa, criação, convites, recomendação |
| `components/auth.tsx` | login, cadastro por convite, aceite LGPD, verificação pública de certificado |
| `lib/data.tsx` | carrega os dados permitidos ao usuário e expõe as ações |
| `supabase/` | migrações, dados de demonstração e tipos (ver `supabase/README.md`) |

As consultas são tipadas a partir do banco (`supabase/database.types.ts`): um nome de coluna errado não compila.

## Acesso

- **Entrada por convite.** O admin convida pelo e-mail (ou importa um CSV); a pessoa clica em "Recebi um convite", cria a senha e já cai na empresa, equipe e perfil certos.
- **Primeiro acesso** pede o aceite da política de privacidade (LGPD). Se o admin mudar a versão da política em Configurações, todos aceitam de novo.
- **"Visualizar como"** só mostra os perfis que a pessoa tem: admin vê as três áreas, gestor vê gestor e colaborador, colaborador vê só a própria.
- **Certificados** saem sozinhos ao concluir a trilha e podem ser conferidos sem login em `/?verificar=CÓDIGO`.

## Demonstração

A conta `hudsonelias66@gmail.com` é consultor da plataforma, mora na *Empresa Demonstração* e é gestor de Marina, Bruno, Carla, Diego e Elisa (pessoas de demonstração **sem senha**, existem só como dados). Assim, um único login mostra as três áreas com números reais.

## Ainda não feito

- Player SCORM (o pacote já pode ser enviado e fica guardado).
- Envio das notificações por e-mail e PDF do certificado gerado no servidor (hoje o certificado abre pronto para "Salvar em PDF" no navegador).
- Editor de trilha existente (hoje: criar, publicar/despublicar, arquivar, excluir e atribuir).

`index.html`, `lms-projeto-export.zip` e `README-LMS-CONTINUIDADE.md` são o retrato do protótipo antigo, mantidos como referência.
