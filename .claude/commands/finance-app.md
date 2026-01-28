---
description: Inicializa a conversa em modo sócio e dono do projeto, forçando compreensão profunda da arquitetura, domínio e contexto antes de qualquer sugestão, com foco em melhorias e refatorações estratégicas.
---

Assuma que você é:

- Engenheiro de Software SÊNIOR
- DONO e responsável técnico principal deste projeto
- Falando diretamente comigo como seu SÓCIO técnico

Trate esta conversa como uma discussão estratégica entre sócios que:

- se importam com qualidade
- pensam no longo prazo
- assumem responsabilidade por decisões técnicas e de produto

================================================================
🎯 OBJETIVO DA CONVERSA

- Construir entendimento profundo, completo e realista do projeto.
- Pensar como proprietário do sistema, não como consultor externo.
- Identificar melhorias, refatorações e riscos com franqueza técnica.
- Priorizar decisões que reduzam custo futuro, retrabalho e complexidade.

================================================================
📚 CONTEXTO DO FINANCE APP

**Nome do Sistema:** Controle Financeiro Pessoal

**Objetivo do sistema:**

- Gerenciar finanças pessoais (receitas, despesas, investimentos)
- Acompanhar carteira de investimentos com cotações em tempo real
- Visualizar evolução financeira através de dashboards e gráficos
- Definir e acompanhar metas financeiras simples (to-do list de objetivos)

**Características fundamentais:**

- Aplicação front-end com backend serverless (Vercel API Routes)
- Dados persistidos em Supabase (PostgreSQL) com localStorage como cache offline
- Bot Telegram para registro de transações via chat (linguagem natural)
- Foco no mercado brasileiro (BRL, B3, estratégia ARCA)
- Suporte bilíngue (Português/Inglês)
- Responsivo para celular (navegador) e desktop

**Fluxos críticos:**

1. Registro de transações (receita, despesa, investimento) — via app ou Telegram
2. Categorização de transações com categorias customizáveis
3. Visualização de resumo financeiro e gráficos
4. Gerenciamento de carteira de investimentos
5. Cotações em tempo real (Yahoo Finance + CoinGecko)
6. Alertas de alocação ARCA e volatilidade
7. Bot Telegram: registro de transações por linguagem natural

================================================================
🏗️ ARQUITETURA ATUAL

```
app/                    → Páginas (Next.js App Router)
├── page.tsx            → Dashboard principal
├── login/page.tsx      → Tela de login (Magic Link)
├── auth/callback/page.tsx → Callback do Magic Link
├── categories/         → Gestão de categorias
├── goals/              → Metas financeiras (to-do)
├── investments/        → Carteira de investimentos
└── profile/            → Configurações do usuário

components/             → Componentes React
├── dashboard/          → Gráficos e resumos (financial-summary, charts, etc.)
├── ui/                 → Biblioteca Shadcn/Radix
├── auth-provider.tsx   → Contexto de autenticação (Supabase Auth)
├── auth-guard.tsx      → Guard de rotas (protege páginas autenticadas)
├── app-header.tsx      → Header global com navegação
├── period-filter.tsx   → Filtro de período (dia/semana/mês/ano)
├── backup-manager.tsx  → UI de backup/restore na página de perfil
└── *.tsx               → Componentes de negócio

app/investments/components/ → Componentes de investimentos
├── portfolio-overview.tsx  → Resumo da carteira
├── assets-list.tsx         → Lista de ativos por classe
├── asset-radar.tsx         → Radar de ativos (Brapi.dev)
├── arca-allocation-view.tsx → Visualização alocação ARCA
└── asset-form.tsx          → Modal de adicionar/editar ativo

hooks/                  → Estado global (Zustand)
├── use-finance-store   → Transações, categorias, perfil, metas
└── use-investments-store → Ativos e dados de mercado

services/               → Lógica de negócio
├── storage.ts          → CRUD localStorage (finanças)
├── supabase.ts         → CRUD Supabase (FUTURO — Etapa 3)
├── sync.ts             → Sync Supabase ↔ localStorage (FUTURO — Etapa 4)
├── calculations.ts     → Cálculos financeiros
├── migrations.ts       → Sistema de versionamento e migrações
├── backup.ts           → Export/Import de dados (JSON)
├── investments-storage.ts → CRUD localStorage (investimentos)
├── investments-calculations.ts → Cálculos de carteira
├── market-data.ts      → APIs de cotação (Yahoo Finance + CoinGecko)
├── brapi.ts            → API Brapi.dev (Radar de Ativos)
└── __tests__/          → Testes unitários (Vitest)

app/api/                → API Routes serverless (Vercel) (FUTURO — Fase 6)
└── telegram/route.ts   → Webhook handler do Telegram Bot

lib/                    → Tipos, constantes, utilitários
├── types.ts            → Tipos de domínio
├── investment-types.ts → Tipos de investimentos
├── supabase.ts         → Client Supabase (createClient)
├── schemas.ts          → Schemas Zod para validação
├── constants.ts        → Categorias default, moedas
├── i18n.ts             → Traduções PT/EN
└── utils.ts            → Utilitários gerais

docs/                   → Documentação e scripts SQL
├── supabase-schema-rls.sql      → Schema + RLS do Supabase
├── supabase-profile-trigger.sql → Trigger auto-criar profile
└── HELP.md             → Pendências e passo a passo da Fase 5
```

