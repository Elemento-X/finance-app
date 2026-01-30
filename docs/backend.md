# Backend (stack serverless) - ControleC

Este documento explica, de forma direta e "mastigada", como o backend do ControleC funciona hoje. Nao temos um servidor tradicional: usamos Next.js (API Routes) + Supabase + serviços externos (Telegram, Groq, Resend SMTP).

## 1) Visao geral (quem faz o que)

- Next.js (Vercel): hospeda o frontend e expõe rotas serverless para webhook e cron.
- Supabase: banco, auth (Magic Link), RLS e dados como source of truth.
- localStorage: cache offline no browser, sincronizado com o Supabase.
- Telegram Bot API: entrada de transacoes/consultas por chat.
- Groq: IA para parsing das mensagens do Telegram.
- Resend SMTP: entrega de email do Magic Link (configurado no Supabase Auth).

### 1.1 Diagrama visual (fluxo de dados)

```mermaid
flowchart LR
  A[Browser / App
(Next.js UI)] -->|Auth + CRUD (RLS)| B[Supabase
DB + Auth + RLS]
  A -->|offline cache| C[localStorage]
  D[Telegram User
(chat)] --> E[/api/telegram
Webhook]
  E -->|Groq parse| F[Groq API
(Llama 3.3-70b)]
  E --> B
  G[/api/cron/*
(Next.js)] --> B
  G --> H[Telegram Bot API]
  H --> D
  C -->|sync| B
```

+---------------------+        +-----------------------+
|  Browser / App      |        |  Telegram User        |
|  (Next.js UI)       |        |  (chat no Telegram)   |
+----------+----------+        +-----------+-----------+
           |                               |
           | Auth + CRUD (RLS)             | mensagem
           v                               v
+---------------------+        +-----------------------+
|     Supabase        |<-------|  /api/telegram        |
|  DB + Auth + RLS    |        |  (Webhook)            |
+----------+----------+        +-----------+-----------+
           ^                               |
           | sync                          | Groq parse
           |                               v
+----------+----------+        +-----------------------+
|  localStorage       |        |  Groq API             |
|  (offline cache)    |        |  (Llama 3.3-70b)       |
+----------+----------+        +-----------------------+
           ^
           | cron (Vercel)
           v
