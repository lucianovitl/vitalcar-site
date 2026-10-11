'use client'

import React from 'react'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Check, Car, Sparkles, Shield, Award, Zap } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.15
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
}

const featureVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

const features = [
  { icon: Sparkles, label: 'Agendamento Inteligente', desc: 'Calendar com IA que otimiza sua agenda automaticamente' },
  { icon: Car, label: 'Gestao de Frota', desc: 'Controle completo de veiculos, historico e manutencoes' },
  { icon: Shield, label: 'Financeiro Integrado', desc: 'Caixa, contas a pagar/receber, fluxo de caixa em tempo real' },
  { icon: Award, label: 'Relatorios Executivos', desc: 'Dashboards com KPIs, ticket medio, LTV e conversao' },
  { icon: Zap, label: 'WhatsApp Automatizado', desc: 'Confirmacoes, lembretes, pos-venda e NPS no automatico' },
  { icon: Check, label: 'Multi-loja', desc: 'Gerencie varias unidades com controle centralizado' },
]

const stats = [
  { label: 'Oficinas Ativas', value: '247+' },
  { label: 'Agendamentos/Mes', value: '12.000+' },
  { label: 'Faturamento Processado', value: 'R$ 45M+' },
  { label: 'Clientes Satisfeitos', value: '98.5%' },
]