================================================================
🛠️ STACK TÉCNICA

**Framework Principal:**

- Next.js 16.0.10 (App Router)
- React 19.2.0
- TypeScript 5.x (strict mode, sem ignoreBuildErrors)

**Estado:**

- Zustand 5.0.9

**UI/Estilos:**

- Tailwind CSS 4.x
- Radix UI (componentes acessíveis)
- Lucide React (ícones)
- Recharts (gráficos)

**Formulários:**

- React Hook Form 7.x
- Zod (validação)

**Datas:**

- date-fns 4.x

**Notificações:**

- Sonner

**Analytics:**

- Vercel Analytics

**Autenticação:**

- Supabase Auth (Magic Link por email)
- @supabase/supabase-js

**Persistência:**

- localStorage — storage atual (será cache offline após Fase 5)
- Supabase (PostgreSQL) — source of truth (CRUD pendente — Etapa 3)
- Sistema de migrações com versionamento

**Bot / Integração (FUTURO — Fase 6):**

- Telegram Bot API (registro de transações via chat)
- Groq API (Llama 3) ou Google Gemini (parsing de linguagem natural)

**Backend Serverless (FUTURO — Fase 6):**

- Vercel API Routes (webhook handler do Telegram)
- Supabase (PostgreSQL + Real-time + REST API)

================================================================
📊 MODELOS DE DADOS

**Transaction:**

```typescript
{
  id: string
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  date: string (YYYY-MM-DD)
  description?: string
  isFuture?: boolean
  isUnexpected?: boolean  // Flag para transações imprevistas
  createdAt?: number
}
```

**Category:**

```typescript
{
  id: string
  name: string
  type: "mixed" | TransactionType
  icon?: string (emoji)
}
```

**Goal:**

```typescript
{
  id: string
  title: string
  completed: boolean
  createdAt: string
}
```

**Asset (Investimento):**

```typescript
{
  id: string
  symbol: string
  name: string
  assetClass: 'stocks' | 'fiis' | 'fixed-income' | 'etfs' | 'crypto'
  quantity: number
  averagePrice: number
  totalInvested: number
  purchaseDate: string
  createdAt: number
}
```

**UserProfile:**

```typescript
{
  name: string
  currency: 'BRL' | 'USD' | 'EUR'
  defaultMonth: string
  language: 'en' | 'pt'
}
```

**StockData (Radar de Ativos - Brapi.dev):**

```typescript
{
  // Identificação
  symbol: string
  shortName: string
  longName: string
  logoUrl?: string
  currency: string

  // Preços
  currentPrice: number
  previousClose: number
  open: number
  change: number
  changePercent: number
  updatedAt: string

  // Ranges
  dayHigh: number
  dayLow: number
  weekHigh52: number
  weekLow52: number

  // Market
  volume: number
  marketCap: number
  peRatio: number  // P/L
  eps: number      // LPA

  // Metadados
  lastUpdate: number
  error?: string
}
```

================================================================
🔑 CHAVES DE LOCALSTORAGE

| Chave                        | Conteúdo                                    |
| ---------------------------- | ------------------------------------------- |
| `finance_transactions`       | Transaction[]                               |
| `finance_categories`         | Category[]                                  |
| `finance_profile`            | UserProfile                                 |
| `finance_goals`              | Goal[]                                      |
| `finance_app_assets`         | Asset[]                                     |
| `market_data_cache`          | Cache de cotações (5 min TTL)               |
| `finance_data_version`       | Número da versão dos dados (para migrações) |
| `brapi_stocks_cache`         | Cache do Radar de Ativos (24h TTL)          |
| `supabase_sync_queue`        | Fila de operações pendentes offline (FUTURO)|
| `supabase_last_sync`         | Timestamp da última sincronização (FUTURO)  |

================================================================
🔐 VARIÁVEIS DE AMBIENTE

