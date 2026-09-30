/* FOTO DOS NÚMEROS: rode com `npm run foto`
   ---------------------------------------------------------------------------
   POR QUE ISTO EXISTE: antes de uma rodada grande de correções, o dono do
   produto pediu que os números da tela fossem FOTOGRAFADOS antes e CONFERIDOS
   depois, para provar que nenhuma correção mexeu em cálculo.

   COMO FUNCIONA: reproduz as contas do painel usando (1) os VALORES REAIS que
   estão hoje na tela, lidos das telas conferidas com o usuário em 18/08/2026, e
   (2) as fórmulas RECORTADAS dos arquivos-fonte de verdade. Não é uma cópia da
   lógica: os trechos vêm de assets/js, então se alguém
   mudar a conta no arquivo, é a conta nova que entra na foto: e a comparação
   acusa.

   USO:
     node scripts/foto-numeros.mjs --salvar   grava a foto de referência
     node scripts/foto-numeros.mjs            compara com a referência

   Qualquer valor diferente faz o comando falhar mostrando o antes e o depois. */
import fs from 'node:fs';

const REF = 'scripts/foto-numeros.ref.json';
const salvar = process.argv.includes('--salvar');

const src19 = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');

function faixa(fonte, de, ate, nome) {
  const i = fonte.indexOf(de);
  const j = fonte.indexOf(ate, i);
  if (i < 0 || j < 0) throw new Error('não achei o trecho: ' + nome);
  return fonte.slice(i, j);
}

/* Trechos de cálculo recortados do arquivo real. */
/* Meta de fim de semana de TESTE: o código do painel não traz valor de contrato. */
const SAB_TESTE = 60000;
const blocoFds = faixa(src19, 'var SEMENTE_FDS = {', '/* Soma as metas dos dias marcados', 'regra do fim de semana').replace('var SEMENTE_FDS = {};', "var SEMENTE_FDS = { 'contrato-alfa': { sab: " + SAB_TESTE + ", dom: 0 } };").replace('var CONSERTO_FDS_DUPLICADO = {};', "var CONSERTO_FDS_DUPLICADO = { 'contrato-alfa': true };");
const blocoMetaEquipe = faixa(src19, 'window.ppResumoDiasContados = function', '/* ── PRODUÇÃO ACUMULADA', 'meta da equipe');
const blocoMetaDia = faixa(src19, 'window.ppMetaDiaDoEstado = function', '/* Exposto para inspeção', 'meta do dia do estado');
/* REGRA DE FERIADO (09/09/2026). Sem este recorte, as funcoes fotografadas
   passaram a chamar descontoDeFeriados/ehFeriadoPorCsv sem que existissem no
   escopo do teste, e devolviam null. A foto acusou na hora: e e exatamente
   para isso que ela serve: toda dependencia nova das contas precisa entrar
   aqui, senao o teste mede um recorte incompleto em vez da realidade. */
const blocoFeriados = faixa(src19, 'function pascoaDe(ano) {', 'function contarDiasCalculo(', 'regra de feriado');

function motor({ dia, projeto, cfg, contexto }) {
  const escopo = {
    window: { dailyKey: () => dia, currentProjectId: projeto || '' },
    chaveMes: (a, m) => a + '-' + String(m).padStart(2, '0'),
    n: (v) => { const x = Number(v); return isFinite(x) ? x : 0; },
    memo: (k, f) => f(),
    somaTaxasDia: () => (contexto && contexto.soma) || 0,
    contextoDoRender: () => contexto,
    getDailyBank: () => ({}),
    bancoDoCiclo: () => ({}),
    pesosDoEstado: () => null,
    idDoProjeto: () => projeto || '',
    ehSabado: (a, m, d) => new Date(a, m - 1, d).getDay() === 6,
    ehDomingo: (a, m, d) => new Date(a, m - 1, d).getDay() === 0,
    config: Object.assign({ dataReferencia: dia }, cfg || {}),
    equipes: [],
    CAMPO_CONFIG: 'ppDiasDoMes',
    VAZIO: 0
  };
  const nomes = Object.keys(escopo);
  const corpo = blocoFds + '\n' + blocoFeriados + '\n' + blocoMetaEquipe + '\n' + blocoMetaDia + '\n' +
    'return { metaAcumEquipe: window.ppMetaAcumuladaDaEquipe,' +
    ' metaDiaEstado: window.ppMetaDiaDoEstado,' +
    ' valorFds: valorFimDeSemana,' +
    ' resumoDias: window.ppResumoDiasContados };';
  return new Function(...nomes, corpo)(...nomes.map((k) => escopo[k]));
}

