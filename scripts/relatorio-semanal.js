// ============================================================
//  VITALCAR · RELATÓRIO SEMANAL AUTOMÁTICO
//  Roda via GitHub Actions todo domingo às 20h (Brasília)
//  Envia resumo da semana via WhatsApp (CallMeBot)
// ============================================================

const admin = require('firebase-admin');

const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;
const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY;

if (!SERVICE_ACCOUNT || !CALLMEBOT_PHONE || !CALLMEBOT_API_KEY) {
  console.error('❌ Faltam secrets. Verifique FIREBASE_SERVICE_ACCOUNT, CALLMEBOT_PHONE e CALLMEBOT_API_KEY.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT);
} catch (err) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT não é um JSON válido:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function formatarDataBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ============================================================
// Semana fixa: segunda → domingo da semana que acabou.
// Robusto contra atraso do cron (roda segunda 00:30 ainda pega a semana certa).
// ============================================================
function calcularPeriodoSemana() {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=dom, 1=seg, ..., 6=sáb

  const domingo = new Date(hoje);
  domingo.setDate(hoje.getDate() - diaSemana);

  const segunda = new Date(domingo);
  segunda.setDate(domingo.getDate() - 6);

  return {
    inicio: toISODate(segunda),
    fim: toISODate(domingo)
  };
}

function nomeDiaSemana(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[d.getDay()];
}

async function buscarOrdensDaSemana(periodo) {
  console.log(`📥 Buscando ordens de ${periodo.inicio} até ${periodo.fim}...`);

  const snapshot = await db.collection('ordens')
    .where('entrada', '>=', periodo.inicio)
    .where('entrada', '<=', periodo.fim)
    .get();

  const ordens = [];
  snapshot.forEach(doc => {
    ordens.push({ id: doc.id, ...doc.data() });
  });

  console.log(`✓ Encontradas ${ordens.length} ordens no período`);
  return ordens;
}

async function carregarCatalogoServicos() {
  try {
    const snap = await db.collection('config').doc('servicos').get();
    if (snap.exists && Array.isArray(snap.data().lista)) {
      const mapa = {};
      snap.data().lista.forEach(s => { if (s && s.id) mapa[s.id] = s.nome || s.id; });
      console.log(`✓ Catálogo de serviços carregado (${Object.keys(mapa).length} itens)`);
      return mapa;
    }
  } catch (err) {
    console.warn('⚠️ Não consegui ler o catálogo de serviços:', err.message);
  }
  return {};
}

function calcularEstatisticas(ordens, catalogo) {
  catalogo = catalogo || {};
  const naoCanceladas = ordens.filter(o => o.status && o.status !== 'cancelado');
  const pagas = naoCanceladas.filter(o => o.pago === 'pago');
  const pendentes = naoCanceladas.filter(o => o.pago !== 'pago');

  const faturamento = pagas.reduce((s, o) => s + (o.valor || 0), 0);
  const aReceber = pendentes.reduce((s, o) => s + (o.valor || 0), 0);
  const gorjetas = naoCanceladas.reduce((s, o) => s + (o.gorjeta || 0), 0);
  const ticketMedio = pagas.length ? faturamento / pagas.length : 0;

  const contagemServicos = {};
  const contagemClientes = {};

  naoCanceladas.forEach(o => {
    const nomes = [];
    if (Array.isArray(o.servicosIds) && o.servicosIds.length) {
      o.servicosIds.forEach(id => { nomes.push(catalogo[id] || id); });
    } else if (typeof o.servicos === 'string' && o.servicos.trim()) {
      o.servicos.split('+').forEach(s => { const n = s.trim(); if (n) nomes.push(n); });
    }
    nomes.forEach(nome => { contagemServicos[nome] = (contagemServicos[nome] || 0) + 1; });

    if (o.nome) {
      contagemClientes[o.nome] = (contagemClientes[o.nome] || 0) + 1;
    }
  });

  const topServicos = Object.entries(contagemServicos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const clientesRecorrentes = Object.entries(contagemClientes)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const porDia = {};
  naoCanceladas.forEach(o => {
    if (o.entrada) {
      const dia = nomeDiaSemana(o.entrada);
      porDia[dia] = (porDia[dia] || 0) + 1;
    }
  });

  const porStatus = {
    em_andamento: ordens.filter(o => o.status === 'em_andamento').length,
    pronto: ordens.filter(o => o.status === 'pronto').length,
    entregue: ordens.filter(o => o.status === 'entregue').length,
    cancelado: ordens.filter(o => o.status === 'cancelado').length
  };

  return {
    total: ordens.length,
    naoCanceladas: naoCanceladas.length,
    faturamento,
    aReceber,
    gorjetas,
    ticketMedio,
    topServicos,
    clientesRecorrentes,
    porDia,
    porStatus
  };
}

function montarMensagem(periodo, stats, ordens) {
  const linhas = [];

  linhas.push('🚗 *VITALCAR · RELATÓRIO SEMANAL*');
  linhas.push('━━━━━━━━━━━━━━━━━━━━');
  linhas.push(`📅 *Período:* ${formatarDataBR(periodo.inicio)} → ${formatarDataBR(periodo.fim)}`);
  linhas.push('');

  linhas.push('💰 *RESUMO FINANCEIRO*');
  linhas.push(`• Faturamento: *R$ ${stats.faturamento.toFixed(2).replace('.', ',')}*`);
  linhas.push(`• A receber: R$ ${stats.aReceber.toFixed(2).replace('.', ',')}`);
  if (stats.gorjetas > 0) {
    linhas.push(`• Gorjetas: R$ ${stats.gorjetas.toFixed(2).replace('.', ',')} 💝`);
  }
  linhas.push(`• Ticket médio: R$ ${stats.ticketMedio.toFixed(2).replace('.', ',')}`);
  linhas.push('');

  linhas.push('📋 *ORDENS*');
  linhas.push(`• Total: *${stats.total}*`);
  if (stats.porStatus.entregue > 0) linhas.push(`• Entregues: ${stats.porStatus.entregue}`);
  if (stats.porStatus.pronto > 0) linhas.push(`• Prontas: ${stats.porStatus.pronto}`);
  if (stats.porStatus.em_andamento > 0) linhas.push(`• Em andamento: ${stats.porStatus.em_andamento}`);
  if (stats.porStatus.cancelado > 0) linhas.push(`• Canceladas: ${stats.porStatus.cancelado}`);
  linhas.push('');

  if (stats.topServicos.length) {
    linhas.push('🏆 *SERVIÇOS MAIS VENDIDOS*');
    stats.topServicos.forEach(([id, qtd], i) => {
      const medalha = ['🥇', '🥈', '🥉'][i] || '•';
      linhas.push(`${medalha} ${id}: *${qtd}x*`);
    });
    linhas.push('');
  }

  if (stats.clientesRecorrentes.length) {
    linhas.push('👥 *CLIENTES DA SEMANA*');
    stats.clientesRecorrentes.slice(0, 5).forEach(([nome, count]) => {
      linhas.push(`• ${nome} (${count}x)`);
    });
    linhas.push('');
  }

  const dias = Object.entries(stats.porDia).sort((a, b) => b[1] - a[1]);
  if (dias.length) {
    linhas.push('📊 *MOVIMENTO POR DIA*');
    dias.forEach(([dia, qtd]) => {
      const barra = '█'.repeat(Math.min(qtd, 10));
      linhas.push(`${dia.padEnd(9)} ${barra} ${qtd}`);
    });
    linhas.push('');
  }

  const ordensPagas = ordens.filter(o => o.pago === 'pago' && o.status !== 'cancelado');
  if (ordensPagas.length) {
    const maiorVenda = ordensPagas.reduce((max, o) => (o.valor || 0) > (max.valor || 0) ? o : max, ordensPagas[0]);
    linhas.push('⭐ *DESTAQUE DA SEMANA*');
    linhas.push(`Maior venda: *R$ ${(maiorVenda.valor || 0).toFixed(2).replace('.', ',')}*`);
    linhas.push(`(${maiorVenda.veiculo || '—'} — ${maiorVenda.nome || '—'})`);
    linhas.push('');
  }

  linhas.push('━━━━━━━━━━━━━━━━━━━━');
  linhas.push('💡 Bora pra próxima semana!');
  linhas.push('🔗 vitalcar.pages.dev');

  return linhas.join('\n');
}

async function enviarWhatsApp(mensagem) {
  console.log('📱 Enviando relatório via WhatsApp...');

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', CALLMEBOT_PHONE);
  url.searchParams.set('text', mensagem);
  url.searchParams.set('apikey', CALLMEBOT_API_KEY);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`CallMeBot retornou ${res.status}: ${txt}`);
  }

  const txt = await res.text();
  console.log('✓ Resposta do CallMeBot:', txt.slice(0, 200));
}

async function main() {
  try {
    console.log('🚀 Iniciando relatório semanal Vitalcar...');

    const periodo = calcularPeriodoSemana();
    const catalogo = await carregarCatalogoServicos();
    const ordens = await buscarOrdensDaSemana(periodo);

    if (!ordens.length) {
      console.log('ℹ️ Nenhuma ordem no período. Enviando mensagem vazia...');
      const msg = `🚗 *VITALCAR · RELATÓRIO SEMANAL*\n━━━━━━━━━━━━━━━━━━━━\n📅 *Período:* ${formatarDataBR(periodo.inicio)} → ${formatarDataBR(periodo.fim)}\n\n📭 Nenhuma ordem registrada nesta semana.\n\n💡 Bora agitar a próxima! 🔥`;
      await enviarWhatsApp(msg);
      process.exit(0);
    }

    const stats = calcularEstatisticas(ordens, catalogo);
    const mensagem = montarMensagem(periodo, stats, ordens);

    console.log('\n📄 Mensagem montada:\n');
    console.log(mensagem);
    console.log('');

    await enviarWhatsApp(mensagem);

    console.log('✅ Relatório semanal enviado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro fatal:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