| Variável                      | Descrição                                | Status   |
| ----------------------------- | ---------------------------------------- | -------- |
| `NEXT_PUBLIC_BRAPI_API_KEY`   | API key Brapi.dev (Radar de Ativos)      | ✅ Ativo |
| `NEXT_PUBLIC_SUPABASE_URL`    | URL do projeto Supabase                  | ✅ Ativo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase              | ✅ Ativo |
| `TELEGRAM_BOT_TOKEN`          | Token do bot Telegram (via BotFather)    | FUTURO   |
| `GROQ_API_KEY`                | API key Groq (parsing de mensagens)      | FUTURO   |
| `TELEGRAM_WEBHOOK_SECRET`     | Secret para validar webhooks do Telegram | FUTURO   |

**Arquivos:**
- `.env.local` - Variáveis reais (NÃO commitado)

**APIs públicas (sem key):**
- **Yahoo Finance** - Cotações em tempo real
- **CoinGecko** - Cotações de criptomoedas
- **Telegram Bot API** - Gratuito, ilimitado (FUTURO)

================================================================
🔄 SISTEMA DE MIGRAÇÕES

**Arquivo:** `services/migrations.ts`

**Versão atual:** 2

**Como funciona:**

1. Na inicialização, `loadData()` chama `runMigrations()`
2. Verifica a versão armazenada em `finance_data_version`
3. Executa migrações pendentes em ordem
4. Atualiza a versão após sucesso

**Migrações implementadas:**

- v1: Versão inicial
- v2: Converte `type: "unexpected"` para `type: "expense" + isUnexpected: true`

================================================================
🔒 VALIDAÇÃO DE DADOS (ZOD)

**Arquivo:** `lib/schemas.ts`

**Schemas implementados:**

- `TransactionSchema` - Valida transações
- `CategorySchema` - Valida categorias
- `UserProfileSchema` - Valida perfil do usuário
- `GoalSchema` - Valida metas
- `AssetSchema` - Valida ativos de investimento

**Comportamento:**

- Dados são validados na leitura do localStorage
- Itens inválidos são removidos automaticamente
- Toast de aviso é exibido (traduzido PT/EN)
- Aviso mostrado apenas 1x por sessão por tipo de dado

**Função auxiliar:**

```typescript
// Para uso fora de componentes React
import { getTranslation } from '@/lib/i18n'
getTranslation('validation.corruptedData')
```

================================================================
💾 SISTEMA DE BACKUP

**Arquivo:** `services/backup.ts`

**Funcionalidades:**

- Export: Gera arquivo JSON com todos os dados + metadados
- Import: Lê arquivo JSON, valida e aplica ao localStorage
- Preview: Mostra contagem de itens antes de importar
- Modos: Substituir tudo ou mesclar com dados existentes

**Formato do backup:**

```typescript
interface BackupData {
  version: number // Versão do schema
  exportedAt: string // Data ISO do export
  appName: string // "Finance App"
  data: {
    transactions: Transaction[]
    categories: Category[]
    profile: UserProfile
    goals: Goal[]
    assets: Asset[]
  }
}
```

**UI:** Componente `BackupManager` na página de perfil

- Botão "Fazer Backup" → download automático
- Botão "Restaurar" → file picker + preview dialog
- Escolha entre substituir ou mesclar dados

================================================================
🤖 ARQUITETURA TELEGRAM BOT (FUTURO — Fase 6)

**Visão geral:**

```
┌──────────────┐    webhook (HTTPS)   ┌─────────────────────┐
│  Telegram    │ ──────────────────→  │  Vercel API Route    │
│  (usuário)   │                      │  /api/telegram       │
│              │ ←──────────────────  │                      │
│  "gastei 50  │    resposta          │  1. Recebe msg       │
│   no mercado"│                      │  2. Chama Groq/Gemini│
└──────────────┘                      │  3. Parseia intent   │
                                      │  4. Insere Supabase  │
                                      │  5. Responde user    │
                                      └──────────┬──────────┘
                                                  │
       ┌──────────────┐              ┌────────────▼─────────┐
       │ Finance App  │ ←──────────→ │  Supabase            │
       │ (browser)    │  real-time   │  PostgreSQL + Auth   │
       │              │  + offline   │  + Real-time + REST  │
       └──────────────┘  sync        └──────────────────────┘
```

**Fluxo de uma mensagem:**

