# Checklist de Hardening de Segurança — Lensys Care

**Data da avaliação:** 2026-07-12
**Contexto:** Resposta à pergunta "se um hacker atacar hoje, ele consegue acessar e
roubar os dados dos usuários?". Combina a auditoria de código (o que foi possível
verificar no repositório) com os itens de infraestrutura que só podem ser confirmados
nos painéis do Supabase e da Vercel.

---

## Resumo executivo

**Pela ótica do código da aplicação, não há um caminho fácil para roubar dados de
usuários.** As defesas da camada de aplicação estão sólidas e foram reforçadas
(ver `docs/security-audit-multitenant-2026-07-12.md`). O risco residual real está na
**configuração de infraestrutura** (rede, segredos) e em **higiene de dependências**,
não na lógica da aplicação.

---

## ✅ Verificado no código (protegido)

| Vetor | Situação |
|---|---|
| Roubo cross-tenant (dados de outra clínica) | Bloqueado — todo caminho Prisma valida `clinic_id`; auditoria completa |
| SQL injection | Sem risco — queries parametrizadas (Prisma + tagged templates); nenhum `queryRawUnsafe` |
| Vazamento da chave `service_role` | Só server-side (5 arquivos); sem prefixo `NEXT_PUBLIC_`, não entra no bundle do cliente |
| Segredos no repositório | Nenhum — sem `.env` no histórico do git; só `.env.example` com placeholders |
| Bypass de autenticação | Middleware protege rotas não-públicas; sessão via JWT do Supabase |
| CVE-2025-29927 (bypass de middleware do Next) | Já corrigido (app está no Next 14.2.35, patch veio no 14.2.25) |
| Fraude no webhook do Stripe | Assinatura verificada |

---

## 🔧 Ações de infraestrutura (só você consegue confirmar/aplicar)

### 1. RLS em produção — ✅ CONFIRMADO ATIVO (2026-07-12)
Verificado em Supabase → Database → Policies: todas as tabelas com RLS ativo.
Reconfirmar após qualquer mudança de schema.

### 2. Rotacionar a senha do banco — ⏳ PENDENTE (recomendado)
Por quê: invalida qualquer senha antiga que possa ter vazado; é a proteção mais
efetiva enquanto o banco aceita conexão de qualquer IP.
- Supabase → Settings → Database → **Reset database password** (gere uma forte)
- Atualize `DATABASE_URL` e `DIRECT_URL` nas env vars da **Vercel**
  (Project → Settings → Environment Variables)
- Redeploy

### 3. SSL Enforcement — ⏳ CONFIRMAR
- Supabase → Settings → Database → **SSL Enforcement** deve estar **ativado**

### 4. Network Restrictions — ⏸️ ABERTO (`0.0.0.0/0`), tratar com cuidado
Estado atual: banco aceita conexão de qualquer IP. **Importante:** não é "aberto sem
senha" — ainda exige a senha do banco. É defesa em profundidade.

**Pegadinha:** o app roda na Vercel (serverless), que usa **IPs de saída dinâmicos**.
Restringir para IPs específicos **quebra a conexão do app em produção**. Só trave por IP
se adotar IPs estáticos de saída (Vercel Secure Compute/Static IPs — recurso pago — ou
um proxy com IP fixo). Aí allowlist esses IPs + o IP de admin. Projeto à parte, não
urgente enquanto a senha for forte e o SSL estiver ativo.

### 5. Env vars bem guardadas — ✅ declarado OK
`.env.local` no `.gitignore`; sem prints/registros de chaves. Manter assim.

---

## 🔐 Autenticação — roadmap

### 6. Login social (Google / Facebook OAuth) — ⏳ PLANEJADO (fazer antes do MFA)
Habilitar em Supabase → Authentication → Providers, criar as credenciais OAuth em
Google Cloud / Meta, e adicionar os botões no fluxo de login.

### 7. MFA (Multi-Factor Authentication) — ⏳ PLANEJADO (após OAuth)
Supabase Auth suporta MFA (TOTP). Reduz drasticamente o vetor nº1 do mundo real:
comprometimento de conta de usuário legítimo via senha fraca/phishing.

---

## 📦 Dependências

### 8. Atualizar o Next.js — ⏳ PENDENTE (higiene, não emergência)
`pnpm audit` acusou 17 vulnerabilidades (6 high). Análise:
- **14.2.35 já é a última da linha 14.2.x.** Os CVEs só têm correção em `>=15.5.16` →
  exige **migração major 14 → 15** (APIs de request assíncronas: `cookies()`, `params`,
  `searchParams`; React 19 por padrão). É um projeto testado numa branch, não um update
  trivial.
- **Urgência real: moderada.** Os "high" são quase todos **DoS** (derrubam o site, não
  roubam dados). O "middleware bypass" só afeta **Pages Router + i18n** — o app usa App
  Router sem i18n, **não se aplica**.

Rodar `pnpm audit --prod` periodicamente.

---

## ⚠️ Achado de aplicação em aberto

### 9. M-1 — messaging para destinatário arbitrário — ⏳ aguarda decisão de produto
`/api/messaging/sms` e `/whatsapp` enviam para qualquer número, sem vínculo com paciente
e sem rate limit. Não vaza dados, mas permite abuso/toll-fraud. Ver
`docs/security-audit-multitenant-2026-07-12.md` (M-1).

---

## Prioridade recomendada

| # | Ação | Impacto | Risco de quebrar | Urgência |
|---|---|---|---|---|
| 1 | Rotacionar senha do banco + atualizar Vercel | Alto | Baixo | Agora |
| 2 | Confirmar SSL Enforcement | Médio | Nenhum | Agora |
| 3 | Login social (OAuth) → depois MFA | Alto | Baixo | Próximo |
| 4 | Migração Next 15 (branch + testes) | Médio (DoS) | Médio | Planejar |
| 5 | Network Restrictions por IP | Alto | Alto sem IP fixo | Só com IP estático |
| 6 | M-1 messaging (validar destinatário/rate limit) | Médio | Baixo | Backlog |

> A camada de código não entrega os dados de bandeja — essa metade foi auditada. A outra
> metade (rede, segredos, MFA) é infra que você controla nos painéis. Com RLS ativa
> (confirmado) + senha forte rotacionada + SSL, o cenário de roubo de dados fica
> substancialmente fechado.
