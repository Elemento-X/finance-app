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
| 7.3-7.4 | Categorização automática (IA), bot multilíngue (PT/EN) |
| 7.5 | Dashboard com tendências (gráfico + previsão) |
| 8.1 | MacroBar: indicadores econômicos (Selic, IPCA, taxa real) |
| 9 | Segurança: rate limiting, sanitização, auditoria RLS |

### Em Andamento

- —

### Novidade (Dashboard)

- Tendência (últimos 6 meses): indicador ↑ ↓ → + previsão do próximo mês
- Limiar: max(10% da média do saldo absoluto, R$500)
- Moeda segue preferência do perfil (BRL/USD/EUR) com formatação correta

### Investimentos (UI)

- Atualização automática das cotações a cada 5 minutos (sem botão manual) — feito por codex

### Resiliência (Cache)

- Cotações com cache de 1h — feito por codex
- Última cotação válida persistida para uso offline — feito por codex

### Resiliência (Retry + Timeout)

- Sync offline com retry exponencial e aviso visual — feito por codex
- APIs externas com timeout de 10s (Brapi, Yahoo, BCB) — feito por codex

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

### Novidades 7.3 e 7.4

- Categorizacao automatica: tenta casar categoria localmente (keywords) e usa IA como fallback.
- Bot multilingue: respostas em pt/en conforme idioma do perfil do usuario.
- Idioma do bot: definido pelo campo `language` do profile (pt ou en).
- Rate limiting: 10 mensagens/min por chat (memoria local).
- Sanitizacao: remove HTML e caracteres de controle, limita tamanho de mensagem.
- Exemplos:
  - PT: "gastei 50 no mercado" -> registra despesa.
  - EN: "spent 50 on groceries" -> registers expense.

## Logging

```typescript
// Em dev: todos os níveis aparecem
// Em prod: apenas errors
import { logger } from "@/lib/logger"

logger.sync.info('Sync iniciado')
logger.sync.error('Falha crítica')  // Sempre aparece
```

**Ver logs em produção:** Vercel > Functions > Logs

## Health Check (feito por codex)

```bash
curl "https://controlec.vercel.app/api/health"
```

## Métricas de Uso (feito por codex)

- Supabase registra contagem diária de mensagens do Telegram e transações criadas.
- View: `usage_daily_metrics`

## Links Úteis

- [Vercel Dashboard](https://vercel.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Telegram BotFather](https://t.me/BotFather)
- [Groq Console](https://console.groq.com/)