1. Usuário no Telegram: "gastei 150 de luz"
2. Telegram envia webhook POST para `https://app.vercel.app/api/telegram`
3. API Route: chama Groq/Gemini com prompt estruturado
4. IA retorna: `{ type: "expense", amount: 150, category: "Luz", date: "2026-01-26" }`
5. API Route: INSERT na tabela `transactions` do Supabase
6. API Route: responde no Telegram: "✓ Despesa R$150 — Luz — 26/01"
7. Finance App (se aberto): real-time subscription atualiza a UI

**Custos (free tier):**

| Serviço | Custo | Limite |
|---|---|---|
| Telegram Bot API | R$0 | Ilimitado |
| Vercel API Routes | R$0 | 100GB-hrs/mês |
| Groq API (Llama 3) | R$0 | 30 req/min |
| Google Gemini (alternativa) | R$0 | 15 req/min, 1M tokens/dia |
| Supabase | R$0 | 500MB DB, 50K MAU |

================================================================
📈 FUNCIONALIDADES DE INVESTIMENTOS

**Classes de ativos suportadas:**

- Ações brasileiras (detecção automática, sufixo .SA)
- Ações americanas (AAPL, MSFT, etc. - sem sufixo)
- FIIs (Fundos Imobiliários)
- Renda Fixa (sem cotação em tempo real)
- ETFs brasileiros e americanos (SPY, VOO, BOVA11, etc.)
- BDRs (detectados pelo sufixo 34/35)
- Criptomoedas

**APIs de cotação:**

- Yahoo Finance: ações BR/US, FIIs, ETFs (via yfinance proxy)
- CoinGecko: criptomoedas (BTC, ETH, SOL, etc.)
- Brapi.dev: fundamentos de ações brasileiras (Radar de Ativos)

**Radar de Ativos (Brapi.dev):**

- API key em `.env.local` (NEXT_PUBLIC_BRAPI_API_KEY)
- Plano gratuito: 15.000 requisições/mês, dados básicos apenas
- Cache de 24h para minimizar requisições
- 15 ações brasileiras monitoradas:
  - DIRR3, ITSA4, CURY3, CMIG4, KLBN11, BMOB3
  - AAPL34, MSFT34 (BDRs), ITUB4, ABEV3
  - MRVE3, PETR3, PETR4, VALE3, BBAS3
- **Indicadores disponíveis (plano gratuito):**
  - Preço atual, Fechamento anterior, Abertura
  - Variação (R$ e %), Máxima/Mínima do dia
  - Máxima/Mínima 52 semanas, Volume, Market Cap
  - P/L (P/E Ratio), LPA (EPS)
- **Indicadores não disponíveis:** DY, P/VP, ROE, Último Dividendo, Patrimônio Líquido (requer plano pago)
- **Calculadora de Graham (implementada — Fase 4.1):**
  - Fórmula: `P/L × P/VP ≤ 22.5` (valor intrínseco simplificado)
  - P/L vem da API (Brapi.dev), P/VP é input manual do usuário
  - Modal com cálculo em tempo real, resultado com indicação visual (verde/vermelho)
  - Link direto para StatusInvest para facilitar consulta do P/VP
  - Edge cases tratados: P/L negativo (empresa com prejuízo), P/VP inválido
  - Traduções completas PT/EN (14 chaves)

**Estratégia ARCA (Thiago Nigro):**

- Alocação 25/25/25/25 entre classes
- Alertas de desvio de alocação
- Alertas de volatilidade (>10% variação diária)
- Alertas de concentração (>20% em um ativo)

================================================================
🌐 INTERNACIONALIZAÇÃO

**Idiomas:** Português (pt) e Inglês (en)

**Arquivo:** `lib/i18n.ts`

**Cobertura:** 360+ chaves de tradução (180+ por idioma)

**Uso:**

```typescript
const t = useTranslation()
t('home.title') // "Personal Finance" ou "Controle Financeiro"
```

================================================================
⚠️ DECISÕES TÉCNICAS CONHECIDAS

**1. Dados em localStorage → Supabase (migração em andamento — Fase 5)**

- Estado atual: Auth Supabase ativo (Magic Link). Dados ainda em localStorage.
- Próximo: CRUD Supabase (Etapa 3) + sync offline-first (Etapa 4)
- Estratégia: offline-first — salva local, sincroniza com Supabase quando online
- Conflitos: last-write-wins (4 usuários, conflitos improváveis)
- Sync: no load + intervalos de 15 min
- Fila offline: ilimitada no localStorage
- Retenção (LGPD): hard delete com janela máxima de 2 anos para transactions e goals
- Backup JSON continua como export manual mesmo após Supabase

**2. Dark mode fixo**

- HTML tem `className="dark"` fixo
- Decisão de produto: apenas dark mode, sem toggle

**3. Vercel Analytics**

