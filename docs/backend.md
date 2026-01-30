# Backend Serverless - ControleC

Este documento explica como o backend do ControleC funciona. Não há servidor tradicional: usamos Next.js API Routes + Supabase + serviços externos.

## 1. Visão Geral

| Componente | Responsabilidade |
|------------|------------------|
| Next.js (Vercel) | Hospeda frontend e expõe API Routes serverless |
| Supabase | Banco PostgreSQL, Auth (Magic Link), RLS |
| localStorage | Cache offline no browser |
| Telegram Bot API | Entrada de transações/consultas por chat |
| Groq API | IA para parsing de mensagens (Llama 3.3-70b) |
| Resend SMTP | Entrega de emails do Magic Link |

### Diagrama de Fluxo

```
┌─────────────────┐         ┌─────────────────┐
│  Browser / App  │◄───────►│    Supabase     │
│   (Next.js)     │ Auth+   │  DB + Auth +    │
└────────┬────────┘ CRUD    │      RLS        │
         │                  └────────▲────────┘
         │ cache                     │
         ▼                           │
┌─────────────────┐                  │
│  localStorage   │──────────────────┘
│  (offline)      │      sync
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ Telegram User   │◄───────►│  /api/telegram  │
│    (chat)       │         │   (webhook)     │
└─────────────────┘         └────────┬────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
              ┌───────────┐  ┌───────────┐  ┌───────────┐
              │ Groq API  │  │ Supabase  │  │  Budget   │
              │  (parse)  │  │  (save)   │  │  Alerts   │
              └───────────┘  └───────────┘  └───────────┘

┌─────────────────┐         ┌─────────────────┐
│  /api/cron/*    │────────►│    Supabase     │
│ (Vercel crons)  │         │                 │
└────────┬────────┘         └─────────────────┘
         │
         ▼
┌─────────────────┐         ┌─────────────────┐
│ Telegram Bot    │────────►│  Telegram User  │
│     API         │ resumos │    (chat)       │
└─────────────────┘         └─────────────────┘
```

### Arquivos-Chave

| Arquivo | Descrição |
|---------|-----------|
| `app/api/telegram/route.ts` | Webhook Telegram |
| `app/api/health/route.ts` | Health check (Supabase + serviços externos) — feito por codex |
| `app/api/cron/generate-recurring/route.ts` | Cron: transações recorrentes |
| `app/api/cron/telegram-summary/route.ts` | Cron: resumos semanais/mensais |
| `services/supabase.ts` | CRUD Supabase (usa `logger.supabase`) |
| `services/sync.ts` | Sync offline-first (usa `logger.sync`) |
| `services/groq.ts` | Parsing de mensagens com IA (usa `logger.telegram`) |
| `services/migrations.ts` | Migrações de dados (usa `logger.migrations`) |
| `services/bcb.ts` | API Banco Central (Selic, IPCA) |
| `services/brapi.ts` | API Brapi.dev com timeout de 10s |
| `components/dashboard/trend-chart.tsx` | Card de tendência (saldo 6 meses + previsão) |
| `utils/formatters.ts` | Formatação de moeda por locale (BRL/USD/EUR) |
| `lib/supabase.ts` | Client Supabase (browser) |
| `lib/supabase-admin.ts` | Client Supabase (service role) |
| `lib/security.ts` | Rate limiting, sanitização, validação |

## 2. API Routes

### 2.1 Webhook Telegram

**Arquivo:** `app/api/telegram/route.ts`

**Fluxo:**
1. Telegram envia POST para `/api/telegram`
2. Valida header `x-telegram-bot-api-secret-token`
3. Se `/start <código>`: vincula chat ao usuário via `telegram_link_tokens`
4. Para mensagens normais:
   - Identifica usuário pelo `telegram_chat_id`
   - Carrega categorias do usuário
   - Chama Groq para parsing
   - Se transação: salva em `transactions`, checa `budget_alerts`
   - Se query: calcula resumo e responde
   - Se conversa: responde texto amigável

**Observações:**
- Sempre retorna 200 para evitar reenvios do Telegram
- Usa service role (bypass RLS)

### 2.2 Cron: Transações Recorrentes

**Arquivo:** `app/api/cron/generate-recurring/route.ts`
**Schedule:** Diário às 03:05 UTC (00:05 BRT)

**Fluxo:**
1. Valida `Authorization: Bearer <CRON_SECRET>`
2. Busca `recurring_transactions` ativas
3. Para cada recorrência que deve gerar hoje: cria transação e atualiza `last_generated_date`

### 2.3 Cron: Resumos Telegram

**Arquivo:** `app/api/cron/telegram-summary/route.ts`
**Schedule:**
- Semanal: segunda 12:00 UTC
- Mensal: dia 1 às 12:00 UTC

