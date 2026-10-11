'use client'

import React from 'react'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Check, Car, Sparkles, Shield, Award, Zap } from 'lucide-react'

const features = [
  { icon: Sparkles, label: 'Agendamento Inteligente', desc: 'Calendar com IA que otimiza sua agenda automaticamente' },
  { icon: Car, label: 'Gestao de Frota', desc: 'Controle completo de veiculos, historico e manutencoes' },
  { icon: Shield, label: 'Financeiro Integrado', desc: 'Caixa, contas a pagar/receber, fluxo de caixa em tempo real' },
  { icon: Award, label: 'Relatorios Executivos', desc: 'Dashboards com KPIs, ticket medio, LTV e conversao' },
  { icon: Zap, label: 'WhatsApp Automatizado', desc: 'Confirmacoes, lembretes, pos-venda e NPS no automatico' },
  { icon: Check, label: 'Multi-loja', desc: 'Gerencie varias unidades com controle centralizado' },
]

export default function HomePage() {
  return (
    <>
      <CinematicHero
        brandName="Vitalcar"
        tagline1="Sua oficina,"
        tagline2="no piloto automatico."
        cardHeading="Gestao que faz a diferenca."
        cardDescription="Vitalcar e o sistema completo para oficinas de estetica automotiva."
        metricValue={247}
        metricLabel="Oficinas Ativas"
        ctaHeading="Comece gratis hoje."
        ctaDescription="14 dias de teste. Sem cartao. Cancele quando quiser."
      />

      <section id="features" className="py-24 lg:py-32 bg-background/50">
        <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
          <motion.div className="text-center max-w-3xl mx-auto mb-16" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}>
            <Badge variant="secondary" className="mb-4">Tudo que sua oficina precisa</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Recursos que <span className="vitalcar-text-gradient">fazem a diferenca</span>
            </h2>
            <p className="text-lg text-foreground/70">Desenvolvido por quem vive o dia a dia da estetica automotiva.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div key={feature.label} className="group" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*0.1}}>
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

      <section id="cadastro" className="py-24 lg:py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-8 max-w-3xl relative z-10">
          <motion.div className="text-center" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}>
            <Badge variant="secondary" className="mb-4">Pronto para comecar?</Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Transforme sua oficina <span className="vitalcar-text-gradient">hoje mesmo</span>
            </h2>
            <p className="text-lg text-foreground/70 mb-10 max-w-2xl mx-auto">14 dias gratis. Sem cartao de credito. Cancele quando quiser. Junte-se a 247+ oficinas que ja evoluiram.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 shadow-[4px_4px_0_hsl(var(--vitalcar-yellow))] text-lg px-8 py-6 font-semibold w-full sm:w-auto">Criar Minha Conta Gratis</Button>
              <Button variant="outline" size="lg" className="border-foreground/30 text-foreground hover:bg-foreground/10 hover:border-foreground/50 text-lg px-8 py-6 font-semibold w-full sm:w-auto">Agendar Demo com Especialista</Button>
            </div>
            <p className="mt-6 text-sm text-foreground/50">Ao continuar, voce concorda com nossos <a href="/termos" className="underline hover:text-foreground">Termos</a> e <a href="/privacidade" className="underline hover:text-foreground">Privacidade</a></p>
          </motion.div>
        </div>
      </section>
    </>
  )
}