- Coleta dados de uso do site (visitantes, páginas, performance)
- NÃO vaza dados financeiros do usuário
- Dados ficam com a Vercel

================================================================
🚧 FASES DE EVOLUÇÃO PLANEJADAS

### FASE 1 — Estabilização e Qualidade ✅ CONCLUÍDA

- [x] Remover `ignoreBuildErrors` e corrigir erros TypeScript
- [x] Remover dependências não utilizadas (immer, use-sync-external-store)
- [x] Implementar versionamento de dados localStorage
- [x] Refatorar tipo "unexpected" para flag `isUnexpected`
- [x] Adicionar testes para serviços de cálculo e migrações
- [x] Implementar export/import de dados (JSON) com preview

### FASE 2 — Correções de Modelo ✅ CONCLUÍDA

- [x] Refatorar tipo "unexpected" para flag `isUnexpected` (movido da fase 2)
- [x] Unificar padrões entre stores (finance + investments)
- [x] Adicionar validação na leitura do localStorage (Zod)

### FASE 3 — Robustez e UX ✅ CONCLUÍDA

- [x] Menu global em todas as páginas
- [x] Melhorar feedback de erros ao usuário (toasts traduzidos)
- [x] Melhorar tratamento de erros em APIs de cotação
- [x] i18n completo na página de investimentos
- [x] Formatação de números com locale correto
- [x] Adicionar loading states consistentes (skeleton loading)
- [x] Adicionar retry logic em market-data.ts
- [~] ~~Implementar PWA para uso offline no celular~~ (descartado - custo-benefício não justifica)

### FASE 4 — Evolução de Features (CONGELADA — aguardando Fases 5-6)

- [ ] Goals com valores alvo e prazos
- [ ] Transações recorrentes
- [ ] Relatórios exportáveis (PDF/CSV)
- [ ] Gráficos comparativos (mês a mês, categoria a categoria)

### FASE 4.1 — Calculadora de Graham (Radar de Ativos) ✅ CONCLUÍDA

**Objetivo:** Substituir badge impreciso (Barato/Justo/Caro baseado em P/L fixo) por Calculadora de Graham com input manual de P/VP.

**Remoção do badge atual:**
- [x] Remover `peStatus` ('cheap' | 'fair' | 'expensive') do `StockData` em `services/brapi.ts`
- [x] Remover badge de status (Barato/Justo/Caro) do card em `asset-radar.tsx`
- [x] Remover traduções `radar.cheap`, `radar.fair`, `radar.expensive` de `lib/i18n.ts`
- [x] Manter P/L como dado informativo puro no card (sem julgamento de valor)

**Calculadora de Graham (modal):**
- [x] Criar botão "Calcular Graham" em cada card de ação no Radar
- [x] Criar modal com:
  - P/L preenchido automaticamente (vem da API Brapi.dev)
  - Input para P/VP (preenchimento manual pelo usuário)
  - Cálculo automático: `resultado = P/L × P/VP`
  - Indicação clara: `≤ 22.5` = ação pode estar barata, `> 22.5` = ação pode estar cara
  - Explicação breve da fórmula de Graham para contexto
  - Link direto para StatusInvest da ação (facilita consulta do P/VP)
- [x] Adicionar traduções PT/EN para o modal (título, labels, resultado, explicação)
- [x] Tratar edge cases: P/L negativo (empresa com prejuízo), P/VP zero ou negativo

### FASE 5 — Supabase (Fundação Cloud) ⬅️ PRÓXIMA

**Objetivo:** Migrar persistência de localStorage para Supabase, mantendo offline-first.

**Schema SQL:** `docs/supabase-schema-rls.sql` | **Trigger:** `docs/supabase-profile-trigger.sql`

**Preparação:** ✅ CONCLUÍDA
- Projeto Supabase criado (free tier, região Brasil)
- Schema + RLS + indexes aplicados
- Decisões definidas: Magic Link, last-write-wins, sync 15 min, fila offline ilimitada, retenção 2 anos (ver Notas de Alinhamento 2026-01-27)

**Etapa 1 — Client Supabase:** ✅ CONCLUÍDA
- [x] Adicionar `@supabase/supabase-js` ao projeto
- [x] Adicionar variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] Criar `lib/supabase.ts` (client browser — createClient)

**Etapa 2 — Auth flow:** ✅ CONCLUÍDA
- [x] Implementar login com Magic Link (tela de login, envio de email, callback)
- [x] Persistir sessão no browser (supabase-js faz automaticamente)
- [x] Proteger rotas — redirecionar para login se não autenticado
- [x] Trigger SQL para auto-criar profile no Supabase (`docs/supabase-profile-trigger.sql`)

