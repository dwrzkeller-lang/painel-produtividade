#!/usr/bin/env node
/**
 * GERADOR DOS DADOS FICTÍCIOS
 * ---------------------------------------------------------------------------
 * Cria assets/demo/dados-ficticios.js: 4 contratos inventados (3 acima da
 * meta, 1 abaixo), equipes, produção diária dos últimos 3 meses, cards de
 * equipe e o orçamento do ano (orçamento, forecast e realizado) usado pelo
 * Acompanhamento Gerencial. Todos os números são inventados.
 *
 * A produção é lançada PELO PRÓPRIO PAINEL (planilha importada no Editor do
 * Projeto num Chrome sem janela), para ficar no mesmo formato do uso real.
 * O arquivo gerado já vai dentro do projeto: o painel abre com os dados
 * prontos, sem gerar nada na hora.
 *
 * Uso:  npm run gerar-dados                (produção até ontem)
 *       npm run gerar-dados -- 2026-09-25  (produção até a data informada)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperarCapa, dorme } from './lib/navegador.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'assets/demo/dados-ficticios.js');
await import(pathToFileURL(path.join(RAIZ, 'assets/gerencial/01-calculo.js')).href);
const G = globalThis.PPGerencial;

/* ── Datas ─────────────────────────────────────────────────────────── */
const argData = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const hoje = new Date();
let FIM = argData ? new Date(argData + 'T12:00:00') : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 12);
while (FIM.getDay() === 0 || FIM.getDay() === 6) FIM = new Date(FIM.getFullYear(), FIM.getMonth(), FIM.getDate() - 1, 12);
const INICIO = new Date(FIM.getFullYear(), FIM.getMonth() - 2, 1, 12);
const ANO = FIM.getFullYear();
const MES_ATUAL = FIM.getMonth();           /* 0 a 11 */
const FECHADOS = MES_ATUAL;                 /* meses fechados: janeiro até o mês anterior */

/* ── Contas de demonstração (senha única: demo123) ─────────────────── */
const CONTAS = {
  'admin@demo.com': { uid: 'demo-admin', senha: 'demo123', nome: 'Administrador Demo', role: 'admin', projectIds: [] },
  'diretoria@demo.com': { uid: 'demo-diretoria', senha: 'demo123', nome: 'Diretoria Demo', role: 'ceo', projectIds: [] },
  'gerente@demo.com': { uid: 'demo-gerente', senha: 'demo123', nome: 'Gerente Regional', role: 'gerente', verExecutivo: true, projectIds: ['contrato-alfa', 'contrato-beta', 'contrato-gama', 'contrato-delta'] },
  'controller@demo.com': { uid: 'demo-controller', senha: 'demo123', nome: 'Controller Norte Sul', role: 'controller', verExecutivo: true, projectIds: ['contrato-alfa', 'contrato-beta'] }
};

/* ── Números pseudoaleatórios reproduzíveis ────────────────────────── */
let semente = 20260927;
const sorteio = () => { semente = (semente * 48271) % 2147483647; return semente / 2147483647; };
const entre = (a, b) => a + (b - a) * sorteio();
const escolha = (lista) => lista[Math.floor(sorteio() * lista.length)];
const r2 = (v) => Math.round(v * 100) / 100;