export default function HomePage() {
  return (
    <>
      {/* CINEMATIC HERO */}
      <CinematicHero
        brandName="Vitalcar"
        tagline1="Sua oficina,"
        tagline2="no piloto automatico."
        cardHeading="Gestao que faz a diferenca."
        cardDescription={
          <>
            <span className="text-white font-semibold">Vitalcar</span> e o sistema completo que oficinas de estetica automotiva usam para gerenciar agendamentos, clientes, financeiro e equipe. Do agendamento no WhatsApp ao relatorio de lucro real -- tudo em um lugar.
          </>
        }
        metricValue={247}
        metricLabel="Oficinas Ativas"
        ctaHeading="Comece gratis hoje."
        ctaDescription="14 dias de teste. Sem cartao. Cancele quando quiser."
      />

      {/* FEATURES */}
      <section id="features" className="py-24 lg:py-32 bg-background/50">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <motion.div className="text-center max-w-3xl mx-auto mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="secondary" className="mb-4">Tudo que sua oficina precisa</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Recursos que <span className="vitalcar-text-gradient">fazem a diferenca</span>
            </h2>
            <p className="text-lg text-foreground/70">
              Desenvolvido por quem vive o dia a dia da estetica automotiva. Cada funcionalidade nasceu de uma dor real.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-card border-border/50 hover:border-vitalcar-red/50 transition-all duration-300 hover:shadow-[6px_6px_0_hsl(var(--vitalcar-yellow))] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-vitalcar-red/10 border border-vitalcar-red/20 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-vitalcar-red" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{feature.label}</h3>
                      <p className="text-foreground/70 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO SECTION */}
      <section id="demo" className="py-24 lg:py-32">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <motion.div className="text-center max-w-3xl mx-auto mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="secondary" className="mb-4">Demo Interativo</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Veja o <span className="vitalcar-text-gradient">painel em acao</span>
            </h2>
            <p className="text-lg text-foreground/70">
              Explore as principais telas do sistema. Dados simulados, experiencia real.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="p-6 bg-gradient-to-br from-vitalcar-red/5 via-background to-background border-vitalcar-red/20">
              <h3 className="text-2xl font-bold text-foreground mb-4">Dashboard Executivo</h3>
              <p className="text-foreground/70 mb-6">Visao completa do negocio: faturamento, agendamentos, conversao, ticket medio, LTV.</p>
              <div className="space-y-3">
                {['Faturamento: R$ 127.450', 'Agendamentos: 89 esta semana', 'Ticket Medio: R$ 1.430', 'Conversao: 34%'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-vitalcar-red" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-vitalcar-yellow/5 via-background to-background border-vitalcar-yellow/20">
              <h3 className="text-2xl font-bold text-foreground mb-4">Gestao de Ordens (Kanban)</h3>
              <p className="text-foreground/70 mb-6">Arraste e solte: Pendente -> Em Andamento -> Pronto -> Entregue. Historico completo por veiculo.</p>
              <div className="grid grid-cols-4 gap-2">
                {['Pendente (12)', 'Em Andamento (7)', 'Pronto (5)', 'Entregue (23)'].map((col, i) => (
                  <div key={i} className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                    <div className="text-xs font-medium text-foreground/60 uppercase tracking-wide">{col.split(' ')[0]}</div>
                    <div className="text-2xl font-bold text-foreground">{col.match(/\d+/)?.[0]}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 lg:py-32 bg-background/50">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <motion.div className="text-center max-w-3xl mx-auto mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="secondary" className="mb-4">Preco simples, sem pegadinhas</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Escolha o plano <span className="vitalcar-text-gradient">ideal para voce</span>
            </h2>
            <p className="text-lg text-foreground/70">
              Todos os planos incluem: agendamentos ilimitados, WhatsApp, relatorios, suporte prioritario.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: 'R$ 197', period: '/mes', desc: 'Para oficinas iniciantes', features: ['Ate 50 agendamentos/mes', '1 usuario', 'WhatsApp basico', 'Relatorios essenciais', 'Suporte por e-mail'], cta: 'Comecar Gratis', highlight: false },
              { name: 'Professional', price: 'R$ 397', period: '/mes', desc: 'Para oficinas em crescimento', features: ['Agendamentos ilimitados', '5 usuarios', 'WhatsApp avancado + automacoes', 'Relatorios completos + KPIs', 'Suporte WhatsApp prioritario', 'API acesso'], cta: 'Testar 14 Dias', highlight: true },
              { name: 'Enterprise', price: 'Sob consulta', period: '', desc: 'Para redes e franquias', features: ['Tudo do Professional', 'Usuarios ilimitados', 'Multi-loja nativo', 'Integracoes customizadas', 'Gerente de sucesso dedicado', 'SLA 99.9%', 'Onboarding presencial'], cta: 'Falar com Vendas', highlight: false },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`relative h-full p-6 flex flex-col ${plan.highlight ? 'border-vitalcar-red/50 shadow-[6px_6px_0_hsl(var(--vitalcar-yellow))]' : 'border-border/50'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-vitalcar-red text-vitalcar-red-foreground px-3 py-1">Mais Popular</Badge>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                    <p className="text-foreground/60 text-sm">{plan.desc}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-foreground/60">/{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, fi) => (
                      <li key={fi} className="flex items-center gap-3 text-foreground/70">
                        <Check className="w-5 h-5 text-vitalcar-red flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.highlight ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-vitalcar-red text-white hover:bg-vitalcar-red-dark'}`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Card>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cadastro" className="py-24 lg:py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-8 max-w-3xl relative z-10">
          <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Badge variant="secondary" className="mb-4">Pronto para comecar?</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Transforme sua oficina <span className="vitalcar-text-gradient">hoje mesmo</span>
            </h2>
            <p className="text-lg text-foreground/70 mb-10 max-w-2xl mx-auto">
              14 dias gratis. Sem cartao de credito. Cancele quando quiser. 
              Junte-se a 247+ oficinas que ja evoluiram.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 shadow-[4px_4px_0_hsl(var(--vitalcar-yellow))] text-lg px-8 py-6 font-semibold w-full sm:w-auto">
                Criar Minha Conta Gratis
              </Button>
              <Button variant="outline" size="lg" className="border-foreground/30 text-foreground hover:bg-foreground/10 hover:border-foreground/50 text-lg px-8 py-6 font-semibold w-full sm:w-auto">
                Agendar Demo com Especialista
              </Button>
            </div>
            <p className="mt-6 text-sm text-foreground/50">
              Ao continuar, voce concorda com nossos <a href="/termos" className="underline hover:text-foreground">Termos</a> e <a href="/privacidade" className="underline hover:text-foreground">Privacidade</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-12 lg:py-16 bg-background/50">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-xl text-foreground mb-4 vitalcar-text-gradient">Vitalcar</h3>
              <p className="text-foreground/60 text-sm leading-relaxed">
                Sistema de gestao completo para oficinas de estetica automotiva. 
                Feito por detalheiros, para detalheiros.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#features" className="hover:text-vitalcar-red transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-vitalcar-red transition-colors">Precos</a></li>
                <li><a href="#demo" className="hover:text-vitalcar-red transition-colors">Demo</a></li>
                <li><a href="/changelog" className="hover:text-vitalcar-red transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="/sobre" className="hover:text-vitalcar-red transition-colors">Sobre Nos</a></li>
                <li><a href="/blog" className="hover:text-vitalcar-red transition-colors">Blog</a></li>
                <li><a href="/carreiras" className="hover:text-vitalcar-red transition-colors">Carreiras</a></li>
                <li><a href="/contato" className="hover:text-vitalcar-red transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="/termos" className="hover:text-vitalcar-red transition-colors">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-vitalcar-red transition-colors">Politica de Privacidade</a></li>
                <li><a href="/cookies" className="hover:text-vitalcar-red transition-colors">Cookies</a></li>
                <li><a href="/lgpd" className="hover:text-vitalcar-red transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-foreground/50">
              (c) 2024 Vitalcar. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/vitalcar" className="text-foreground/50 hover:text-vitalcar-red transition-colors" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com/vitalcar" className="text-foreground/50 hover:text-vitalcar-red transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.243h-3.308l-7.227-8.26-8.502-9.243h3.308l7.227 8.26-8.502-9.243h3.308l7.227-8.26 8.502-9.243h-3.308l-7.227 8.26 8.502 9.243"/></svg>
              </a>
              <a href="https://linkedin.com/company/vitalcar" className="text-foreground/50 hover:text-vitalcar-red transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.065 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227.792 24 22.222 0h.003z"/></svg>
              </a>
              <a href="https://linkedin.com/company/vitalcar" className="text-foreground/50 hover:text-vitalcar-red transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.065 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227.792 24 22.222 0h.003z"/></svg>
              </a>
              <a href="https://instagram.com/vitalcar" className="text-foreground/50 hover:text-vitalcar-red transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771-4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.1281-.058-1.69-.07-4.947-.07zM12 6.865c-2.856 0-5.17 2.313-5.17 5.169 0 2.856 2.314 5.169 5.17 5.169 2.857 0 5.17-2.313 5.17-5.169 0-2.857-2.313-5.17-5.17-5.17zm0 8.146c-1.641 0-2.975-1.335-2.975-2.975 0-1.64 1.334-2.975 2.975-2.975 1.641 0 2.975 1.335 2.975 2.975 0 1.64-1.334-2.975-2.975 2.975z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}