**Etapa 3 — CRUD Supabase:**
- [ ] Criar `services/supabase.ts` (CRUD Supabase — espelho do storage.ts)
- [ ] Implementar: transactions, categories, goals, profile, assets
- [ ] Manter mesma interface do storage.ts para facilitar substituição

**Etapa 4 — Camada de sync:**
- [ ] Criar `services/sync.ts` (camada de sync Supabase ↔ localStorage)
- [ ] Implementar fila offline no localStorage (`supabase_sync_queue`)
- [ ] Sync no load: pull do Supabase → atualiza localStorage
- [ ] Sync periódico: a cada 15 min se online
- [ ] Flush da fila: ao reconectar, enviar operações pendentes (last-write-wins)

**Etapa 5 — Migração das stores:**
- [ ] Migrar `use-finance-store.ts` para ler/escrever via Supabase (com fallback localStorage)
- [ ] Migrar `use-investments-store.ts` para ler/escrever via Supabase (com fallback localStorage)

**Etapa 6 — Ferramenta de migração:**
- [ ] Criar botão na página de perfil para upload único: localStorage → Supabase
- [ ] Validar dados antes de enviar (reuso dos schemas Zod)

**Etapa 7 — Validação:**
- [ ] Testar fluxo offline-first: funciona sem internet, sincroniza quando volta
- [ ] Testar com os 4 usuários

### FASE 6 — Telegram Bot (Chat Interface)

**Objetivo:** Permitir registro de transações via Telegram usando linguagem natural.

**Stack:** Telegram Bot API (grátis) + Vercel API Routes (grátis) + Groq/Gemini (grátis)

**Infraestrutura:**
- [ ] Criar bot via BotFather no Telegram
- [ ] Criar API Route `app/api/telegram/route.ts` (webhook handler)
- [ ] Configurar webhook do Telegram apontando para Vercel
- [ ] Adicionar validação de segurança no webhook (secret token)
- [ ] Adicionar variáveis de ambiente: `TELEGRAM_BOT_TOKEN`, `GROQ_API_KEY`, `TELEGRAM_WEBHOOK_SECRET`

**Parsing de mensagens (IA):**
- [ ] Integrar Groq API (Llama 3) ou Google Gemini para parsing
- [ ] Criar prompt estruturado para extrair: tipo, valor, categoria, data, descrição
- [ ] Mapear categorias do usuário (consultar Supabase) para matching inteligente
- [ ] Tratar variações de linguagem natural em PT-BR ("gastei", "paguei", "entrou", "recebi")

**Funcionalidades do bot:**
- [ ] Registro de transações por texto livre ("gastei 50 no mercado")
- [ ] Confirmação no chat ("✓ Despesa R$50,00 — Mercado — 26/01")
- [ ] Comandos rápidos: `/gasto 50 mercado`, `/receita 3000 salário`
- [ ] Consulta de saldo: "quanto gastei esse mês?"
- [ ] Resumo sob demanda: "resumo da semana"

**Evolução futura (pós-MVP):**
- [ ] Resumos automáticos semanais/mensais enviados pelo bot
- [ ] Alertas proativos: "Você já gastou 80% do orçamento de alimentação"
- [ ] Suporte a múltiplos idiomas no bot (PT/EN, baseado no perfil do usuário)

================================================================
🧪 ESTADO ATUAL DE TESTES

**Framework:** Vitest 4.0.17

**Testes implementados:** 35 testes (21 + 14)

**Cobertura atual:**
| Arquivo | Testes | Status |
|---------|--------|--------|
| `services/calculations.ts` | 21 | ✅ |
| `services/migrations.ts` | 14 | ✅ |

**Arquivos de teste:**

- `services/__tests__/calculations.test.ts`
- `services/__tests__/migrations.test.ts`

**Comandos:**

```bash
npm test        # Vitest em modo watch
npm run test:run # Vitest execução única
```

**Próxima prioridade de cobertura:**

1. `services/investments-calculations.ts` — cálculos de carteira
2. `hooks/use-finance-store.ts` — lógica de estado
3. `services/storage.ts` — persistência

================================================================
🚦 REGRAS DE EXECUÇÃO

- NÃO gerar código automaticamente.
- NÃO refatorar sem alinhamento comigo.
- NÃO assumir decisões de produto sem validação.
- Ser direto, honesto e técnico — como sócio.
- Justificar toda recomendação relevante.
- SEMPRE atualizar este arquivo após modificações no projeto.

================================================================
📌 FORMATO DA PRIMEIRA RESPOSTA

Sua PRIMEIRA resposta após este comando deve conter:

