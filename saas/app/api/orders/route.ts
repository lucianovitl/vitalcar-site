// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';

const OrderSchema = z.object({
  nome: z.string().min(2).max(120),
  telefone: z.string().regex(/^55[1-9]{2}9?[0-9]{8}$/),
  veiculo: z.string().min(2).max(120),
  placa: z.string().max(10).optional(),
  tipoVeiculo: z.enum(['hatch', 'sedan', 'pickup', 'moto']),
  servico: z.string().min(2).max(400),
  valor: z.number().min(0).max(300000),
  valorBase: z.number().min(0).max(300000),
  desconto: z.number().min(0).max(300000),
  descontoValor: z.number().min(0).max(300000),
  descontoTipo: z.enum(['porcento', 'valor', '']).optional(),
  entrada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saida: z.string().optional(),
  status: z.enum(['pendente', 'em_andamento', 'pronto', 'entregue', 'cancelado']).default('pendente'),
  origem: z.literal('site'),
  origemContato: z.string().max(40).optional(),
  formaPagamento: z.string().max(30).optional(),
  valorRecebido: z.number().min(0).default(0),
  troco: z.number().min(0).default(0),
  gorjeta: z.number().min(0).default(0),
  pago: z.enum(['pendente', 'pago']).default('pendente'),
  obs: z.string().max(400).optional(),
  periodo: z.string().max(30).optional(),
  numero: z.string().regex(/^[0-9]{4}-[A-Z0-9]{4,10}$/),
  uid: z.literal('anon'),
  criadoEm: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = OrderSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const docRef = await db.collection('ordens').add({
      ...parsed.data,
      origem: 'site',
      uid: 'anon',
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Erro ao criar ordem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const numero = searchParams.get('numero');
    
    if (!numero) {
      return NextResponse.json({ error: 'Protocolo não informado' }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection('ordens')
      .where('numero', '==', numero)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });
    }
    
    const doc = snapshot.docs[0];
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Erro ao buscar ordem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}