/* ── Calendário ────────────────────────────────────────────────────── */
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(ano, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function feriado(d) {
  const dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  if (['01/01', '21/04', '01/05', '07/09', '12/10', '02/11', '15/11', '20/11', '25/12'].includes(dd)) return true;
  const p = pascoa(d.getFullYear()); const sexta = new Date(p.getFullYear(), p.getMonth(), p.getDate() - 2);
  return sexta.getDate() === d.getDate() && sexta.getMonth() === d.getMonth();
}
const util = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !feriado(d);
const br = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
function diasUteisDoMes(ano, mes) { let n = 0; for (let d = new Date(ano, mes, 1, 12); d.getMonth() === mes; d.setDate(d.getDate() + 1)) if (util(d)) n++; return n; }
const meses = [];
for (let d = new Date(INICIO); d <= FIM; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) meses.push({ ano: d.getFullYear(), mes: d.getMonth() });

/* ── Contratos e equipes (tudo inventado) ──────────────────────────── */
/* Metas mensais por equipe na casa das centenas de milhares: cada contrato
   fecha o mês na casa dos milhões (Alfa 5,6 mi, Beta 3,7 mi, Gama 3,3 mi,
   Delta 3,2 mi). Produção, orçamento e custos saem todos dessas metas.
   Toda meta é múltiplo de 483 (= 21 × 23): dividida pelos dias úteis de
   julho (23), agosto (21) e setembro (21) dá meta do dia exata em centavos,
   e a meta acumulada sai igual pelas duas contas do painel (meta do dia ×
   dias trabalhados, ou meta do mês ÷ dias úteis × dias trabalhados). */
const faixa = (pref, de, ate, metaMes, base) => Array.from({ length: ate - de + 1 }, (_, i) => ({ nome: pref + String(de + i).padStart(2, '0'), metaMes, base }));
const CONTRATOS = [
  { id: 'contrato-alfa', nome: 'Contrato Alfa', regional: 'Norte', taxa: 0.8575, desempenho: 1.05, sobreCusto: 1.0,
    servicos: ['Manutenção preventiva', 'Troca de poste', 'Substituição de cruzeta', 'Troca de isolador', 'Religação'],
    equipes: [...faixa('MN-', 1, 8, 483000, 'BASE NORTE'), ...faixa('MN-AV', 1, 4, 434700, 'BASE NORTE AVANÇADA')],
    ritmo: [1.14, 1.02, 1.10, 0.97, 1.18, 1.05, 1.09, 0.95, 1.12, 1.06, 1.03, 1.08] },
  { id: 'contrato-beta', nome: 'Contrato Beta', regional: 'Sul', taxa: 0.8675, desempenho: 1.07, sobreCusto: 0.99,
    servicos: ['Ligação nova', 'Lançamento de cabo', 'Extensão de rede', 'Instalação de transformador', 'Padrão de entrada'],
    equipes: [...faixa('EX-', 1, 7, 386400, 'BASE SUL'), ...faixa('EX-', 8, 10, 338100, 'BASE SUL')],
    ritmo: [1.21, 1.08, 1.03, 1.14, 1.00, 1.11, 1.17, 0.99, 1.06, 1.10] },
  { id: 'contrato-gama', nome: 'Contrato Gama', regional: 'Oeste', taxa: 0.8625, desempenho: 0.89, sobreCusto: 1.03,
    curva: [1.00, 0.99, 0.97, 0.95, 0.93, 0.91, 0.89, 0.88, 0.90, 0.92, 0.94, 0.95],
    servicos: ['Poda de árvore', 'Roçada de faixa', 'Limpeza de faixa de servidão', 'Poda com linha energizada'],
    equipes: faixa('PD-', 1, 9, 362250, 'BASE OESTE'),
    ritmo: [0.93, 0.84, 0.98, 0.79, 0.91, 0.86, 1.02, 0.81, 0.90] },
  { id: 'contrato-delta', nome: 'Contrato Delta', regional: 'Leste', taxa: 0.8550, desempenho: 1.03, sobreCusto: 1.0,
    servicos: ['Inspeção de rede', 'Religação', 'Corte por inadimplência', 'Aferição de medidor', 'Troca de medidor'],
    equipes: faixa('RL-', 1, 11, 289800, 'BASE LESTE'),
    ritmo: [1.10, 1.04, 1.13, 0.99, 1.07, 1.11, 1.02, 1.08, 1.05, 1.12, 1.04] }
];

function planilha(ct) {
  const linhas = [['Data', 'Equipe', 'Encarregado', 'Serviço', 'Valor bruto', 'Meta mês', 'Meta dia', 'Base', 'Observação']];
  const fmt = (n) => n.toFixed(2).replace('.', ',');
  for (const { ano, mes } of meses) {
    const du = diasUteisDoMes(ano, mes);
    for (let d = new Date(ano, mes, 1, 12); d.getMonth() === mes && d <= FIM; d.setDate(d.getDate() + 1)) {
      if (!util(d)) continue;
      ct.equipes.forEach((eq, i) => {
        const metaDia = Math.round(eq.metaMes / du * 100) / 100;
        const r = sorteio();
        let fator = ct.ritmo[i] * entre(0.72, 1.28);
        let obs = '';
        if (r < 0.03) { fator = 0; obs = escolha(['Caminhão em manutenção', 'Chuva forte, serviço suspenso', 'Treinamento de segurança']); }
        else if (r < 0.055) { fator *= 1.6; obs = 'Serviço de alto valor'; }
        else if (fator >= 1.08) obs = sorteio() < 0.4 ? 'Meta batida' : '';
        else if (fator < 0.75) obs = escolha(['Aguardando material', 'Deslocamento longo', 'Apoio a outra equipe', 'Chuva no período da tarde']);
        const valor = Math.round(metaDia * fator);
        linhas.push([br(d), eq.nome, 'Encarregado ' + String(i + 1).padStart(2, '0'), escolha(ct.servicos), fmt(valor), fmt(eq.metaMes), fmt(metaDia), eq.base, obs]);
      });
    }
  }
  return linhas.map((l) => l.join(';')).join('\r\n');
}

/* ── Orçamento do ano ──────────────────────────────────────────────── */
const SAZONAL = [0.90, 0.93, 0.98, 1.00, 1.02, 0.99, 1.00, 1.00, 1.00, 1.03, 1.02, 0.94];
const CUSTO = { pessoal: 0.43, frota: 0.11, materiais: 0.09, terceiros: 0.07, indiretas: 0.08 };
function orcamento(ct, producaoMes) {
  const doze = () => Array(12).fill(0);
  const bud = {}, fc = {}, real = {};
  G.ENTRADAS.forEach((k) => { bud[k] = doze(); fc[k] = doze(); real[k] = doze(); });
  const metaMes = ct.equipes.reduce((s, e) => s + e.metaMes, 0);
  for (let m = 0; m < 12; m++) {
    const rb = r2(metaMes * SAZONAL[m]);
    const rl = rb * ct.taxa;
    bud.receitaBruta[m] = rb;
    Object.keys(CUSTO).forEach((k) => { bud[k][m] = r2(rl * CUSTO[k] * entre(0.97, 1.03)); });
    /* realizado dos meses fechados */
    if (m < FECHADOS) {
      const perf = ct.curva ? ct.curva[m] * entre(0.99, 1.01) : ct.desempenho * entre(0.98, 1.02);
      const recReal = producaoMes[m] > 0 ? producaoMes[m] : r2(rb * perf);
      const vol = recReal / rb;
      real.receitaBruta[m] = producaoMes[m] > 0 ? 0 : recReal; /* 0 = vale a produção lançada no painel */
      real.pessoal[m] = r2(bud.pessoal[m] * Math.pow(vol, 0.6) * ct.sobreCusto * entre(0.99, 1.02));
      real.frota[m] = r2(bud.frota[m] * Math.pow(vol, 0.7) * ct.sobreCusto * entre(0.97, 1.04));
      real.materiais[m] = r2(bud.materiais[m] * vol * entre(0.96, 1.04));
      real.terceiros[m] = r2(bud.terceiros[m] * vol * ct.sobreCusto * entre(0.96, 1.04));
      real.indiretas[m] = r2(bud.indiretas[m] * entre(0.98, 1.02));
    }
    /* forecast 9+3: meses fechados como estimados na revisão; os que faltam, no ritmo recente */
    const tendencia = ct.curva ? ct.curva[m] : ct.desempenho;
    const alvo = m < FECHADOS ? (1 + (tendencia - 1) * entre(0.4, 0.8)) : tendencia * entre(0.99, 1.01);
    fc.receitaBruta[m] = r2(rb * alvo);
    Object.keys(CUSTO).forEach((k) => {
      const escala = k === 'indiretas' ? 1 : k === 'pessoal' ? Math.pow(alvo, 0.6) : alvo;
      fc[k][m] = r2(bud[k][m] * escala * (m >= FECHADOS ? ct.sobreCusto : 1));
    });
  }
  return { ano: ANO, forecastVersao: '9+3', mesFechado: FECHADOS, budget: bud, forecast: fc, realizado: real, justificativas: [] };
}
const JUSTIFICATIVAS = {
  receitaLiquida: [
    'Chuva acima da média reduziu as frentes de poda em {mes}. Recuperação com equipe extra aos sábados.',
    'Duas equipes paradas por manutenção de caminhão cesto. Locação de dois veículos até o fim do trimestre.',
    'Liberação de faixa de servidão atrasada pelo cliente. Programação refeita com frentes alternativas.'
  ],
  ebitda: [
    'Horas extras para recuperar a programação e locação de frota acima do orçado. Revisão da escala com o RH.',
    'Custo de terceiros acima do previsto por serviço de apoio emergencial. Renegociação do contrato de apoio.',
    'Queda de receita não acompanhada pelos custos fixos da base. Remanejamento de uma equipe para o Contrato Delta.'
  ]
};

/* ── Rodando o painel ──────────────────────────────────────────────── */
const documentosIniciais = {};
for (const [email, c] of Object.entries(CONTAS)) {
  documentosIniciais['users/' + c.uid] = { nome: c.nome, email, role: c.role, ativo: true, projectIds: c.projectIds, ...(c.verExecutivo ? { verExecutivo: true } : {}) };
}
const contas = Object.fromEntries(Object.entries(CONTAS).map(([e, c]) => [e, { uid: c.uid, senha: c.senha }]));
documentosIniciais.__contasDemo = contas;

/* O painel carrega a semente atual e, se a marca de versão guardada no
   navegador for diferente, troca a nuvem inteira por ela. O gerador marca a
   versão atual como já vista para começar de uma nuvem só com as contas. */
let versaoAtual = 'gerador';
try { versaoAtual = (fs.readFileSync(SAIDA, 'utf8').match(/"gerada":"([^"]+)"/) || [])[1] || versaoAtual; } catch (e) { }
console.log('Dias úteis por mês: ' + meses.map((m) => (m.mes + 1) + '/' + m.ano + ' = ' + diasUteisDoMes(m.ano, m.mes)).join(', '));
console.log('Produção: ' + br(INICIO) + ' a ' + br(FIM) + ' · meses fechados no orçamento: ' + FECHADOS);
const nav = await abrir(RAIZ, {
  aceitarConfirmacoes: true,
  antes: 'try{if(!sessionStorage.getItem("pp-gerador")){sessionStorage.setItem("pp-gerador","1");localStorage.clear();' +
    'localStorage.setItem("pp-demo-semente-gerada",' + JSON.stringify(versaoAtual) + ');' +
    'localStorage.setItem("pp-demo-nuvem-v1",' + JSON.stringify(JSON.stringify(documentosIniciais)) + ');}}catch(e){}'
});
const passo = async (nome, fn) => {
  const antes = nav.erros().length;
  const r = await fn();
  const novos = nav.erros().slice(antes).filter((e) => !/favicon/.test(e));
  if (novos.length) throw new Error(nome + ': ' + novos.join(' | '));
  console.log('  ok  ' + nome + (r !== undefined ? ' → ' + JSON.stringify(r).slice(0, 140) : ''));
  return r;
};
try {
  await nav.avaliar('location.reload()'); await dorme(2500);
  await passo('entrar como administrador', () => nav.avaliar('window.ppDemo.entrar("admin@demo.com").then(function(){return "ok"})'));
  await dorme(2500);
  for (const ct of CONTRATOS) {
    const texto = planilha(ct);
    await passo('abrir ' + ct.nome, async () => { await nav.avaliar('window._pickProject("' + ct.id + '")'); return esperarCapa(nav); });
    await dorme(1500);
    await passo('importar a produção de ' + ct.nome + ' (' + (texto.split('\n').length - 1) + ' linhas)', async () => {
      await nav.avaliar('openEditor()'); await dorme(1200);
      const r = await nav.avaliar('window.importCsvText(' + JSON.stringify(texto) + ')');
      await dorme(2500);
      return r === false ? 'FALHOU' : 'ok';
    });
    await passo('dias úteis, taxa líquida e salvar ' + ct.nome, async () => {
      await nav.avaliar('try{ppGerarDiasUteisMesAtual()}catch(e){}'); await dorme(600);
      await nav.avaliar('(function(){var t=document.getElementById("edTaxaLiquida");if(t){t.value="' + ct.taxa + '";t.dispatchEvent(new Event("input",{bubbles:true}));t.dispatchEvent(new Event("change",{bubbles:true}));}})()'); await dorme(300);
      await nav.avaliar('applyEditor(true)'); await dorme(2500);
      return nav.avaliar('({equipes:(equipes||[]).length, taxa: typeof fatorLiquido==="function"?fatorLiquido():null})');
    });
    await nav.avaliar('try{voltarAoPicker()}catch(e){}'); await dorme(1200);
  }
  await dorme(1500);
  const loja = JSON.parse(await nav.avaliar('localStorage.getItem("pp-demo-nuvem-v1")'));
  delete loja.__contasDemo;
  for (const k of Object.keys(loja)) if (/\/presence\//.test(k)) delete loja[k];

  const STATUS = ['Em dia', 'Atenção', 'Crítico', 'Em recuperação'];
  for (const ct of CONTRATOS) {
    const chave = Object.keys(loja).find((k) => k.endsWith('/projects/' + ct.id));
    const doc = loja[chave]; if (!doc) throw new Error(ct.nome + ' não foi gravado');
    /* Orçamento do ano: a receita realizada de julho e agosto é a produção lançada */
    const producaoMes = G.producaoPorMes(doc.historico || [], ANO).valores;
    const orc = orcamento(ct, producaoMes);
    const c = G.montarContrato({ id: ct.id, nome: ct.nome, config: Object.assign({}, doc.config, { orcamento: orc }), historico: doc.historico });
    const pend = G.pendencias(c).sort((a, b) => a.mes - b.mes);
    pend.forEach((p, i) => {
      if (i === pend.length - 1 && pend.length > 1) return; /* o desvio mais recente fica pendente */
      const txt = escolha(JUSTIFICATIVAS[p.linha]).replace('{mes}', G.MESES_LONGOS[p.mes]);
      orc.justificativas.push({ mes: p.mes + 1, linha: p.linha, texto: txt, responsavel: 'Gerência Regional ' + ct.regional,
        prazo: br(new Date(ANO, p.mes + 2, 15, 12)) });
    });
    doc.config.orcamento = orc;
    doc.teamCards = doc.teamCards || {};
    ct.equipes.forEach((eq, i) => {
      const bom = ct.ritmo[i] >= 1;
      doc.teamCards[eq.nome] = Object.assign({}, doc.teamCards[eq.nome] || {}, {
        nomeEquipe: eq.nome, base: eq.base, lider: 'Líder ' + String(i + 1).padStart(2, '0'), supervisor: 'Supervisão ' + ct.regional,
        responsavel: 'Coordenação de campo', servico: ct.servicos[i % ct.servicos.length], status: bom ? 'Em dia' : STATUS[1 + (i % 3)],
        diagnostico: bom ? 'Produção acima da meta, sem retrabalho.' : 'Produção abaixo da meta nas duas últimas semanas.',
        acao: bom ? 'Manter a programação.' : 'Reforço de material na base e revisão da rota diária.',
        prazo: br(new Date(FIM.getFullYear(), FIM.getMonth(), FIM.getDate() + 7, 12)), resultado: bom ? 'Meta mantida' : 'Em acompanhamento',
        feedback: 'Acompanhamento semanal com a supervisão.', fotos: [], dataAcao: br(FIM)
      });
    });
    const resumo = G.recorte(c, 'ytd', FECHADOS - 1);
    console.log('  ' + ct.nome.padEnd(15) + ' receita líquida real × orçamento no ano: ' + ((resumo.real.receitaLiquida / resumo.budget.receitaLiquida - 1) * 100).toFixed(1) + '% · EBITDA: ' + ((resumo.real.ebitda / resumo.budget.ebitda - 1) * 100).toFixed(1) + '% · pendências: ' + pend.length);
  }
  /* Acessos e salvamentos recentes, para a Central de Administração */
  const agora = Date.now();
  Object.entries(CONTAS).forEach(([email, c], i) => {
    for (let s = 0; s < 3 + i; s++) {
      const entrada = agora - (s * 26 + i * 5 + 2) * 3600e3;
      const tela = s % 2 ? 'Acompanhamento Gerencial' : CONTRATOS[s % 4].nome;
      loja['painel_produtividade/base/accessLog/demo-' + c.uid + '-' + s] = { uid: c.uid, user: email, nome: c.nome, role: c.role,
        entradaMs: entrada, ultimaAtividadeMs: entrada + (20 + s * 7) * 60e3, saidaMs: entrada + (22 + s * 7) * 60e3,
        entradaISO: new Date(entrada).toISOString(), telaNome: tela, telasVisitadas: ['Escolha de contratos', tela] };
    }
    const doc = loja['users/' + c.uid]; if (doc) doc.ultimoAcessoMs = agora - (i * 5 + 2) * 3600e3;
  });
  CONTRATOS.forEach((ct, k) => {
    for (let s = 0; s < 5; s++) {
      const ms = agora - (s * 20 + k * 7 + 3) * 3600e3;
      loja['painel_produtividade/base/editLog/demo-' + ct.id + '-' + s] = { projectId: ct.id, projectName: ct.nome, user: k < 2 ? 'controller@demo.com' : 'admin@demo.com', role: k < 2 ? 'controller' : 'admin', at: new Date(ms).toISOString(), atMs: ms };
    }
  });

  const gerada = new Date().toISOString();
  const texto = '/* Dados fictícios do Painel de Produtividade. Todos os números são inventados.\n   Gerado por scripts/gerar-dados-ficticios.mjs em ' + gerada.slice(0, 10) +
    ' (produção de ' + br(INICIO) + ' a ' + br(FIM) + '). */\nwindow.PP_DEMO_SEMENTE = ' +
    JSON.stringify({ versao: 2, gerada, periodo: { inicio: br(INICIO), fim: br(FIM) }, contas, documentos: loja }) + ';\n';
  fs.writeFileSync(SAIDA, texto, 'utf8');
  console.log('\nDados gravados: ' + path.relative(RAIZ, SAIDA) + ' (' + Math.round(texto.length / 1024) + ' KB, ' + Object.keys(loja).length + ' documentos)');
} catch (e) {
  console.error('\nFALHOU: ' + e.message);
  process.exitCode = 1;
} finally {
  await nav.fechar();
}