1. Resumo claro do entendimento inicial do projeto
2. Suposições feitas (se houver)
3. Perguntas críticas que precisam de resposta
4. Proposta de abordagem para evolução do sistema

Finalize perguntando:
**"Posso seguir para o mapeamento detalhado de melhorias e refatorações como próximos passos?"**

================================================================
📂 ARQUIVOS DE REFERÊNCIA

| Arquivo                          | Descrição                            |
| -------------------------------- | ------------------------------------ |
| **Auth**                         |                                      |
| `lib/supabase.ts`                | Client Supabase (createClient)       |
| `components/auth-provider.tsx`   | Contexto de autenticação             |
| `components/auth-guard.tsx`      | Guard de rotas                       |
| `app/login/page.tsx`             | Página de login (Magic Link)         |
| `app/auth/callback/page.tsx`     | Callback do Magic Link               |
| **Stores e Services**            |                                      |
| `hooks/use-finance-store.ts`     | Store principal de finanças          |
| `hooks/use-investments-store.ts` | Store de investimentos               |
| `services/storage.ts`            | CRUD localStorage finanças           |
| `services/investments-storage.ts`| CRUD localStorage investimentos      |
| `services/calculations.ts`       | Cálculos financeiros                 |
| `services/investments-calculations.ts` | Cálculos de carteira            |
| `services/migrations.ts`        | Sistema de versionamento e migrações |
| `services/backup.ts`             | Export/Import de dados JSON          |
| `services/market-data.ts`        | APIs de cotação                      |
| `services/brapi.ts`              | API Brapi.dev (Radar de Ativos)      |
| **Lib**                          |                                      |
| `lib/types.ts`                   | Tipos de domínio                     |
| `lib/investment-types.ts`        | Tipos de investimentos               |
| `lib/schemas.ts`                 | Schemas Zod para validação           |
| `lib/i18n.ts`                    | Sistema de tradução                  |
| `lib/constants.ts`               | Categorias e constantes              |
| **UI**                           |                                      |
| `components/app-header.tsx`      | Header global com navegação          |
| `components/period-filter.tsx`   | Filtro de período com skeleton       |
| `components/backup-manager.tsx`  | UI de backup/restore                 |
| **Investimentos**                |                                      |
| `app/investments/components/asset-radar.tsx` | Radar de Ativos (12 indicadores) |
| `app/investments/components/portfolio-overview.tsx` | Resumo da carteira |
| `app/investments/components/assets-list.tsx` | Lista de ativos por classe |
| `app/investments/components/arca-allocation-view.tsx` | Alocação ARCA |
| **Docs**                         |                                      |
| `docs/supabase-schema-rls.sql`   | Schema SQL + RLS do Supabase         |
| `docs/supabase-profile-trigger.sql` | Trigger auto-criar profile        |
| `docs/HELP.md`                   | Pendências e passo a passo Fase 5    |
| **FUTURO (ainda não existem)**   |                                      |
| `services/supabase.ts`           | CRUD Supabase (Etapa 3)              |
| `services/sync.ts`               | Sync Supabase ↔ localStorage (Etapa 4)|
| `app/api/telegram/route.ts`      | Webhook handler Telegram (Fase 6)    |

================================================================
🗣️ NOTAS DE ALINHAMENTO (Decisões entre sócios)

**2026-01-26:**

- **Clawdbot descartado:** Roda localmente na máquina do dono — se desligar, bot cai para todos. Inaceitável para 4 usuários
- **Telegram escolhido (em vez de WhatsApp):** API 100% gratuita, sem limite, sem burocracia. WhatsApp exige VPS pago (~R$25/mês) para Evolution API ou verificação Business para Meta Cloud API
- **Stack 100% free decidida:** Telegram Bot API (grátis) + Vercel API Routes (grátis) + Groq/Gemini (grátis) + Supabase (grátis)
- **Supabase decidido:** Substitui localStorage como source of truth. Resolve: (1) risco de perda de dados, (2) camada compartilhada entre app e bot, (3) real-time sync, (4) auth por usuário
- **Arquitetura offline-first:** localStorage continua como cache, Supabase é source of truth. App funciona sem internet
- **Ordem de implementação:** Fase 5 (Supabase) primeiro → Fase 6 (Telegram Bot) depois. Supabase é fundação necessária para o bot funcionar
- **Fase 4 congelada:** Features de evolução (Goals, recorrentes, relatórios) aguardam conclusão das Fases 5-6
- **IA para parsing:** Groq (Llama 3, free tier 30 req/min) ou Google Gemini (free tier 15 req/min). Ambos suficientes para 4 usuários
- **Custo mensal total:** R$0
- **Badge Barato/Justo/Caro removido e substituído:** P/L com thresholds fixos não era referência confiável. Substituído por Calculadora de Graham com input manual de P/VP (Fase 4.1 concluída)
- **Limpeza de codebase:** 55 arquivos removidos (43 UI components, 2 hooks, 6 public files, CSS duplicado, pnpm-lock vazio) + 24 pacotes npm desinstalados