const foto = {};
const r2 = (x) => Math.round(x * 100) / 100;
const pct1 = (x) => Math.round(x * 1000) / 10;

/* ═══ 1. META ACUMULADA do painel de produtividade ═════════════════════════
   Alfa em 17/08/2026, validado pelo usuário: meta do CSV [valor],
   mais 3 sábados de R$ [valor] = R$ [valor] na tela. */
const ctxAlfa = { dias: { uteis: 11, sabados: 3, domingos: 0 }, soma: 12000, vSab: 6000, vDom: 0, motivo: '' };
const mAlfa = motor({ dia: '17/08/2026', projeto: 'contrato-alfa', contexto: ctxAlfa });
foto['alfa.metaAcumulada'] = mAlfa.metaAcumEquipe({ equipe: 'TOTAL', metaDia: 12000, metaAcumulada: 11 * 12000 });
foto['alfa.rodapeMeta'] = mAlfa.resumoDias();
foto['alfa.metaSabado'] = mAlfa.valorFds('sab');
foto['alfa.metaDomingo'] = mAlfa.valorFds('dom');

/* Contrato SEM meta de fim de semana: a meta do CSV passa intacta (null). */
const ctxCE = { dias: { uteis: 11, sabados: 3, domingos: 0 }, soma: 7000, vSab: 0, vDom: 0, motivo: '' };
const mCE = motor({ dia: '17/08/2026', projeto: 'contrato-gamma', contexto: ctxCE });
foto['gamma.metaAcumulada_naoMexe'] = mCE.metaAcumEquipe({ equipe: 'TOTAL', metaDia: 7000, metaAcumulada: 11 * 7000 });
foto['gamma.rodapeMeta'] = mCE.resumoDias();
foto['gamma.metaSabado'] = mCE.valorFds('sab');

/* ═══ 2. META DO DIA no gerencial: fim de semana manda por cima ════════════ */
const est = { config: {}, equipes: [{ equipe: 'A', metaDia: 100 }] };
foto['metaDia.diaUtil_deixaBaseDoForecast'] = mCE.metaDiaEstado(est, 'contrato-gamma', '17/08/2026');
foto['metaDia.sabadoSemMeta'] = mCE.metaDiaEstado(est, 'contrato-gamma', '15/08/2026');
foto['metaDia.domingoSemMeta'] = mCE.metaDiaEstado(est, 'contrato-gamma', '16/08/2026');
foto['metaDia.sabadoComMeta_alfa'] = mAlfa.metaDiaEstado(est, 'contrato-alfa', '15/08/2026');

