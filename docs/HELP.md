# ControleC - Guia Rápido

## Status Atual

**Produção:** https://controlec.vercel.app/

### Fases Concluídas ✅

| Fase | Descrição |
|------|-----------|
| 1-3 | Estabilização, modelo de dados, UX |
| 4 | Features: transações recorrentes, goals com progresso, exports |
| 5 | Supabase: auth, CRUD, sync offline-first |
| 6 | Telegram Bot: vinculação, parsing IA, transações |
| 7.1-7.2 | Resumos automáticos, alertas de orçamento |
| 8.1 | MacroBar: indicadores econômicos (Selic, IPCA, taxa real) |
| 9 | Segurança: rate limiting, sanitização, auditoria RLS |

### Em Andamento

- 7.3: Categorização automática via IA
- 7.4: Bot multilíngue
- 7.5: Dashboard com tendências

### Planejadas

- 8.2: Expandir indicadores de ativos
- 10: Resiliência (retry, fallback, cache)
- 11: Observabilidade (health check, métricas, alertas)
- 12: Performance (bundle size, queries)
- 13: DX (testes E2E, seed data)

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| `.claude/commands/controlec.md` | Contexto completo do projeto |
| `docs/backend.md` | Arquitetura do backend serverless |
| `docs/supabase-schema-rls.sql` | Schema do banco de dados |

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm test
npm run test:run

# Deploy
git push  # Vercel deploya automaticamente
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
GROQ_API_KEY=
NEXT_PUBLIC_BRAPI_API_KEY=
CRON_SECRET=
```

## Telegram Bot

```bash
# Configurar webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://controlec.vercel.app/api/telegram&secret_token=<SECRET>"
```

## Logging

```typescript
// Em dev: todos os níveis aparecem
// Em prod: apenas errors
import { logger } from "@/lib/logger"

logger.sync.info('Sync iniciado')
logger.sync.error('Falha crítica')  // Sempre aparece
```

**Ver logs em produção:** Vercel > Functions > Logs

## Links Úteis

- [Vercel Dashboard](https://vercel.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Telegram BotFather](https://t.me/BotFather)
- [Groq Console](https://console.groq.com/)