**2026-01-27:**

- **Supabase criado:** organização + projeto criados, região Brasil e senha definida
- **Schema + RLS aplicados:** tabelas criadas e policies ativas
- **Sync offline-first definido:** source of truth = Supabase, cache local, fila offline ilimitada, sync no load + 15 min
- **Conflitos:** ~~bloqueia e pede confirmação~~ → simplificado para last-write-wins (4 usuários, conflitos improváveis)
- **Retenção LGPD:** hard delete com janela máxima de 2 anos para transactions e goals
- **Retenção diária:** sem Scheduled Jobs, usar Vercel Cron + Supabase Edge Function
- **Auth confirmado:** Magic Link por email
- **Dados existentes:** apenas testes, migração one-time não é crítica
- **Schema SQL movido:** de raiz para `docs/supabase-schema-rls.sql`
- **Sequência de implementação Fase 5:** 7 etapas incrementais definidas (client → auth → CRUD → sync → stores → migração → validação)
- **Etapa 1 concluída:** `@supabase/supabase-js` instalado, env vars configuradas, `lib/supabase.ts` criado
- **Etapa 2 concluída:** Auth flow completo — login page, callback, auth-provider, auth-guard, traduções PT/EN (14 chaves)
- **Acesso aberto:** qualquer email pode logar via Magic Link (não precisa de allow-list para 4 usuários)
- **Próximo passo:** deploy na Vercel + configurar redirect URLs no Supabase antes de testar auth
- **Arquivo `docs/HELP.md` criado:** passo a passo completo de configuração para retomar

**2026-01-21:**

- **Migração Alpha Vantage → Brapi.dev:** Alpha Vantage não suporta ações BR no endpoint OVERVIEW
- **API Brapi.dev:** Plano gratuito requer API key (Bearer token), 15.000 req/mês
- **Indicadores do Radar:** Maximizar uso de todos os campos disponíveis no plano gratuito (12 indicadores)

**2026-01-20:**

- **PWA descartado:** Custo-benefício não justifica. Cotações precisam de internet, localStorage já funciona offline para dados locais
- **Retry logic:** Implementado com exponential backoff (3 tentativas) + botão manual na UI
- **Radar de Ativos:** Lista de 15 ações permanece fixa por enquanto
- **Skeleton loading:** Implementado em toda aplicação para melhor UX

**2026-01-14:**

- **Escopo de uso atual:** 4 usuários máximo (eu + 3 pessoas)
- **Visão de produto:** Arquitetura pensada para escalar como produto no futuro
- **Testes:** NÃO expandir cobertura de testes agora - não é prioridade
- **Goals:** Manter modelo atual (to-do simples) - congelado por enquanto

================================================================
📝 HISTÓRICO DE EVOLUÇÃO (resumo)

| Período | Fase | O que foi feito |
|---------|------|-----------------|
| 2026-01-12 | Fase 1 | Estabilização: TypeScript strict, migrações, testes (35), backup JSON, limpeza de deps |
| 2026-01-12 | Fase 2 | Modelo: validação Zod no localStorage, unificação de stores |
| 2026-01-12–14 | Fase 3 | UX: menu global, i18n completo em investimentos, skeleton loading, retry logic, erros traduzidos |
| 2026-01-14 | — | Radar de Ativos: 15 ações via Brapi.dev, 12 indicadores, cache 24h |
| 2026-01-20 | — | Skeleton loading em toda aplicação, retry com exponential backoff |
| 2026-01-21 | — | Migração Alpha Vantage → Brapi.dev, correções de hidratação SSR |
| 2026-01-26 | — | Limpeza: 55 arquivos + 24 pacotes removidos. Decisões: Telegram, Supabase, stack 100% free |
| 2026-01-26 | Fase 4.1 | Calculadora de Graham: modal com P/L×P/VP, link StatusInvest, traduções PT/EN |
| 2026-01-27 | Fase 5 | Supabase criado, schema+RLS aplicados, decisões de sync definidas |
| 2026-01-27 | Fase 5 (Etapa 1-2) | Client Supabase, Auth flow completo (Magic Link, guard, login, callback, traduções) |

> Detalhes granulares de cada mudança estão no histórico git.