+---------------------+
|  /api/cron/*         |
|  (Next.js)           |
+----------+----------+
           |
           v
+---------------------+
|  Telegram Bot API    |
+---------------------+

Arquivos-chave:
- app/api/telegram/route.ts
- app/api/cron/generate-recurring/route.ts
- app/api/cron/telegram-summary/route.ts
- services/supabase.ts
- services/sync.ts
- services/groq.ts
- lib/supabase.ts
- lib/supabase-admin.ts
- docs/supabase-schema-rls.sql
- vercel.json
- .env.example

## 2) API serverless (Next.js)

### 2.1 Webhook Telegram
Arquivo: app/api/telegram/route.ts

Fluxo simplificado:
1) Telegram envia webhook para /api/telegram.
2) Valida cabecalho x-telegram-bot-api-secret-token (TELEGRAM_WEBHOOK_SECRET).
3) Se mensagem for /start <codigo>, vincula o chat ao usuario via tabela telegram_link_tokens e profiles.
4) Para mensagens normais:
   - identifica usuario pelo telegram_chat_id no profiles
   - carrega categorias para ajudar o parser
   - chama Groq (parseMessage)
   - se transacao: salva em transactions
   - se query: calcula resumo do mes e responde
   - se conversa: responde texto
   - se despesa: checa budget_alerts e envia alerta se estourou

Observacoes importantes:
- Sempre responde 200 para o Telegram nao reenviar a mesma mensagem.
- Os inserts feitos aqui usam service role (getSupabaseAdmin), entao bypassam RLS.

### 2.2 Cron: transacoes recorrentes
Arquivo: app/api/cron/generate-recurring/route.ts

Fluxo:
1) Vercel chama /api/cron/generate-recurring todo dia (03:05 UTC).
2) Valida Authorization: Bearer <CRON_SECRET>.
3) Busca recurring_transactions ativas.
4) Se deve gerar hoje, cria transacao em transactions e atualiza last_generated_date.

### 2.3 Cron: resumos Telegram (semanal/mensal)
Arquivo: app/api/cron/telegram-summary/route.ts

Fluxo:
1) Vercel chama /api/cron/telegram-summary?type=weekly (segunda 12:00 UTC)
   e /api/cron/telegram-summary?type=monthly (dia 1, 12:00 UTC).
2) Valida Authorization: Bearer <CRON_SECRET>.
3) Busca usuarios com telegram_chat_id e telegram_summary_enabled = true.
4) Calcula resumo (semana anterior ou mes anterior) e envia via Telegram.

## 3) Supabase (dados e auth)

### 3.1 Cliente publico (frontend)
Arquivo: lib/supabase.ts
- Usa NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
- RLS garante que cada usuario so acessa seus dados.

### 3.2 Cliente admin (serverless)
Arquivo: lib/supabase-admin.ts
- Usa SUPABASE_SERVICE_ROLE_KEY.
- Usado apenas em API Routes (Telegram + crons).
- Nao persiste sessao e nao usa refresh token.

### 3.3 Tabelas principais
Arquivo: docs/supabase-schema-rls.sql

Tabelas:
- profiles
- telegram_link_tokens
- categories
- transactions
- goals
- assets
- recurring_transactions
- budget_alerts

RLS:
- Todas as tabelas tem policy auth.uid() = user_id/id.
- API Routes com service role ignoram RLS (server-only).

## 4) Sincronizacao offline-first
Arquivo: services/sync.ts

Ideia:
- Supabase = source of truth.
- localStorage = cache offline.
- Uma fila (supabase_sync_queue) guarda operacoes offline.

Como funciona:
1) A cada mudanca no app, a store salva no localStorage e enfileira operacao.
2) Se online, tenta flush (non-blocking) imediatamente.
3) A cada 15 min, roda sync periodico:
   - flush da fila
   - pull de dados do Supabase (atualiza cache local)

Chaves no localStorage:
- supabase_sync_queue
- supabase_last_sync

## 5) Groq (IA para parsing)
Arquivo: services/groq.ts

- Endpoint: https://api.groq.com/openai/v1/chat/completions
- Modelo: llama-3.3-70b-versatile
- Prompt garante resposta em JSON com intent:
  - transaction
  - query
  - conversation

Fallbacks importantes:
- Se JSON invalido, vira conversation com resposta generica.
- Valida amount, category e date.

## 6) Variaveis de ambiente
Arquivo: .env.example

Obrigatorias:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- GROQ_API_KEY
- NEXT_PUBLIC_BRAPI_API_KEY
- CRON_SECRET

### 6.1 Onde configurar as variaveis

Sim, voce esta correto:
- Desenvolvimento local: configurar em .env.local (na raiz do projeto).
- Producao (Vercel): configurar em Project Settings > Environment Variables.
- .env.example serve apenas como template/documentacao.

Observacao:
- Variaveis NEXT_PUBLIC_* ficam expostas no bundle do frontend.
- Variaveis sem NEXT_PUBLIC_* so devem existir no server (API Routes e cron).

### 6.2 Acessos (contas)

Logins das ferramentas/plataformas via gmail LM

## 7) Operacao e deploy

- Deploy na Vercel.
- Cron jobs definidos em vercel.json.
- Webhook Telegram aponta para /api/telegram e exige TELEGRAM_WEBHOOK_SECRET.
- Supabase Auth usa SMTP Resend (configurado no painel do Supabase).

### 7.1 Resend (SMTP no Supabase) - passos praticos

1) No painel do Supabase: Authentication > Settings > SMTP.
2) Preencha host/porta/usuario/senha do Resend.
3) Configure o "From" (ex: onboarding@resend.dev ou dominio proprio).
4) Envie um Magic Link de teste para validar entrega.

### 7.2 Checklist rapido de operacao (ponto 2)

Antes de deploy ou apos mexer em integrações:
1) Vercel: env vars configuradas e crons ativos.
2) Supabase: schema + RLS aplicados.
3) Telegram: webhook apontando para /api/telegram com secret.
4) Groq: GROQ_API_KEY valida.
5) Resend SMTP: teste de Magic Link enviado e entregue.

## 8) Teste rapido (sanity checks)

1) Auth:
   - Login com Magic Link envia email (Resend via Supabase).
2) Telegram:
   - /start <codigo> vincula usuario.
   - "gastei 50 no mercado" cria transacao.
3) Cron:
   - Chame /api/cron/generate-recurring com Authorization: Bearer <CRON_SECRET>.
   - Chame /api/cron/telegram-summary?type=weekly com Authorization: Bearer <CRON_SECRET>.

## 9) Troubleshooting comum

- 401 no /api/telegram: webhook secret errado.
- 500 no /api/telegram: TELEGRAM_BOT_TOKEN ausente.
- Cron retornando 401: Authorization nao bate com CRON_SECRET.
- Dados nao sincronizando: offline queue pendente ou usuario nao autenticado.
- Telegram sem resposta: usuario nao vinculado (telegram_chat_id nulo no profile).

## 10) Onde detalhar mais (se precisar)

- Esquema completo: docs/supabase-schema-rls.sql
- Fluxos detalhados: app/api/telegram/route.ts, app/api/cron/*
- Sync offline: services/sync.ts
- CRUD Supabase: services/supabase.ts

## 11) Como configurar o webhook do Telegram

1) Crie o bot no BotFather e pegue o TELEGRAM_BOT_TOKEN.
2) Defina o TELEGRAM_WEBHOOK_SECRET (qualquer valor forte).
3) Configure o webhook com o token e o secret. Exemplo (substitua os valores):
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://controlec.vercel.app/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
4) Verifique com getWebhookInfo:
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo

Observacao:
- O header esperado pela API eh x-telegram-bot-api-secret-token.
- Se o secret nao bater, a rota retorna 401.
