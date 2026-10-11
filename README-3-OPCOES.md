# Vitalcar — 3 Opções de Evolução

Este repositório contém **3 implementações completas** para você testar e escolher.

---

## 🎯 **Opção 1: Vanilla Liquid Metal (JÁ FUNCIONA NO SEU SITE ATUAL)**

**Arquivos:**
- `liquid-metal-vanilla.js` — WebGL shader + hero component (zero React, zero build)
- `liquid-metal-demo.html` — Abra no browser para testar AGORA

**Como usar no seu `index.html` atual:**

```html
<!-- 1. Adicione antes do </body> -->
<script src="liquid-metal-vanilla.js"></script>

<!-- 2. Onde quiser o hero (substitui sua section.hero atual) -->
<div id="lm-hero" data-lm-hero
  data-badge="🚀 10% OFF INAUGURAÇÃO"
  data-title="SEU CARRO<br>COMO NOVO<br>TODOS OS DIAS"
  data-subtitle="Lavagem técnica, polimento, vitrificação, higienização. Carros e motos com produtos premium."
  data-primary-cta="Agende pelo WhatsApp"
  data-primary-href="https://wa.me/557391436726"
  data-secondary-cta="Ligar agora"
  data-secondary-href="tel:+557391436726"
  data-features="Lavagem Técnica + Snow Foam|Polimento & Vitrificação Certificados|Higienização Profunda & Couro"
  data-rating="5.0"
  data-reviews="6"
></div>
```

**Vantagens:**
- ✅ Funciona **hoje** no seu stack vanilla (HTML/CSS/JS)
- ✅ Zero dependências, ~15KB gzipped
- ✅ Mesma paleta CSS (`--red`, `--yellow`, `--bg`, etc.)
- ✅ Acessível (ARIA, focus-visible, reduced-motion)
- ✅ Performance nativa (requestAnimationFrame, ResizeObserver)

---

## 🚀 **Opção 2: Next.js SaaS Starter (PARA O NOVO PRODUTO)**

**Pasta:** `vitalcar-saas-starter/`

**Stack:**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Button, Badge, Card, etc.)
- Framer Motion + @paper-design/shaders-react (LiquidMetal nativo)
- Firebase Auth + Firestore (mesmo projeto atual)
- Prisma + PostgreSQL (opcional, para dados relacionais)

**Estrutura:**
```
vitalcar-saas-starter/
├── app/
│   ├── (landing)/          # Público: Hero, Features, Pricing, FAQ
│   ├── (dashboard)/        # Protegido: Admin, Clientes, Ordens, Relatórios
│   ├── api/                # Webhooks, Auth, Billing
│   ├── layout.tsx          # Fontes, metadata, providers
│   ├── page.tsx            # Landing completa com LiquidMetalHero
│   └── globals.css         # Design tokens Vitalcar
├── components/
│   └── ui/                 # shadcn/ui (button, badge, card, dialog, etc.)
├── lib/
│   ├── utils.ts            # cn(), formatters, helpers
│   ├── firebase.ts         # Client + Admin SDK
│   └── auth.ts             # Middleware, hooks
├── hooks/                  # useAuth, useOrders, useClients
├── prisma/                 # Schema (opcional)
├── tailwind.config.ts      # Tokens Vitalcar (cores, fontes, sombras)
├── next.config.mjs
└── package.json
```

**Para rodar:**
```bash
cd vitalcar-saas-starter
npm install
cp .env.example .env.local  # Preencha suas chaves Firebase
npm run dev
# Abre em http://localhost:3000
```

**O que já vem implementado:**
- ✅ Landing page completa (Hero LiquidMetal, Features, Stats, Demo, Pricing, CTA, Footer)
- ✅ `LiquidMetalHero` component React (portado do seu demo)
- ✅ Design system Vitalcar (cores, fontes, sombras, radius)
- ✅ shadcn/ui configurado (Button, Badge, Card, Dialog, Toast, etc.)
- ✅ Firebase Auth middleware (rotas protegidas)
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier

---

## 🧪 **Opção 3: Demo Isolada (TESTE RÁPIDO)**

**Arquivo:** `liquid-metal-demo.html`

**Como testar:**
1. Copie `liquid-metal-demo.html` + `liquid-metal-vanilla.js` para qualquer pasta
2. Abra no browser (duplo clique ou `npx serve`)
3. Role a página — o hero WebGL roda no canvas fixo
4. Inspecione o console — zero erros, zero warnings

**O que demonstra:**
- Hero com badge, título, subtitle, CTAs, rating, features
- Animações de entrada (staggered, cubic-bezier)
- Hover states nos botões (translate + shadow)
- Canvas WebGL com shader "liquid metal" (preset 2)
- Responsivo (mobile → desktop)
- Reduced-motion respeitado
- Auto-mount via `data-lm-hero` attributes

---

## 📊 **Comparação Rápida**

| Critério | Opção 1 (Vanilla) | Opção 2 (Next.js) | Opção 3 (Demo) |
|----------|-------------------|-------------------|----------------|
| **Tempo para produção** | Hoje | 2-4 semanas | N/A (teste) |
| **Stack atual** | ✅ Mantém | 🔄 Migra | ✅ Mantém |
| **LiquidMetal** | WebGL vanilla | @paper-design/shaders-react | WebGL vanilla |
| **SEO/SSR** | ❌ | ✅ Next.js | ❌ |
| **Dashboard Admin** | Seu `admin/index.html` | Novo em React | N/A |
| **Escalabilidade** | Limitada | Alta | N/A |
| **Team learning curve** | Zero | Média (React/Next) | Zero |

---

## 🎯 **Minha Recomendação**

| Seu objetivo | Faça isso |
|--------------|-----------|
| **Melhorar o site HOJE** | Opção 1 — integra em 15 min |
| **Lançar SaaS em 30 dias** | Opção 2 — comece o Next.js hoje |
| **Validar o visual primeiro** | Opção 3 — abra o `.html` no browser |

---

## 🔧 **Próximos Passos (se escolher Opção 2)**

1. **Configure o `.env.local`:**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   FIREBASE_ADMIN_PRIVATE_KEY=...
   FIREBASE_ADMIN_CLIENT_EMAIL=...
   DATABASE_URL="postgresql://..."  # opcional
   ```

2. **Migre o painel admin** (`admin/index.html` → `app/(dashboard)/`):
   - Componentes React para cada aba (Dashboard, Ordens, Clientes, Relatórios, Gastos, Serviços, Vídeos, Promo)
   - Hooks `useOrders()`, `useClients()`, `useReports()`
   - Real-time com `onSnapshot` (já usa no vanilla)

3. **Adicione Billing** (Stripe/Asaas):
   - Webhook `/api/billing/webhook`
   - Portal do cliente `/dashboard/billing`
   - Planos Starter/Professional/Enterprise

4. **Deploy:**
   - Vercel (Next.js) + Firebase Functions (webhooks)
   - Domínio customizado `app.vitalcar.app`

---

## 📞 **Suporte**

Qualquer dúvida nas 3 opções, me chama. Posso:
- Ajustar cores/fonts do vanilla para match 100% com seu `studio.css`
- Adicionar mais componentes shadcn/ui no Next.js (Dialog, Table, Select, Tabs, Chart)
- Criar o schema Prisma baseado no seu Firestore atual
- Montar o middleware de multi-tenant (subdomínio por franquia)

**O ninho tá quente. Qual farelo roemos primeiro?** 🦷