**Fluxo:**
1. Valida `Authorization: Bearer <CRON_SECRET>`
2. Busca usuários com `telegram_chat_id` e `telegram_summary_enabled = true`
3. Calcula resumo (semana/mês anterior)
4. Envia via Telegram Bot API

## 3. Supabase

### 3.1 Client Público (Browser)

**Arquivo:** `lib/supabase.ts`

Usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. RLS garante acesso apenas aos dados do próprio usuário.

### 3.2 Client Admin (Server)

**Arquivo:** `lib/supabase-admin.ts`

Usa `SUPABASE_SERVICE_ROLE_KEY`. Usado apenas em API Routes. Ignora RLS.

### 3.3 Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do usuário + Telegram |
| `telegram_link_tokens` | Códigos de vinculação |
| `categories` | Categorias do usuário |
| `transactions` | Transações financeiras |
| `goals` | Metas com progresso |
| `assets` | Ativos de investimento |
| `recurring_transactions` | Transações recorrentes |
| `budget_alerts` | Limites de orçamento por categoria |

**RLS:** Todas as tabelas usam `auth.uid() = user_id`. API Routes com service role ignoram RLS.

**Schema completo:** `docs/supabase-schema-rls.sql`

## 4. Sincronização Offline-First

**Arquivo:** `services/sync.ts`

**Conceito:**
- Supabase = source of truth
- localStorage = cache offline
- Fila `supabase_sync_queue` guarda operações offline

**Funcionamento:**
1. Cada mudança salva no localStorage e enfileira operação
2. Se online: flush imediato (non-blocking)
3. A cada 15 min: sync periódico (flush + pull)
4. Retry exponencial no sync com notificação visual — feito por codex

**Chaves localStorage:**
- `supabase_sync_queue` - Operações pendentes
- `supabase_last_sync` - Timestamp da última sync

## 4.1 Cache de Cotações (Market Data) — feito por codex

**Arquivo:** `services/market-data.ts`

- Cache de cotações por 1h (`market_data_cache`) — feito por codex
- Última cotação válida persistida para uso offline (`market_data_last_valid`) — feito por codex
- Timeout de 10s em APIs externas (Yahoo, CoinGecko) — feito por codex

## 5. BCB (Banco Central)

**Arquivo:** `services/bcb.ts`

**Endpoint base:** `https://api.bcb.gov.br/dados/serie/bcdata.sgs`

**Séries utilizadas:**
| Série | Código | Descrição |
|-------|--------|-----------|
| Selic | 432 | Taxa Selic Meta (% a.a.) |
| IPCA | 433 | IPCA variação mensal (%) |

**Dados retornados:**
- Selic atual
- IPCA mensal
- IPCA acumulado 12 meses (calculado localmente)
- Taxa real (Selic - IPCA 12m)

**Cache:**
- Selic: 24 horas
- IPCA: 7 dias

**Componente:** `MacroBar` (exibido no dashboard e investimentos)

## 6. Groq (IA)

**Arquivo:** `services/groq.ts`

**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
**Modelo:** `llama-3.3-70b-versatile`

**Intents detectados:**
- `transaction` - Criar transação
- `query` - Consultar dados
- `conversation` - Conversa geral

**Fallbacks:**
- JSON inválido → conversation
- Validação de amount, category, date

## 7. Variáveis de Ambiente

| Variável | Onde Usar |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Browser |
| `TELEGRAM_BOT_TOKEN` | Server only |
| `TELEGRAM_WEBHOOK_SECRET` | Server only |
| `GROQ_API_KEY` | Server only |
| `NEXT_PUBLIC_BRAPI_API_KEY` | Browser |
| `CRON_SECRET` | Server only |

**Onde configurar:**
- Dev: `.env.local`
- Prod: Vercel Project Settings > Environment Variables

**Importante:** Variáveis `NEXT_PUBLIC_*` são expostas no bundle do frontend.

### 6.1 Acessos (Contas)

| Serviço | Login | Notas |
|---------|-------|-------|
| Vercel | Gmail LM | Projeto: controlec |
| Supabase | Gmail LM | Projeto: controlec, região Brasil |
| Telegram BotFather | Telegram LM | Bot: @ControleCBot |
| Groq | Gmail LM | Free tier |
| Resend | Gmail LM | SMTP para Magic Link |
| Brapi.dev | Gmail LM | Free tier, 15k req/mês |

> **Gmail LM** = conta Gmail principal do projeto

## 8. Operação

### Deploy
- Hospedado na Vercel
- Cron jobs definidos em `vercel.json`

