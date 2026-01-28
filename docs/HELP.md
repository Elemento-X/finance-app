# Pendências para continuar a Fase 5

## Status atual

- Etapa 1 (Client Supabase): CONCLUÍDA
- Etapa 2 (Auth flow): CONCLUÍDA (código pronto, falta configuração externa)
- Etapa 3 (CRUD Supabase): pendente
- Etapa 4 (Sync): pendente
- Etapa 5 (Migração stores): pendente
- Etapa 6 (Ferramenta migração): pendente
- Etapa 7 (Validação): pendente

## Antes de testar o Auth (pré-requisitos)

### 1. Trigger SQL no Supabase

Rodar `docs/supabase-profile-trigger.sql` no SQL Editor do Supabase.

**Status: FEITO**

### 2. Deploy na Vercel

O app precisa estar deployado para que o Magic Link funcione (o email redireciona para uma URL real).

**Como fazer:**

1. Criar conta na Vercel (https://vercel.com) se ainda não tiver
2. Conectar o repositório Git do projeto
3. Na Vercel, ir em **Settings > Environment Variables** e adicionar:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ejfyrueskwyqjvlqptns.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (mesmo valor do `.env.local`)
   - `NEXT_PUBLIC_BRAPI_API_KEY` = (mesmo valor do `.env.local`)
4. Fazer deploy (a Vercel faz automaticamente ao pushar para o repositório)
5. Anotar a URL gerada (ex: `https://seu-app.vercel.app`)

### 3. Configurar URLs no Supabase

No dashboard do Supabase, ir em **Authentication > URL Configuration**:

- **Site URL**: colocar a URL da Vercel (ex: `https://seu-app.vercel.app`)
- **Redirect URLs**: adicionar as duas URLs abaixo:
  - `http://localhost:3000/auth/callback` (desenvolvimento local)
  - `https://seu-app.vercel.app/auth/callback` (produção)

### 4. Testar o fluxo

1. Acessar a URL da Vercel
2. Deve aparecer a tela de login
3. Digitar um email e clicar "Enviar link de acesso"
4. Verificar o email (pode cair no spam)
5. Clicar no link do email
6. Deve redirecionar para o dashboard do app

**Para desenvolvimento local:**

1. `npm run dev`
2. Acessar `http://localhost:3000`
3. Mesmo fluxo acima (o Magic Link redirecionará para localhost se configurado)

### 5. Trocar a senha do banco

A senha do PostgreSQL foi exposta no chat. Trocar em:
**Supabase Dashboard > Settings > Database > Database Password**

(Não afeta o funcionamento do app — o app usa a anon key, não a senha do banco.)

## Próximo passo após testar o Auth

Etapa 3: CRUD Supabase (`services/supabase.ts`) — espelhar as operações do `storage.ts` para funcionar com Supabase.