/* ═══ 3. TABELAS DO GERENCIAL: valores inventados, com os mesmos sinais ═══ */
const contratos = [
  { nome: 'beta', brutaFc: 600000.00, dias: 23, liqAcum: 300000.00, liq: 250000.00, realDia: 16000.00 },
  { nome: 'alfa', brutaFc: 360000.00, dias: 21, liqAcum: 170000.00, liq: 120000.00, realDia: 7000.00 },
  { nome: 'gamma', brutaFc: 170000.00, dias: 21, liqAcum: 70000.00, liq: 75000.00, realDia: 6500.00 },
  { nome: 'ds', brutaFc: 30000.00, dias: 21, liqAcum: 16000.00, liq: 11000.00, realDia: 900.00 },
  { nome: 'delta', brutaFc: 125000.00, dias: 21, liqAcum: 53000.00, liq: 57000.00, realDia: 4600.00 },
  { nome: 'epsilon', brutaFc: 34000.00, dias: 21, liqAcum: 14000.00, liq: 15500.00, realDia: 1650.00 },
  { nome: 'soc', brutaFc: 580000.00, dias: 21, liqAcum: 276000.00, liq: 258000.00, realDia: 16100.00 }
];
let totLiqAcum = 0, totLiq = 0, totFcDia = 0, totRealDia = 0;
for (const c of contratos) {
  const dif = r2(c.liq - c.liqAcum);
  foto['acum.' + c.nome + '.diferenca'] = dif;
  foto['acum.' + c.nome + '.desvio'] = pct1(dif / c.liqAcum);
  const fcDia = r2(c.brutaFc / c.dias);
  const difDia = r2(c.realDia - fcDia);
  foto['dia.' + c.nome + '.forecast'] = fcDia;
  foto['dia.' + c.nome + '.diferenca'] = difDia;
  foto['dia.' + c.nome + '.desvio'] = pct1(difDia / fcDia);
  totLiqAcum += c.liqAcum; totLiq += c.liq; totFcDia += fcDia; totRealDia += c.realDia;
}
foto['acum.total.liqAcumulada'] = r2(totLiqAcum);
foto['acum.total.liquida'] = r2(totLiq);
foto['acum.total.diferenca'] = r2(totLiq - totLiqAcum);
foto['dia.total.forecast'] = r2(totFcDia);
foto['dia.total.real'] = r2(totRealDia);
foto['dia.total.diferenca'] = r2(totRealDia - totFcDia);

/* ═══ 4. EBITDA: o semáforo não pode inverter de sinal ════════════════════ */
const ebitda = [
  { nome: 'beta', est: 38000.00, fc: 45000.00 },
  { nome: 'alfa', est: -80000.00, fc: 3000.00 },
  { nome: 'gamma', est: 220.00, fc: 0.00 },
  { nome: 'ds', est: -10000.00, fc: 2000.00 },
  { nome: 'delta', est: 24000.00, fc: 27000.00 },
  { nome: 'epsilon', est: 2400.00, fc: 5000.00 },
  { nome: 'soc', est: 79000.00, fc: 79000.00 }
];
for (const e of ebitda) {
  const dev = r2(e.est - e.fc);
  const temBase = Math.abs(e.fc) > 0.005;
  foto['ebitda.' + e.nome + '.desvio'] = dev;
  foto['ebitda.' + e.nome + '.pct'] = temBase ? pct1(dev / Math.abs(e.fc)) : null;
  foto['ebitda.' + e.nome + '.semaforo'] = dev > 0 ? 'verde' : dev === 0 ? 'amarelo' : 'vermelho';
}

/* ── Grava ou compara ─────────────────────────────────────────────────────── */
const chaves = Object.keys(foto).sort();
if (salvar) {
  fs.writeFileSync(REF, JSON.stringify(foto, null, 2), 'utf8');
  console.log('Foto de referência gravada em ' + REF);
  console.log('  ' + chaves.length + ' valores fotografados.');
  process.exit(0);
}
if (!fs.existsSync(REF)) {
  console.error('Não existe foto de referência. Rode: node scripts/foto-numeros.mjs --salvar');
  process.exit(1);
}
const ref = JSON.parse(fs.readFileSync(REF, 'utf8'));
let dif = 0;
for (const k of new Set([...chaves, ...Object.keys(ref)])) {
  const a = JSON.stringify(ref[k]);
  const b = JSON.stringify(foto[k]);
  if (a !== b) {
    dif++;
    console.log('  MUDOU  ' + k);
    console.log('         antes: ' + a);
    console.log('         agora: ' + b);
  }
}
if (dif) {
  console.log('\n' + dif + ' VALOR(ES) MUDARAM: alguma correção alterou cálculo.');
  process.exit(1);
}
console.log('Foto conferida: os ' + chaves.length + ' valores estão IDÊNTICOS aos de antes.');