### Webhook Telegram
```bash
# Configurar webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://controlec.vercel.app/api/telegram&secret_token=<SECRET>"

# Verificar
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Health Check — feito por codex

```bash
curl "https://controlec.vercel.app/api/health"
```

### SMTP (Supabase)
1. Supabase Dashboard > Authentication > Settings > SMTP
2. Configurar host/porta/usuário/senha do Resend
3. Definir "From" (ex: `noreply@seudominio.com`)

## 9. Checklist de Deploy

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Schema + RLS aplicados no Supabase
- [ ] Webhook Telegram apontando para `/api/telegram`
- [ ] SMTP Resend configurado no Supabase
- [ ] Crons ativos (verificar `vercel.json`)

## 10. Logging e Monitoramento

### 9.1 Logger (`lib/logger.ts`)

Logger centralizado com níveis de log:

```typescript
import { logger } from "@/lib/logger"

logger.sync.info('Mensagem informativa')   // Dev only
logger.sync.warn('Aviso')                  // Dev only
logger.sync.error('Erro crítico')          // Sempre (prod + dev)
```

**Loggers disponíveis:**
- `logger.sync` - Sincronização offline
- `logger.brapi` - API Brapi.dev
- `logger.marketData` - Cotações (Yahoo, CoinGecko)
- `logger.supabase` - Operações Supabase
- `logger.telegram` - Bot Telegram
- `logger.cron` - Jobs agendados
- `logger.migrations` - Migrações de dados
- `logger.app` - Geral

**Comportamento:**
- Em `development`: todos os níveis aparecem no console
- Em `production`: apenas `error` aparece

### 9.2 Monitoramento em Produção

| Ferramenta | O que monitora |
|------------|----------------|
| Vercel Analytics | Page views, Core Web Vitals |
| Vercel Logs | Output de API Routes e crons |
| Supabase Dashboard | Queries, Auth, RLS errors |

**Ver logs de cron na Vercel:**
1. Dashboard > Project > Functions
2. Selecione a função (ex: `api/cron/generate-recurring`)
3. Aba "Logs"

## 11. Segurança

### 11.1 Rate Limiting (`lib/security.ts`)

O webhook do Telegram implementa rate limiting para evitar abuso:

```typescript
import { checkRateLimit, TELEGRAM_RATE_LIMIT } from "@/lib/security"

// 10 mensagens por minuto por chat
const result = checkRateLimit(`telegram:${chatId}`, TELEGRAM_RATE_LIMIT)
if (!result.allowed) {
  // Retorna mensagem de "aguarde X segundos"
}
```

**Configuração:**
- `maxRequests`: 10 mensagens
- `windowMs`: 60.000ms (1 minuto)
- Storage: in-memory (reset em cold start)

### 11.2 Sanitização de Input

Todas as mensagens do Telegram são sanitizadas antes do processamento:

```typescript
import { sanitizeInput, validateInput, MAX_MESSAGE_LENGTH } from "@/lib/security"

const text = sanitizeInput(rawText, { maxLength: MAX_MESSAGE_LENGTH })
const validation = validateInput(text)
```

**Proteções:**
- Remoção de caracteres de controle
- Remoção de tags HTML
- Limite de 1000 caracteres
- Detecção de padrões de prompt injection

### 11.3 RLS (Row Level Security)

Todas as tabelas do Supabase têm RLS habilitado:

| Tabela | Política |
|--------|----------|
| profiles | `auth.uid() = id` |
| transactions | `auth.uid() = user_id` |
| categories | `auth.uid() = user_id` |
| goals | `auth.uid() = user_id` |
| assets | `auth.uid() = user_id` |
| recurring_transactions | `auth.uid() = user_id` |
| budget_alerts | `auth.uid() = user_id` |
| telegram_link_tokens | `auth.uid() = user_id` |

**Importante:** API Routes usam `service_role` (bypass RLS) apenas para operações do bot Telegram.

### 11.4 Variáveis de Ambiente

| Tipo | Variáveis | Exposição |
|------|-----------|-----------|
| Públicas | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_BRAPI_API_KEY` | Bundle frontend |
| Secretas | `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `GROQ_API_KEY`, `CRON_SECRET` | Server only |

## 12. Troubleshooting

| Problema | Causa Provável | Como Verificar |
|----------|----------------|----------------|
| 401 no `/api/telegram` | `TELEGRAM_WEBHOOK_SECRET` errado | Vercel Logs |
| 500 no `/api/telegram` | `TELEGRAM_BOT_TOKEN` ausente | Vercel Logs |
| Cron retorna 401 | `CRON_SECRET` não bate | Vercel Functions > Logs |
| Dados não sincronizam | Fila offline ou usuário não autenticado | DevTools > localStorage |
| Telegram sem resposta | `telegram_chat_id` nulo no profile | Supabase > profiles |
| Magic Link não chega | SMTP não configurado no Supabase | Supabase > Auth > Logs |
| Logs não aparecem | `NODE_ENV !== 'development'` | Verifique `.env.local` |
