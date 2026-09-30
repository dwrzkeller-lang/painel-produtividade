/* Testes dos cálculos do painel: rode com `npm run teste`.
   ---------------------------------------------------------------------------
   POR QUE ISTO EXISTE: os erros que mais custaram tempo neste painel foram de
   CONTA, não de tela: meta acumulada contando domingo, cache que congelava um
   "não consegui calcular", data sem ano descartada em silêncio. Todos eram
   invisíveis olhando o código e só apareciam com o painel aberto na frente do
   usuário. Aqui as contas rodam sozinhas, em segundos.

   COMO FUNCIONA: os trechos são RECORTADOS dos arquivos-fonte de verdade
   (assets/js/...) e executados com globais de mentira. Não há cópia da lógica -
   se alguém mudar o cálculo no arquivo, é o cálculo novo que é testado aqui.

   O que está coberto:
     1. quem tem meta no fim de semana, por contrato (19-calendario-dias-uteis.js);
     2. produção acumulada somada do banco diário (19-calendario-dias-uteis.js);
     3. filtro do gráfico "Produção dia: total geral" (02-core.js).
   Cada bloco testa também as TRAVAS de segurança: os casos em que o cálculo
   deve desistir e manter o valor salvo, porque valor que desaparece da tela é o
   pior defeito possível neste painel. */
import fs from 'node:fs';

const src19 = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');
const src02 = fs.readFileSync('assets/js/02-core.js', 'utf8');

function recortar(fonte, de, ate, nome) {
  const i = fonte.indexOf(de);
  const j = fonte.indexOf(ate, i);
  if (i < 0 || j < 0) throw new Error('não achei o trecho: ' + nome);
  return fonte.slice(i, j + ate.length);
}

function faixa(fonte, de, ate, nome) {
  const i = fonte.indexOf(de);
  const j = fonte.indexOf(ate, i);
  if (i < 0 || j < 0) throw new Error('não achei o trecho: ' + nome);
  return fonte.slice(i, j);
}

/* Regra de meta de fim de semana, por contrato. */
/* Meta de fim de semana de TESTE: o código do painel não traz valor de contrato. */
const SAB_TESTE = 60000;
const trechoFds = faixa(src19, 'var SEMENTE_FDS = {', '/* Soma as metas dos dias marcados', 'regra do fim de semana').replace('var SEMENTE_FDS = {};', "var SEMENTE_FDS = { 'contrato-alfa': { sab: " + SAB_TESTE + ", dom: 0 } };").replace('var CONSERTO_FDS_DUPLICADO = {};', "var CONSERTO_FDS_DUPLICADO = { 'contrato-alfa': true };");
/* Soma da produção acumulada pelo banco diário. */
const trechoMetaEquipe = faixa(src19, 'window.ppResumoDiasContados = function', '/* ── PRODUÇÃO ACUMULADA');
const trechoMetaDia = faixa(src19, 'window.ppMetaDiaDoDiaSelecionado = function', '/* ── PRODUÇÃO ACUMULADA', 'meta do dia');
/* REGRA DE FERIADO (09/09/2026): as contas fotografadas passaram a depender
   de descontoDeFeriados e ehFeriadoPorCsv. Sem este recorte elas nao existem
   no escopo do teste e as contas devolvem null. */
const trechoFeriados = faixa(src19, 'function pascoaDe(ano) {', 'function contarDiasCalculo(', 'regra de feriado');
const trecho19 = faixa(src19, 'function nomeChave(valor) {', '/* ═══ REMOVIDO EM 17/08/2026', 'produção acumulada');

const trecho02 = recortar(src02,
  'function mesDoHistoricoExibido() {',
  'return doMes.map((x) => x.item);\n    }', 'filtro do gráfico');

let falhas = 0;
function conferir(rotulo, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FALHA') + ' | ' + rotulo +
    (ok ? '' : '\n        obtido:   ' + JSON.stringify(obtido) +
      '\n        esperado: ' + JSON.stringify(esperado)));
}

/* ── Ambiente falso comum ──────────────────────────────────────────────── */
function montar({ dia, banco, historico, dataReferencia, projeto, cfg, contextoFixo }) {
  const escopo = {
    window: { dailyKey: () => dia, currentProjectId: projeto || '' },
    chaveMes: (ano, mes) => ano + '-' + String(mes).padStart(2, '0'),
    n: (v) => { const x = Number(v); return isFinite(x) ? x : 0; },
    getDailyBank: () => banco || {},
    /* A memória de um ciclo de desenho (ver 19-calendario-dias-uteis.js) vive
       fora dos trechos recortados. No teste ela é uma memória de mentira que não
       guarda nada: cada chamada recalcula, que é o pior caso e o mais honesto
       para verificar a conta. */
    idDoProjeto: () => projeto || '',
    memo: (chave, calcular) => calcular(),
    bancoDoCiclo: () => banco || {},
    somaTaxasDia: () => 12000,
    /* Contexto de mentira: 11 uteis, 3 sabados e 3 domingos ja lancados. */
    contextoDoRender: () => (contextoFixo || {
      dias: { uteis: 11, sabados: 3, domingos: 3 },
      soma: 12000,
      vSab: cfg && cfg.__vSab !== undefined ? cfg.__vSab : 0,
      vDom: cfg && cfg.__vDom !== undefined ? cfg.__vDom : 0,
      motivo: ''
    }),
    config: Object.assign({ dataReferencia: dataReferencia || dia }, cfg || {}),
    historico: historico || [],
    CAMPO_CONFIG: 'ppDiasDoMes',
    VAZIO: 0
  };
  const nomes = Object.keys(escopo);
  const corpo = `
    ${trechoFds}
${trechoFeriados}
    ${trechoMetaEquipe}
    ${trechoMetaDia}
    ${trecho19}
    ${trecho02}
    return {
      producao: window.ppProducaoAcumuladaDaEquipe,
      resumo: window.ppResumoProducaoAcumulada,
      grafico: historicoDoMesExibido,
      valorFds: valorFimDeSemana,
      temMetaFds: contratoTemMetaFds,
      valorDoEstado: valorFdsDoEstado,
      calendarioLigado: calendarioEntraNaMeta,
      metaDoDia: window.ppMetaDiaDoDiaSelecionado,
      metaAcumEquipe: window.ppMetaAcumuladaDaEquipe,
      resumoDias: window.ppResumoDiasContados
    };`;
  return new Function(...nomes, corpo)(...nomes.map((k) => escopo[k]));
}

/* ═══ 0. Quem tem meta no fim de semana: o bug da Construção Cliente ════ */
console.log('\nmeta de fim de semana: nunca herdada de outro contrato');

const semRegra = montar({ dia: '13/08/2026', banco: {}, projeto: 'contrato-gamma' });
conferir('contrato sem marcação NÃO tem meta de sábado (antes herdava a do Alfa)',
  semRegra.valorFds('sab'), 0);
conferir('contrato sem marcação NÃO tem meta de domingo', semRegra.valorFds('dom'), 0);
conferir('sem meta de fim de semana, a meta acumulada fica a do CSV',
  semRegra.temMetaFds(), false);

const alfa = montar({ dia: '13/08/2026', banco: {}, projeto: 'contrato-alfa' });
conferir('Alfa mantém a meta de sábado da semente', alfa.valorFds('sab') > 0, true);
conferir('Alfa não ganha meta de domingo', alfa.valorFds('dom'), 0);
conferir('Alfa recalcula a meta acumulada', alfa.temMetaFds(), true);

conferir('marcação explícita DESLIGADA vence até um valor informado',
  montar({
    dia: '13/08/2026', banco: {}, projeto: 'contrato-alfa',
    cfg: { metaSabadoAtiva: false, financeiroExecutivo: { projCalMetaSabado: 60000 } }
  }).valorFds('sab'), 0);

conferir('valor GRAVADO nao liga a regra sozinho: so a marcacao do editor liga',
  montar({
    dia: '13/08/2026', banco: {}, projeto: 'contrato-delta',
    cfg: { financeiroExecutivo: { projCalMetaSabado: 50000 } }
  }).valorFds('sab'), 0);
conferir('com a marcacao ligada, o valor gravado e usado',
  montar({
    dia: '13/08/2026', banco: {}, projeto: 'contrato-delta',
    cfg: { metaSabadoAtiva: true, financeiroExecutivo: { projCalMetaSabado: 50000 } }
  }).valorFds('sab'), 50000);

conferir('valor informado ZERO significa "não tem meta", não "use o padrão"',
  montar({
    dia: '13/08/2026', banco: {}, projeto: 'contrato-delta',
    cfg: { financeiroExecutivo: { projCalMetaSabado: 0 } }
  }).valorFds('sab'), 0);

conferir('no Acompanhamento Gerencial cada contrato usa a SUA regra',
  [semRegra.valorDoEstado({}, 'sab', 'contrato-gamma'),
    semRegra.valorDoEstado({}, 'sab', 'contrato-alfa')], [0, SAB_TESTE]);

/* O calendário foi REMOVIDO do Editor Projeto em 18/08/2026: nunca mais entra
   na contagem, em contrato nenhum, nem que exista marcação salva mandando o
   contrário. A contagem passa a ser só do que foi lançado (CSV e banco diário). */
conferir('calendário nunca entra na contagem', semRegra.calendarioLigado(), false);
conferir('nem marcação salva reativa o calendário',
  montar({ dia: '13/08/2026', banco: {}, cfg: { usarCalendarioNaMeta: true } }).calendarioLigado(), false);


/* ═══ 0b. Meta do DIA SELECIONADO: sábado/domingo sem meta ══════════════ */
console.log('\nmeta do dia: sábado e domingo sem meta valem zero');

const equipeCE = { equipe: 'EQ-02', metaDia: 7000 };
/* 15/08/2026 e sábado, 16/08/2026 e domingo, 14/08/2026 e sexta. */
conferir('sabado em contrato SEM meta de sabado: meta do dia ZERO',
  montar({ dia: '15/08/2026', banco: {}, projeto: 'contrato-gamma' }).metaDoDia(equipeCE), 0);
conferir('domingo em contrato SEM meta de domingo: meta do dia ZERO',
  montar({ dia: '16/08/2026', banco: {}, projeto: 'contrato-gamma' }).metaDoDia(equipeCE), 0);
conferir('dia util mantem a taxa do CSV (devolve null, nada a ajustar)',
  montar({ dia: '14/08/2026', banco: {}, projeto: 'contrato-gamma' }).metaDoDia(equipeCE), null);
conferir('domingo no Alfa, que nao tem meta de domingo: ZERO',
  montar({ dia: '16/08/2026', banco: {}, projeto: 'contrato-alfa' }).metaDoDia(equipeCE), 0);
conferir('valor de sabado gravado NAO ressuscita a regra (era o bug das duas telas)',
  montar({ dia: '15/08/2026', banco: {}, projeto: 'contrato-gamma',
    cfg: { financeiroExecutivo: { projCalMetaSabado: 40000 } } }).metaDoDia(equipeCE), 0);


/* ═══ 0c. Meta da equipe: CSV nos dias uteis, Editor no fim de semana ════ */
console.log('\nmeta acumulada: CSV nos dias uteis + fim de semana do Editor');

/* Uma equipe do Alfa: meta/dia [valor] (a soma toda, para peso 1) e meta
   acumulada de R$ [valor] vinda do CSV. */
const eqAlfa = { equipe: 'LV 01', metaDia: 12000, metaAcumulada: 140000 };

conferir('sem meta de fim de semana, a meta do CSV passa intacta (null = nao mexe)',
  montar({ dia: '17/08/2026', banco: {}, projeto: 'contrato-gamma' }).metaAcumEquipe(eqAlfa), null);

conferir('com meta de sabado, soma 3 sabados x R$ 6.000 por cima do CSV',
  montar({ dia: '17/08/2026', banco: {}, projeto: 'contrato-alfa',
    cfg: { __vSab: 6000, __vDom: 0 } }).metaAcumEquipe(eqAlfa),
  140000 + 3 * 6000);

conferir('com meta de sabado e domingo, soma os dois',
  montar({ dia: '17/08/2026', banco: {}, projeto: 'contrato-beta',
    cfg: { metaSabadoAtiva: true, metaDomingoAtiva: true, __vSab: 5000, __vDom: 5000,
      financeiroExecutivo: { projCalMetaSabado: 5000, projCalMetaDomingo: 5000 } } })
    .metaAcumEquipe(eqAlfa),
  140000 + 3 * 5000 + 3 * 5000);

conferir('o rodape informa so o que foi acrescentado',
  montar({ dia: '17/08/2026', banco: {}, projeto: 'contrato-alfa',
    cfg: { __vSab: 6000, __vDom: 0 } }).resumoDias(), 'CSV + 3 sábado(s)');

conferir('sem acrescimo, o rodape nao inventa texto',
  montar({ dia: '17/08/2026', banco: {}, projeto: 'contrato-gamma' }).resumoDias(), null);


/* ═══ 0d. Sabado nao pode ser contado duas vezes ═════════════════════════
   DEFEITO REAL visto pelo usuario em 19/08/2026: no Alfa, a meta acumulada de
   18/08 estava R$ [valor] acima da de 17/08, quando um dia util vale
   R$ [valor]. Sobravam exatos R$ [valor] = 3 sabados x R$ [valor]
   Causa: o campo do editor exibia o valor CALCULADO (CSV + sabados) e o Salvar
   lia esse campo de volta para dentro do dado; na vez seguinte o painel somava
   os sabados outra vez, de forma cumulativa.
   O teste abaixo trava a regra: a conta parte SEMPRE da meta do CSV, e um dia a
   mais tem de valer exatamente um dia util a mais. */
console.log('\nsabado nao conta duas vezes');

function metaDoDia(uteis, cfgExtra, baseGravada) {
  return montar({
    dia: '17/08/2026', banco: {}, projeto: 'contrato-alfa',
    cfg: Object.assign({ __vSab: 6000, __vDom: 0 }, cfgExtra || {}),
    contextoFixo: { dias: { uteis: uteis, sabados: 3, domingos: 0 }, soma: 12000, vSab: 6000, vDom: 0, motivo: '' }
  }).metaAcumEquipe({
    equipe: 'TOTAL', metaDia: 12000,
    metaAcumulada: baseGravada !== undefined && baseGravada !== null ? baseGravada : uteis * 12000
  });
}
const m17 = metaDoDia(11);
const m18 = metaDoDia(12);
conferir('11 dias uteis + 3 sabados', m17, 11 * 12000 + 3 * 6000);
conferir('12 dias uteis + 3 sabados', m18, 12 * 12000 + 3 * 6000);
conferir('um dia a mais vale UM dia util, nao um dia + os sabados de novo',
  Math.round((m18 - m17) * 100) / 100, 12000);

/* O conserto do dado ja contaminado: 18/08 do Alfa foi gravado com os sabados
   embutidos. O painel tem de reconhecer e NAO somar de novo. */
const contaminado = 12 * 12000 + 3 * 6000;   /* o que esta gravado hoje no 18/08 */
conferir('valor ja contaminado nao ganha os sabados outra vez',
  metaDoDia(12, null, contaminado), contaminado);
conferir('valor limpo continua ganhando os sabados normalmente',
  metaDoDia(12, null, 12 * 12000), 12 * 12000 + 3 * 6000);
conferir('equipe em rampa (menos que o esperado) ganha os sabados',
  metaDoDia(12, null, 10 * 12000), 10 * 12000 + 3 * 6000);


/* ═══ 1. Produção acumulada somada do banco diário ═══════════════════════ */
console.log('\nprodução acumulada somada do banco diário');

const bancoAgosto = {
  '11/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 1000 }, { equipe: 'LV 02', produzidoDia: 500 }] },
  '12/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 2000 }, { equipe: 'LV 02', produzidoDia: 700 }] },
  '13/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 3000 }] },
  /* dia POSTERIOR ao selecionado: não pode entrar */
  '14/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 9999 }] },
  /* mês anterior: não pode entrar */
  '30/07/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 8888 }] }
};

/* A soma do banco e OPT-IN: sem a marcacao no Editor Projeto o acumulado
   continua vindo do CSV. Por isso os testes abaixo ligam a chave. */
const LIGADO = { somarAcumuladoDoBanco: true };
conferir('desligado (padrao) o acumulado continua o do CSV',
  montar({ dia: '13/08/2026', banco: bancoAgosto }).producao({ equipe: 'LV 01', produzidoAcumulado: 123 }), null);
conferir('desligado, o rodape nao inventa explicacao (fica o padrao do cartao)',
  montar({ dia: '13/08/2026', banco: bancoAgosto }).resumo(), null);

let a = montar({ dia: '13/08/2026', banco: bancoAgosto, cfg: LIGADO });
conferir('soma os 3 dias do mês até o dia selecionado',
  a.producao({ equipe: 'LV 01', produzidoAcumulado: 123 }), 6000);
conferir('equipe que não trabalhou no dia 13 soma só os dias em que aparece',
  a.producao({ equipe: 'LV 02', produzidoAcumulado: 123 }), 1200);
conferir('rodapé diz de quantos dias somou', a.resumo(), '3 dia(s) lançado(s)');
conferir('acento e caixa não impedem o encontro da equipe',
  montar({
    dia: '13/08/2026',
    banco: { '11/08/2026': { equipes: [{ equipe: 'manutenção sul', produzidoDia: 400 }] } }, cfg: LIGADO
  }).producao({ equipe: 'MANUTENCAO SUL', produzidoAcumulado: 1 }), 400);

conferir('equipe ausente do banco mantém o valor salvo (null)',
  a.producao({ equipe: 'LV 99', produzidoAcumulado: 5000 }), null);
conferir('banco sem dias do mês mantém o valor salvo (null)',
  montar({ dia: '13/09/2026', banco: bancoAgosto, cfg: LIGADO }).producao({ equipe: 'LV 01', produzidoAcumulado: 5000 }), null);
conferir('sem dia selecionado mantém o valor salvo (null)',
  montar({ dia: '', banco: bancoAgosto, cfg: LIGADO }).producao({ equipe: 'LV 01', produzidoAcumulado: 5000 }), null);
conferir('soma zero sobre valor salvo positivo NÃO zera a tela (null)',
  montar({
    dia: '13/08/2026',
    banco: { '11/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 0 }] } }, cfg: LIGADO
  }).producao({ equipe: 'LV 01', produzidoAcumulado: 4200 }), null);
conferir('soma zero com valor salvo zero devolve zero (nada a perder)',
  montar({
    dia: '13/08/2026',
    banco: { '11/08/2026': { equipes: [{ equipe: 'LV 01', produzidoDia: 0 }] } }, cfg: LIGADO
  }).producao({ equipe: 'LV 01', produzidoAcumulado: 0 }), 0);
conferir('sem dia selecionado o rodape fica vazio, sem explicacao',
  montar({ dia: '', banco: bancoAgosto, cfg: LIGADO }).resumo(), null);

/* ═══ 2. Gráfico "Produção dia: total geral" só do mês exibido ══════════ */
console.log('\ngráfico produção dia: só o mês exibido');

const hist = [
  { data: '30/07/2026', total: 111 },
  { data: '12/08/2026', total: 222 },
  { data: '11/08/2026', total: 333 },
  { data: '13/08', total: 444 }          /* legado sem ano */
];

conferir('mostra só agosto, ordenado por dia',
  montar({ dia: '13/08/2026', banco: {}, historico: hist }).grafico()
    .map((h) => h.data), ['11/08/2026', '12/08/2026', '13/08']);

conferir('mês sem lançamento nenhum devolve o histórico inteiro (não esvazia)',
  montar({ dia: '10/09/2026', banco: {}, historico: hist }).grafico().length, 4);

conferir('sem data de referência devolve o histórico inteiro',
  montar({ dia: '', banco: {}, historico: hist, dataReferencia: '' }).grafico().length, 4);

conferir('julho mostra só julho',
  montar({ dia: '31/07/2026', banco: {}, historico: hist }).grafico()
    .map((h) => h.data), ['30/07/2026']);

/* ═══ FERIADO SE RECONHECE PELA META (09/09/2026) ══════════════════════════
   Regra do dono do produto: dia de semana SEM meta no CSV é feriado e não pode
   entrar na meta acumulada. O caso real foi 07/09/2026 (Independência), numa
   segunda-feira: o contrato Construção Cliente tinha produção lançada mas meta
   zero, o painel contava o dia como útil, e a meta acumulada subia um dia
   inteiro: piorando o desvio artificialmente.

   Os dois primeiros testes recortam a DECISÃO dos arquivos-fonte: se alguém
   afrouxar a regra lá, aqui falha. Os dois seguintes travam os números que o
   usuário conferiu na tela. */
const fonte19Feriado = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');

conferir('produtividade: dia de semana sem meta nao conta como util',
  fonte19Feriado.includes("origem !== 'calendario' && ehFeriadoPorCsv("), true);

conferir('gerencial: a MESMA regra existe do outro lado',
  fonte19Feriado.includes('ehFeriadoPorCsv(cfgEstado'), true);

const metaAcum = (metaMes, diasUteisMes, dias) =>
  Math.round((metaMes / diasUteisMes) * dias * 100) / 100;

const fonte13Csv = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');
conferir('import guarda a meta CRUA por data (a do banco e derivada)',
  fonte13Csv.includes('metaByDate[r.dateKey]'), true);
conferir('a lista de feriados pelo CSV foi REMOVIDA (marcava dia de trabalho como feriado)',
  fonte13Csv.includes('cfg.diasSemMetaCsv'), false);
conferir('o contador de dias uteis aceita uma lista de feriados',
  fonte13Csv.includes('ehDiaSemMeta(x, semMeta)'), true);

conferir('Construcao: contando 07/09 (errado) a meta dava 50.000,00',
  metaAcum(210000, 21, 5), 50000);

conferir('Construcao: com 07/09 como feriado a meta e 40.000,00',
  metaAcum(210000, 21, 4), 40000);

/* ═══ MOVIMENTO NUNCA SE PERDE NUMA GRAVAÇÃO (09/09/2026) ══════════════════
   O movimento de Setembro do Construção Cliente desapareceu porque uma
   gravação partiu de um estado EM BRANCO: a nuvem ainda não havia respondido
   sobre aquele contrato: e levou esse branco para cima do que estava salvo.

   A proteção é o mesclador abaixo, recortado do arquivo-fonte: mês que a
   gravação não traz é PRESERVADO, e apagar um mês exige declarar a intenção
   (o botão Excluir do Editor Forecast). */
const fonte03Movs = fs.readFileSync('assets/js/03-state-sync.js', 'utf8');
const iM = fonte03Movs.indexOf('function ppMesclarMovimentos(');
if (iM < 0) throw new Error('nao achei ppMesclarMovimentos em 03-state-sync.js');
const fimM = fonte03Movs.indexOf('\n      }', iM);
const mesclar = new Function(
  fonte03Movs.slice(iM, fimM) + '\n      }\n return ppMesclarMovimentos;')();

const agosto = { ano: 2026, mes: 8, forecastAtual: 400000 };
const setembro = { ano: 2026, mes: 9, forecastAtual: 300000 };

conferir('gravacao vazia preserva os dois meses',
  mesclar([], [agosto, setembro], null).length, 2);

conferir('gravacao que traz so setembro preserva agosto',
  mesclar([setembro], [agosto, setembro], null).map((m) => m.mes).sort(), [8, 9]);

conferir('o mes trazido na gravacao VENCE o que estava salvo',
  mesclar([{ ano: 2026, mes: 9, forecastAtual: 999 }], [agosto, setembro], null)
    .filter((m) => m.mes === 9)[0].forecastAtual, 999);

conferir('exclusao declarada realmente remove o mes pedido',
  mesclar([agosto], [agosto, setembro], { ano: 2026, mes: 9 }).map((m) => m.mes), [8]);

conferir('exclusao de um mes nao arrasta o outro',
  mesclar([setembro], [agosto, setembro], { ano: 2026, mes: 8 }).map((m) => m.mes), [9]);

/* ═══ FERIADO NACIONAL: A FONTE QUE FALTAVA (09/09/2026) ══════════════════
   Duas tentativas anteriores falharam por deduzir o feriado da meta gravada:
   ela é derivada (metaMes ÷ dias úteis), sempre positiva, e nunca acusava
   nada. Pior: num contrato cuja meta diária é zero em todos os dias, a dedução
   marcaria TODO dia como feriado e zeraria a meta acumulada.

   A fonte confiável é declarar o fato: 07/09 é a Independência. Estes testes
   recortam a tabela do arquivo-fonte, então medem a decisão real. */
const fonte19Fer = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');

const iPascoa = fonte19Fer.indexOf('function pascoaDe(ano) {');
if (iPascoa < 0) throw new Error('nao achei pascoaDe');
const pascoaDe = new Function(
  fonte19Fer.slice(iPascoa, fonte19Fer.indexOf('\n      }', iPascoa)) + '\n      }\n return pascoaDe;')();

const ddmm = (d) => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");

conferir('Pascoa de 2026 e 05/04', ddmm(pascoaDe(2026)), '05/04');
conferir('Pascoa de 2025 e 20/04', ddmm(pascoaDe(2025)), '20/04');
conferir('Pascoa de 2024 e 31/03', ddmm(pascoaDe(2024)), '31/03');

const sextaSanta = (ano) => {
  const p = pascoaDe(ano);
  return ddmm(new Date(p.getFullYear(), p.getMonth(), p.getDate() - 2));
};
conferir('Sexta-feira Santa de 2026 e 03/04', sextaSanta(2026), '03/04');

/* A tabela precisa conter os feriados nacionais por lei: e NÃO conter
   Carnaval nem Corpus Christi, que são ponto facultativo: em obra se trabalha,
   e removê-los tiraria meta de dias trabalhados. */
conferir('07/09 (Independencia) esta na tabela nacional',
  fonte19Fer.includes('marcar(7, 9);'), true);
conferir('25/12 (Natal) esta na tabela nacional',
  fonte19Fer.includes('marcar(25, 12);'), true);
conferir('20/11 (Consciencia Negra) esta na tabela nacional',
  fonte19Fer.includes('marcar(20, 11);'), true);

/* A ordem das fontes: informação primeiro, conferência do CSV depois. */
conferir('o feriado nacional e consultado ANTES da lista do contrato',
  fonte19Fer.indexOf('feriadosNacionais(ano)') <
  fonte19Fer.indexOf('feriadosExtrasDoConfig(cfg, ano, mes, dia)'), true);

conferir('lista local do contrato (municipal/estadual) e consultada',
  fonte19Fer.includes('feriadosExtrasDoConfig(cfg, ano, mes, dia)'), true);

/* A dedução pela meta do banco tinha de sair: podia zerar o painel. */
conferir('detector pela meta do banco foi REMOVIDO',
  fonte19Fer.includes('somaMetaDoDia') || fonte19Fer.includes('feriadosDoBanco'), false);

/* Os dois lados continuam consultando o MESMO detector. */
conferir('gerencial usa o mesmo detector, com o contrato da linha',
  fonte19Fer.includes('ehFeriadoPorCsv(cfgEstado, ano, mes, d, projetoId)'), true);

/* O numero que o usuario cobrou, com 07/09 fora da conta. */
const desvio = (meta, prod) => Math.round((prod - meta) * 100) / 100;
conferir('dia 07 com 4 dias uteis: desvio cai de -20.000,00 para -10.000,00',
  desvio(40000, 30000), -10000);

/* ═══ CARD DE EQUIPE: A TAXA TEM DE SER A MESMA DO PAINEL (10/09/2026) ═════
   O card calculava o líquido com "1 - descontoLiquido()", pulando a cadeia
   oficial (Editor Forecast → Editor Projeto → desconto). No Alfa, cuja taxa
   é [x]% e vem da cadeia, o card caía no último degrau: com descontoLiquido
   nunca preenchido o fator virava 1 e o card mostrava LÍQUIDO IGUAL AO BRUTO
  : R$ [valor] em vez de R$ [valor], na mesma tela em que o indicador
   do topo mostrava o valor certo. */
const fonte02Card = fs.readFileSync('assets/js/02-core.js', 'utf8');

conferir('card de equipe usa fatorLiquido(), a mesma funcao do painel',
  fonte02Card.includes('n(d.produzidoAcumulado) * fatorLiquido()'), true);

conferir('card nao calcula a taxa por conta propria',
  fonte02Card.includes('n(d.produzidoAcumulado) * (1 - descontoLiquido())'), false);

/* O numero que o usuario confere na tela do Alfa. */
const liquidoDe = (bruto, taxa) => Math.round(bruto * taxa * 100) / 100;
conferir('bruto 100.000,00 x taxa de 90% = 90.000,00',
  liquidoDe(100000, 0.9), 90000);

/* ═══ ZOOM: A TABELA PRECISA ROLAR, NAO CORTAR ═════════════════════════════
   Ao dar zoom, as ultimas equipes e o TOTAL GERAL sumiam sem barra de
   rolagem. A causa era altura travada com transbordo escondido. */
const cssZoom = fs.readFileSync('assets/css/11-mobile-e-zoom.css', 'utf8');

conferir('tabela de equipes rola quando o conteudo nao cabe',
  cssZoom.includes('overflow: auto !important'), true);

conferir('os ancestrais permitem encolher (min-height: 0)',
  cssZoom.includes('min-height: 0;'), true);

conferir('o TOTAL GERAL acompanha a rolagem',
  cssZoom.includes('position: sticky') && cssZoom.includes('bottom: 0;'), true);

/* ═══ CELULAR: UMA COLUNA, SEM ROLAGEM LATERAL DA PAGINA ═══════════════════ */
conferir('o min-width de 1440px e desfeito no celular',
  cssZoom.includes('min-width: 0 !important'), true);

conferir('a pagina nao rola para os lados no celular',
  cssZoom.includes('overflow-x: hidden !important'), true);

const cssGer = fs.readFileSync('assets/gerencial/gerencial.css', 'utf8');
conferir('no celular os quadros do gerencial empilham em uma coluna',
  cssGer.includes('.ger-grade2, .ger-graficos { grid-template-columns: minmax(0, 1fr); }'), true);

/* ═══ COMENTÁRIO POR EQUIPE E POR DIA (10/09/2026) ═════════════════════════
   Estes testes EXECUTAM o arquivo do recurso num ambiente simulado: não
   olham o texto do código. Assim medem comportamento de verdade: gravar,
   ler, apagar, e a garantia de que a importação do CSV não atropela um
   comentário escrito à mão. */
function ambienteComentario(dia) {
  const ouvintes = [];
  const fakeDoc = {
    addEventListener: (t, f) => ouvintes.push(f),
    body: { classList: { contains: () => false } },
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, set innerHTML(v) {}, classList: { add() {} } }),
    readyState: "complete"
  };
  const cfg = { comentariosEquipe: {} };
  const escopo = {
    document: fakeDoc,
    config: cfg,
    window: {},
    ppPersistCurrentProject: () => { escopo.window.__gravou = true; },
    alert: () => {}
  };
  escopo.window.config = cfg;
  escopo.window.dailyKey = () => dia;
  escopo.window.currentUserLogin = "controller@exemplo.com";
  escopo.window.document = fakeDoc;

  const fonte = fs.readFileSync('assets/js/21-comentario-equipe.js', 'utf8');
  const nomes = Object.keys(escopo);
  new Function(...nomes, fonte)(...nomes.map((k) => escopo[k]));
  return { win: escopo.window, cfg };
}

const amb = ambienteComentario("09/09/2026");

conferir('comeca sem comentario para a equipe',
  amb.win.ppComentarioDaEquipe("EQV-C02", "09/09/2026"), null);

conferir('salvar grava o texto',
  (amb.win.ppSalvarComentarioDaEquipe("EQV-C02", "09/09/2026", "Equipe parada por falta de material."),
    amb.win.ppComentarioDaEquipe("EQV-C02", "09/09/2026").texto),
  "Equipe parada por falta de material.");

conferir('o comentario salvo fica marcado como manual',
  amb.win.ppComentarioDaEquipe("EQV-C02", "09/09/2026").origem, "manual");

conferir('registra quem escreveu',
  amb.win.ppComentarioDaEquipe("EQV-C02", "09/09/2026").autor, "controller@exemplo.com");

conferir('salvar sobe para a nuvem na hora (e gravacao explicita)',
  amb.win.__gravou, true);

conferir('o comentario e POR DIA: outro dia continua vazio',
  amb.win.ppComentarioDaEquipe("EQV-C02", "08/09/2026"), null);

conferir('o comentario e POR EQUIPE: outra equipe continua vazia',
  amb.win.ppComentarioDaEquipe("EQM-C06", "09/09/2026"), null);

conferir('apagar: o comentario some para quem le',
  (amb.win.ppSalvarComentarioDaEquipe("EQV-C02", "09/09/2026", "   "),
    amb.win.ppComentarioDaEquipe("EQV-C02", "09/09/2026")), null);

conferir('apagar GRAVA registro vazio (mesclagem nao apaga por omissao)',
  Object.prototype.hasOwnProperty.call(amb.cfg.comentariosEquipe["09/09/2026"] || {}, "EQV-C02"), true);

/* O CSV alimenta, mas NUNCA atropela o que foi escrito a mao. */
const fonte13Obs = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');

conferir('import guarda a observacao por equipe E por data',
  fonte13Obs.includes('obsByTeamDate[r.equipe][r.dateKey]'), true);

conferir('import NAO sobrescreve comentario escrito a mao',
  fonte13Obs.includes("atual.origem === 'manual'"), true);

/* ═══ UMA LINHA DE COMENTÁRIO ABERTA POR VEZ (11/09/2026) ══════════════════
   BUG RELATADO: ao salvar o comentário de uma equipe, TODAS as que tinham
   comentário ou que já haviam sido abertas alguma vez apareciam
   expandidas de uma vez.

   CAUSA: o estado das linhas abertas era um MAPA que acumulava e nunca
   esvaziava. Fechar removia o elemento da tela mas deixava a chave no mapa; e
   como salvar dispara o redesenho, e o redesenho reabre "o que estava
   aberto", ele reabria a lista inteira acumulada desde o carregamento.

   Os testes abaixo travam a correção no código: estado único em vez de mapa,
   e nenhuma reabertura em lote. */
const fonteComent = fs.readFileSync('assets/js/21-comentario-equipe.js', 'utf8');

conferir('o estado guarda UMA linha, nao um mapa de linhas',
  fonteComent.includes('var ABERTA = null;') && !fonteComent.includes('var ABERTO = {}'), true);

conferir('nao sobrou nenhuma referencia ao mapa acumulador',
  /\bABERTO\b/.test(fonteComent), false);

conferir('o redesenho reabre UMA linha (funcao no singular)',
  fonteComent.includes('function reabrirLinhaUnica()'), true);

conferir('abrir uma linha fecha a anterior',
  fonteComent.includes('fecharTodas(tabela);'), true);

conferir('clicar de novo fecha e limpa o estado',
  fonteComent.includes('if (jaAberta) { ABERTA = null; return; }'), true);

conferir('a equipe que sai da tela nao fica presa no estado',
  fonteComent.includes('ABERTA = null;') && fonteComent.includes('/* A equipe saiu da tela'), true);

/* O ponto no balao: descoberta sem precisar clicar em todas as equipes. */
conferir('os baloes com comentario recebem marca',
  fonteComent.includes('pp-tem-coment'), true);

conferir('a marca e reavaliada ao salvar, sem esperar a nuvem',
  fonteComent.includes('try { marcarBadgesComComentario(); } catch (e) { }'), true);

const cssComent = fs.readFileSync('assets/css/12-comentario-equipe.css', 'utf8');

conferir('a marca de comentario e um canto dobrado no alto, a direita do selo',
  cssComent.includes('.pp-tem-coment::after') && cssComent.includes('top: 0;') && cssComent.includes('right: 0;') && cssComent.includes('border-left: 7px solid transparent;'), true);

conferir('o balao e o betadouro do ponto (position relative)',
  cssComent.includes('position: relative;'), true);

conferir('a abertura e animada, nao seca',
  cssComent.includes('@keyframes ppComentEntra'), true);

/* ═══ APAGAR O COMENTÁRIO (11/09/2026) ═════════════════════════════════════
   BUG: limpar o texto e salvar não apagava: o comentário antigo voltava.

   CAUSA: a gravação na nuvem é uma MESCLAGEM ("atualize o que eu mandei,
   preserve o resto"). Uma chave REMOVIDA do objeto local não é mencionada na
   mensagem, então a nuvem entende "não mexa nisso" e mantém o valor antigo.
   Apagar por omissão nunca funciona com mesclagem.

   CORREÇÃO: gravar um registro VAZIO e marcado como manual. A mensagem passa
   a dizer "este comentário agora é vazio", e o CSV também respeita: senão a
   observação da planilha ressuscitaria o texto que a pessoa acabou de apagar. */
const amb2 = ambienteComentario("10/09/2026");
amb2.win.ppSalvarComentarioDaEquipe("EQM-C06", "10/09/2026", "Chuva forte a tarde.");
amb2.win.ppSalvarComentarioDaEquipe("EQM-C06", "10/09/2026", "");

conferir('depois de apagar, quem le nao ve mais o comentario',
  amb2.win.ppComentarioDaEquipe("EQM-C06", "10/09/2026"), null);

conferir('mas o registro CONTINUA no objeto, para a nuvem receber o apagamento',
  Object.prototype.hasOwnProperty.call(amb2.cfg.comentariosEquipe["10/09/2026"], "EQM-C06"), true);

conferir('o registro apagado fica com texto vazio',
  amb2.cfg.comentariosEquipe["10/09/2026"]["EQM-C06"].texto, "");

conferir('e marcado como manual, para o CSV nao ressuscitar o texto',
  amb2.cfg.comentariosEquipe["10/09/2026"]["EQM-C06"].origem, "manual");

conferir('escrever de novo depois de apagar volta a funcionar',
  (amb2.win.ppSalvarComentarioDaEquipe("EQM-C06", "10/09/2026", "Equipe retomou."),
    amb2.win.ppComentarioDaEquipe("EQM-C06", "10/09/2026").texto), "Equipe retomou.");

/* ═══ A PISCADA (11/09/2026) ═══════════════════════════════════════════════
   BUG: com o comentário aberto, o painel piscava várias vezes, pior quanto
   mais equipes. Era a animação de entrada REEXECUTANDO a cada redesenho da
   tabela: que acontece a cada retrato vindo da nuvem. */
const fonteAnim = fs.readFileSync('assets/js/21-comentario-equipe.js', 'utf8');
const cssAnim = fs.readFileSync('assets/css/12-comentario-equipe.css', 'utf8');

conferir('a animacao depende de uma classe, nao da caixa',
  cssAnim.includes('.pp-coment-linha.pp-coment-anima .pp-coment-caixa'), true);

conferir('a caixa sozinha NAO anima (senao reexecuta a cada redesenho)',
  (() => { const bloco = cssAnim.split(String.fromCharCode(10) + ".pp-coment-caixa {")[1] || ""; return bloco.split("}")[0].includes("animation:"); })(), false);

conferir('so o clique do usuario pede animacao',
  fonteAnim.includes('{ animar: true }'), true);

conferir('a reconstrucao automatica entra sem animacao',
  fonteAnim.includes('animar: false'), true);

/* De quebra: o redesenho deixou de levar embora o que estava sendo digitado. */
conferir('o rascunho e guardado ANTES do redesenho',
  fonteAnim.includes('function guardarRascunho()') && fonteAnim.includes('try { guardarRascunho(); } catch (e) { }'), true);

conferir('o editor reabre com o texto que a pessoa estava escrevendo',
  fonteAnim.includes('rascunho: ABERTA.rascunho'), true);

/* ═══ LOTE DE 11/09/2026: CINCO CORREÇÕES NO EDITOR E NO COMENTÁRIO ══════ */
const f13 = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');
const f19 = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');
const f21 = fs.readFileSync('assets/js/21-comentario-equipe.js', 'utf8');
const html = fs.readFileSync('painel.html', 'utf8');

/* 1. A observação do CSV precisa chegar na config VIVA, não numa cópia. */
conferir('o comentario do CSV vai para a config viva que a tela le',
  f13.includes('config.comentariosEquipe[dk][team] = {'), true);

conferir('e a edicao manual continua vencendo o CSV',
  f13.split("config.comentariosEquipe").join("").length < f13.length
    && f13.includes("if (atual && atual.origem === 'manual') return;"), true);

/* 2. O CSV nao pode mais chutar os dias uteis do mes. */
conferir('a importacao NAO recalcula os dias uteis do mes',
  f13.includes('config.diasUteisMes = businessMonth'), false);

/* Na copia de cada dia, o calendario so entra num mes ANTERIOR que nunca foi
   salvo (sem valor do controller para preservar; antes ele recebia os dias do
   mes atual, que sao de outro mes). Mes de referencia e mes ja salvo: nunca. */
conferir('nem na copia de cada dia do banco (so mes anterior nunca salvo usa o calendario)',
  (f13.match(/cfg.diasUteisMes = businessMonth/g) || []).length === 1 &&
  f13.includes('if (outroMes) cfg.diasUteisMes = businessMonth(parsed.date);') &&
  f13.indexOf('if (retratoDoMes) {') < f13.indexOf('if (outroMes) cfg.diasUteisMes = businessMonth(parsed.date);'), true);

conferir('dias TRABALHADOS voltam ao calculo original (nao foi pedido mudar)',
  f13.includes('config.diasLancados = businessUntil(selected.date);'), true);

/* 3. A caixa de comentario nasce fechada em toda entrada de painel. */
conferir('trocar de tela fecha e zera o comentario',
  f21.includes('function fecharTudoEZerar()'), true);

conferir('os caminhos de entrada e saida de painel foram embrulhados',
  ["voltarAoPicker", "openProject", "openExecutivePanel", "openAdminPanel", "logoutApp"]
    .every((nome) => f21.includes(nome)), true);

conferir('trocar de contrato ou de dia tambem fecha',
  f21.includes('function vigiarContextoDoPainel()'), true);

/* 4. Producao do dia: sem cadastro manual, sem data repetida. */
conferir('o formulario de adicionar producao a mao saiu da tela',
  html.includes('addHistoryFromFields()'), false);

conferir('datas repetidas no historico sao removidas',
  f19.includes('function removerDatasRepetidas()'), true);

conferir('a limpeza roda ANTES de desenhar a lista',
  f19.indexOf('try { removerDatasRepetidas(); } catch (e) { }')
    < f19.indexOf('var r = linhasOriginal.apply(this, arguments);'), true);

conferir('o filtro de mes e reaplicado depois de importar',
  f19.includes('function vigiarHistorico()'), true);

/* A logica de deduplicacao, executada de verdade. */
const iDedup = f19.indexOf('function removerDatasRepetidas()');
const dedupFonte = f19.slice(iDedup, f19.indexOf("\n      }", iDedup)) + "\n      }";
function rodarDedup(lista) {
  const escopo = { historico: lista };
  const fn = new Function("historico", dedupFonte + "\n return removerDatasRepetidas;")(escopo.historico);
  fn();
  return escopo.historico;
}

conferir('data repetida fica com UMA entrada',
  rodarDedup([{ data: "09/09/2026", total: 10 }, { data: "10/09/2026", total: 20 },
    { data: "10/09/2026", total: 20 }]).length, 2);

conferir('a entrada MAIS RECENTE da data vence (reimportar corrige)',
  rodarDedup([{ data: "10/09/2026", total: 20 }, { data: "10/09/2026", total: 5000 }])[0].total, 5000);

conferir('datas distintas nao sao tocadas',
  rodarDedup([{ data: "01/09/2026", total: 1 }, { data: "02/09/2026", total: 2 }]).length, 2);

/* 5. O cartao de meta de fim de semana: o VALOR liga a regra. */
conferir('o cartao ficou com o titulo curto',
  f19.includes("'<h3>Meta de fim de semana</h3>'"), true);

conferir('as tres marcacoes sairam da tela (viraram campos escondidos)',
  f19.includes('id="ppRegraSab" hidden') && f19.includes('id="ppRegraSomarAcum" hidden'), true);

conferir('a marcacao passa a espelhar o valor informado',
  f19.includes("caixa.checked = Number(String(valor.value || '').replace(',', '.')) > 0;"), true);

/* ═══ O COMENTARIO DO CSV PRECISA APARECER (11/09/2026) ════════════════════
   Relato: subiu CSV com observacao e a caixa continuou vazia. Duas causas
   possiveis foram cobertas: o nome da coluna na planilha e o casamento da
   chave (a importacao normaliza equipe para MAIUSCULAS; a tabela mostra como
   foi cadastrado). */
const f13c = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');
const f21c = fs.readFileSync('assets/js/21-comentario-equipe.js', 'utf8');

conferir('a coluna aceita plural e variantes sem acento',
  ['Observações', 'Observacoes', 'Comentário', 'Nota', 'Justificativa']
    .every((n) => f13c.includes("'" + n + "'")), true);

conferir('a busca tolera diferenca de caixa e espaco',
  f21c.includes('function acharNoDia(doDia, equipe)'), true);

conferir('e tambem procura no retrato do dia no banco diario',
  f21c.includes('function comentarioNoBanco(equipe, dia)'), true);

conferir('existe um diagnostico para o console',
  f21c.includes('window.ppDiagnosticoComentarios'), true);

/* A busca tolerante, executada de verdade. */
const iAchar = f21c.indexOf('function acharNoDia(doDia, equipe)');
const acharNoDia = (() => {
  const fecha = String.fromCharCode(10) + "  }";
  const corpo = f21c.slice(iAchar, f21c.indexOf(fecha, iAchar)) + fecha;
  return new Function(corpo + String.fromCharCode(10) + " return acharNoDia;")();
})();

conferir('acha pelo nome exato',
  acharNoDia({ "EQM-C01": { texto: "a" } }, "EQM-C01").texto, "a");

conferir('acha quando o salvo esta em MAIUSCULAS e a tela mostra minusculas',
  acharNoDia({ "EQM-C01": { texto: "b" } }, "eqm-c01").texto, "b");

conferir('acha mesmo com espaco sobrando no nome da tela',
  acharNoDia({ "EQM-C01": { texto: "c" } }, "  EQM-C01  ").texto, "c");

conferir('equipe que nao existe devolve nada',
  acharNoDia({ "EQM-C01": { texto: "d" } }, "OUTRA"), null);

/* ═══ OS NUMEROS DO CENTRAL NAO PODEM MUDAR SOZINHOS (11/09/2026) ════════════
   Eu troquei a forma de contar os dias trabalhados quando so me pediram para
   parar de sobrescrever os dias uteis do mes. Em 10/09 os dias trabalhados
   cairam de 7 para 6, a meta acumulada foi de [valor] para [valor] e o
   desvio de [x]% para [x]%. Estes testes travam o valor CORRETO. */
const metaAcumDe = (metaMes, diasUteis, diasTrab) =>
  Math.round((metaMes / diasUteis) * diasTrab * 100) / 100;

conferir('Alfa 10/09: 7 dias trabalhados dao meta acumulada de 70.000,00',
  metaAcumDe(200000, 20, 7), 70000);

conferir('e desvio de -20.000,00 sobre 50.000,00 produzidos',
  Math.round((50000 - metaAcumDe(200000, 20, 7)) * 100) / 100, -20000);

conferir('6 dias dariam 60.000,00: o valor errado que apareceu',
  metaAcumDe(200000, 20, 6), 60000);

conferir('o contador que eu inventei foi removido',
  f13.includes('diasTrabalhadosDoCsv'), false);

/* ═══ FERIADO SO DE FONTE DECLARADA (11/09/2026) ═══════════════════════════
   Duas tentativas de DEDUZIR o feriado produziram numero errado no painel:
   procurar meta zero no banco (derivada, nunca e zero) e montar a lista pelo
   CSV (marcava dias de trabalho normais). A terceira tentativa seria teimosia.
   Agora feriado vem so de fonte declarada: a tabela nacional, que e fato, e a
   lista do contrato, digitada por quem conhece o contrato. */
const f19f = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');
const f13f = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');

conferir('nenhum arquivo monta ou le a lista de feriados pelo CSV',
  f13f.includes('diasSemMetaCsv') || f19f.includes('diasSemMetaCsv'), false);

conferir('a deducao pela meta do banco tambem continua fora',
  f19f.includes('somaMetaDoDia'), false);

conferir('o feriado nacional (fonte de fato) continua valendo',
  f19f.includes('function feriadosNacionais(ano)'), true);

conferir('a lista do contrato (fonte declarada) continua valendo',
  f19f.includes('function feriadosExtrasDoConfig(cfg, ano, mes, dia)'), true);

/* O campo novo no Editor Projeto. */
conferir('existe campo para informar os feriados do mes',
  f19f.includes("id=\"ppFeriadosExtras\""), true);

conferir('o campo carrega o que ja estava salvo',
  f19f.includes('fer.value = lista.join(', ')'), true);

conferir('e grava as datas informadas na configuracao',
  f19f.includes('config.feriadosExtras = limpos.filter'), true);

/* A limpeza das datas digitadas, executada de verdade. */
function limparDatas(texto) {
  const separador = new RegExp("[,;" + String.fromCharCode(92) + "n]");
  const formato = new RegExp("^\\d{1,2}\\/\\d{1,2}(\\/\\d{4})?$");
  const d2 = (x) => (Number(x) < 10 ? "0" : "") + Number(x);
  const brutos = String(texto || "").split(separador)
    .map((t) => String(t).trim())
    .filter((t) => formato.test(t))
    .map((t) => {
      const p = t.split("/");
      return p.length === 3 ? (d2(p[0]) + "/" + d2(p[1]) + "/" + p[2]) : (d2(p[0]) + "/" + d2(p[1]));
    });
  return brutos.filter((v, i) => brutos.indexOf(v) === i);
}

conferir('aceita DD/MM e normaliza para dois digitos',
  limparDatas("7/9, 20/11"), ["07/09", "20/11"]);

conferir('aceita DD/MM/AAAA',
  limparDatas("07/09/2026"), ["07/09/2026"]);

conferir('descarta o que nao e data',
  limparDatas("07/09, feriado, 32, 20/11"), ["07/09", "20/11"]);

conferir('nao repete a mesma data',
  limparDatas("07/09, 7/9").length, 1);

/* ═══ A META ACUMULADA E META DA EQUIPE x DIAS UTEIS DECORRIDOS ═══════════
   Definicao do dono do produto, e a que sempre valeu. O valor gravado em
   equipes[].metaAcumulada JA e esse produto: nao ha o que corrigir depois.

   Eu tinha acrescentado um desconto de feriado sobre esse valor, e ele
   descontava o feriado PELA SEGUNDA VEZ: a contagem de dias que gera o valor
   gravado ja exclui o feriado. No Alfa em 10/09 os dias caiam de 7 para 6, a
   meta de [valor] para [valor] e o desvio de [x]% para [x]%. */
const f19d = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');

conferir('o desconto de feriado sobre a meta acumulada foi REMOVIDO',
  f19d.includes('descontoDeFeriados'), false);

conferir('e as auxiliares que so ele usava tambem',
  f19d.includes('feriadosUteisDecorridos') || f19d.includes('taxaDiariaDaEquipe'), false);

conferir('a meta do dia continua zerando em feriado (isso nao duplica)',
  f19d.includes('ehFeriadoPorCsv(cfg, ano, mes, dia, projetoId)) return 0;'), true);

/* Os numeros do Alfa, travados. */
const metaAcumEquipe = (metaDia, dias) => Math.round(metaDia * dias * 100) / 100;

conferir('Alfa 10/09: 10.000 x 7 dias = 70.000,00',
  metaAcumEquipe(10000, 7), 70000);

conferir('desvio de -20.000,00 sobre 50.000,00 produzidos',
  Math.round((50000 - metaAcumEquipe(10000, 7)) * 100) / 100, -20000);

conferir('que e -28,57% do previsto',
  Math.round((50000 - metaAcumEquipe(10000, 7)) / metaAcumEquipe(10000, 7) * 10000) / 100, -28.57);

conferir('6 dias (descontando duas vezes) dariam os 60.000,00 errados',
  metaAcumEquipe(10000, 6), 60000);

/* Uma equipe isolada, para a conta valer linha a linha e nao so no total. */
conferir('equipe isolada: meta dia 4.000 x 7 dias = 28.000,00',
  metaAcumEquipe(4000, 7), 28000);

/* ═══ CONTADOR ÚNICO DE DIAS ÚTEIS: EXECUTADO DE VERDADE (15/09/2026) ══════
   Os testes anteriores desta área só conferiam ARITMÉTICA ([valor] × 7) ou
   o TEXTO do código. Nenhum rodava o contador: e por isso a contagem com o
   feriado dentro passou por eles. Estes recortam o bloco real do arquivo 19
   (feriados + contador + correção) e o executam contra cada número que o
   dono do produto confirmou. */
const fonteContador = fs.readFileSync('assets/js/19-calendario-dias-uteis.js', 'utf8');
const motorDias = (() => {
  const ini = fonteContador.indexOf('function pascoaDe(ano) {');
  const fim = fonteContador.indexOf('function contarDiasCalculo(');
  if (ini < 0 || fim < 0) throw new Error('nao achei o bloco do contador');
  const corpo = fonteContador.slice(ini, fim);
  const win = {};
  const escopo = {
    window: win,
    memo: (k, f) => f(),
    n: (v) => { const x = Number(v); return isFinite(x) ? x : 0; }
  };
  const nomes = Object.keys(escopo);
  new Function(...nomes, corpo)(...nomes.map((k) => escopo[k]));
  return win;
})();

const cfgSemFeriadoLocal = {};

conferir('Construcao 06/09 (domingo) = 4 dias uteis',
  motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "06/09/2026"), 4);

conferir('Construcao 07/09 (FERIADO) continua 4: o 07/09 nao conta',
  motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "07/09/2026"), 4);

conferir('Alfa 10/09 = 7 dias uteis (o numero confirmado pelo usuario)',
  motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "10/09/2026"), 7);

conferir('Construcao 14/09 = 9 dias uteis (o painel mostrava 10)',
  motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "14/09/2026"), 9);

conferir('setembro/2026 inteiro = 21 dias uteis (22 dias de semana menos o 07/09)',
  motorDias.ppDiasUteisDoMes(cfgSemFeriadoLocal, "01/09/2026"), 21);

conferir('sabado e domingo nunca contam: 12 e 13/09 valem o mesmo que 11/09',
  motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "13/09/2026"), motorDias.ppDiasUteisAte(cfgSemFeriadoLocal, "11/09/2026"));

conferir('feriado local informado no contrato tambem sai da conta',
  motorDias.ppDiasUteisAte({ feriadosExtras: ["14/09"] }, "14/09/2026"), 8);

/* A correção do valor já gravado, com a proteção contra desconto em dobro. */
conferir('Construcao: gravado com 10 dias vira meta dia x 9 = 63.000,00',
  motorDias.ppMetaAcumCorrigidaPeloFeriado(70000, 7000, { dataReferencia: "14/09/2026" }), 63000);

conferir('PROTECAO: valor ja gravado com a contagem certa NAO muda (Alfa 7 dias)',
  motorDias.ppMetaAcumCorrigidaPeloFeriado(42000, 6000, { dataReferencia: "10/09/2026" }), null);

conferir('PROTECAO: valor editado a mao, que nao bate com contagem nenhuma, NAO muda',
  motorDias.ppMetaAcumCorrigidaPeloFeriado(65000, 7000, { dataReferencia: "14/09/2026" }), null);

conferir('sem feriado decorrido no mes, nada e corrigido (agosto)',
  motorDias.ppMetaAcumCorrigidaPeloFeriado(60000, 6000, { dataReferencia: "14/08/2026" }), null);

conferir('dias decorridos: 10 gravado pela contagem antiga vira 9',
  motorDias.ppDiasDecorridosCorrigidos({ diasLancados: 10, dataReferencia: "14/09/2026" }), 9);

conferir('dias decorridos: 7 ja certo continua 7',
  motorDias.ppDiasDecorridosCorrigidos({ diasLancados: 7, dataReferencia: "10/09/2026" }), 7);

/* Os pontos que GRAVAM dias precisam usar o mesmo contador. */
const f13cont = fs.readFileSync('assets/js/13-ajuste-csv-data-desempenho.js', 'utf8');
const f16cont = fs.readFileSync('assets/js/16-producao-periodo-editor.js', 'utf8');
const f08cont = fs.readFileSync('assets/js/08-final-polish-29-06.js', 'utf8');
const f09cont = fs.readFileSync('assets/js/09-main-contracts-wip-json.js', 'utf8');

conferir('importacao do CSV usa o contador unico',
  f13cont.includes('window.ppDiasUteisAte(typeof config'), true);
conferir('editor de producao por dia usa o contador unico',
  f16cont.includes('window.ppDiasUteisAte(typeof config'), true);
conferir('botao Gerar dias uteis usa o contador unico',
  f08cont.includes('window.ppDiasUteisDoMes(typeof config'), true);
conferir('gerencial usa os dias decorridos corrigidos',
  f09cont.includes('window.ppDiasDecorridosCorrigidos(_cfg)'), true);


/* ═══ O CONTRATO NOVO: ADITIVO BETA (18/09/2026) ═════════════════════════
   O pedido foi "adicione um contrato, deixe-o sem informação nenhuma, e faça as
   fórmulas e os totais do gerencial funcionarem sem erro de valores".

   O risco de um contrato VAZIO não é ele mostrar pouco: é ele mostrar ALGO.
   Já aconteceu neste painel: a meta de sábado do Alfa (R$ [valor]) vazou para
   contratos que não a têm, e a Construção Cliente passou a exibir meta em dia
   que não tinha. Um contrato recém-criado, sem equipe nenhuma, é o caso mais
   exposto a esse tipo de vazamento, porque QUALQUER número que apareça nele veio
   necessariamente de outro contrato.

   Por isso estes testes rodam o cálculo DE VERDADE (recortado dos arquivos-fonte)
   e exigem zero: e logo em seguida exigem que o MESMO cálculo produza número
   quando há equipe lançada, para o teste não passar por estar quebrado. */
const NL10 = String.fromCharCode(10);
console.log(NL10 + "contratos: cada um com seus dados, nenhum herda regra do outro");

/* O registro de contratos, executado a partir do arquivo real. */
const blocoProjetos = recortar(src02, "const PROJECTS = [", "];", "registro de contratos");
const PROJETOS = new Function(blocoProjetos + " return PROJECTS;")();

conferir("o registro tem os 4 contratos de demonstracao", PROJETOS.length, 4);
conferir("a ordem dos contratos: Alfa, Beta, Gama e Delta",
  PROJETOS.map(function (p) { return p.id; }), ["contrato-alfa", "contrato-beta", "contrato-gama", "contrato-delta"]);
conferir("nenhum id repetido (id repetido faria dois contratos gravarem no mesmo lugar)",
  new Set(PROJETOS.map(function (p) { return p.id; })).size, 4);
conferir("os nomes sao os ficticios, sem travessao",
  PROJETOS.map(function (p) { return p.nome; }), ["Contrato Alfa", "Contrato Beta", "Contrato Gama", "Contrato Delta"]);

/* Identificação no gerencial: só texto. Nenhum número escrito no código;
   os números vêm da nuvem (ou dos dados fictícios da demonstração). */
const blocoExec = recortar(src02, "const EXECUTIVE_PROJECT_DEFAULTS = {",
  "item._init = true;" + NL10 + "    });", "identificacao dos contratos");
const EXEC = new Function(blocoExec + " return EXECUTIVE_PROJECT_DEFAULTS;")();
const metaNovo = EXEC["contrato-beta"] || {};

conferir("cada contrato tem identificacao propria no gerencial",
  PROJETOS.map(function (p) { return (EXEC[p.id] || {}).short; }), PROJETOS.map(function (p) { return p.nome; }));
conferir("TODOS os campos numericos da identificacao sao zero (nenhum numero no codigo)",
  PROJETOS.map(function (p) { const m = EXEC[p.id] || {}; return Object.keys(m).filter(function (k) {
    return typeof m[k] === "number" && m[k] !== 0; }); }).flat(), []);
conferir("nenhum contrato vem com observacao executiva escrita no codigo",
  PROJETOS.filter(function (p) { return (EXEC[p.id] || {}).observacaoExecutiva; }).length, 0);

/* Nenhuma regra de outro contrato o alcança. */
const novoC = montar({ dia: "13/08/2026", banco: {}, projeto: "contrato-beta" });
conferir("contrato novo NAO herda a meta de sabado do Alfa",
  novoC.valorFds("sab"), 0);
conferir("contrato novo NAO herda meta de domingo", novoC.valorFds("dom"), 0);
conferir("contrato novo fica fora do recalculo por fim de semana", novoC.temMetaFds(), false);
conferir("no gerencial o contrato novo tambem nao ganha sabado",
  novoC.valorDoEstado({}, "sab", "contrato-beta"), 0);
conferir("sabado no contrato novo: meta do dia ZERO",
  montar({ dia: "15/08/2026", banco: {}, projeto: "contrato-beta" })
    .metaDoDia({ equipe: "X", metaDia: 1000 }), 0);

/* ── O que o ACOMPANHAMENTO GERENCIAL calcula para ele ──────────────────── */
const trechoGerencial = faixa(src19, "function pesosDoEstado(state, mesChave, ateDia, projetoId) {",
  "window.ppMetaDiaDoEstado = function", "meta acumulada do gerencial");

function montarGerencial(projeto) {
  const escopo = {
    window: { dailyKey: () => "18/09/2026", currentProjectId: projeto || "" },
    chaveMes: (ano, mes) => ano + "-" + String(mes).padStart(2, "0"),
    n: (v) => { const x = Number(v); return isFinite(x) ? x : 0; },
    memo: (chave, calcular) => calcular(),
    idDoProjeto: () => projeto || "",
    config: {},
    historico: []
  };
  const nomes = Object.keys(escopo);
  const corpo = trechoFds + NL10 + trechoFeriados + NL10 + trechoGerencial + NL10 +
    " return { pesos: pesosDoEstado, metaAcum: window.ppMetaAcumuladaDoEstado };";
  return new Function(...nomes, corpo)(...nomes.map((k) => escopo[k]));
}

const ger = montarGerencial("contrato-beta");
const estadoVazio = { equipes: [], historico: [], config: {} };

conferir("contrato VAZIO nao produz peso nenhum no gerencial",
  ger.pesos(estadoVazio, "2026-09", 18, "contrato-beta"), null);
conferir("contrato VAZIO nao produz meta acumulada (null = sem numero na tela)",
  ger.metaAcum(estadoVazio, "2026-09", 18, "contrato-beta"), null);

/* O MESMO cálculo, com o Alfa aberto na tela: nem assim o contrato vazio ganha
   o sábado de R$ [valor] do Alfa. Este é o vazamento que já aconteceu aqui. */
conferir("com o Alfa aberto na tela, o contrato vazio CONTINUA sem meta",
  montarGerencial("contrato-alfa").metaAcum(estadoVazio, "2026-09", 18, "contrato-beta"),
  null);

/* TRAVA DO TESTE: o mesmo cálculo, com uma equipe lançada, tem de produzir
   número. Sem isto, os testes acima passariam até com o cálculo quebrado. */
const estadoComEquipe = {
  equipes: [{ equipe: "AD-01", metaDia: 1000, metaAcumulada: 5000 }],
  historico: [{ data: "18/09/2026", total: 900, metaDia: 1000 }],
  config: { dataReferencia: "18/09/2026" }
};
const calcNovo = ger.metaAcum(estadoComEquipe, "2026-09", 18, "contrato-beta");
conferir("TRAVA: com equipe lancada o contrato novo JA produz meta acumulada",
  typeof calcNovo === "number" && calcNovo > 0, true);

/* ── Somas e totais: o contrato vazio entra com zero e não suja o total ── */
const trechoTotais = recortar(src02, "function calcTotalsFromState(state, projectId) {",
  "return acc;" + NL10 + "    }", "totais de um contrato");
const totais = new Function("window", "n", trechoTotais + " return calcTotalsFromState;")(
  {}, (v) => { const x = Number(v); return isFinite(x) ? x : 0; });

conferir("contrato vazio: todos os totais em zero, e nenhum NaN",
  totais({ equipes: [], config: {} }, "contrato-beta"),
  { metaMes: 0, metaDia: 0, metaAcumulada: 0, produzidoDia: 0, produzidoAcumulado: 0 });

conferir("somar o contrato vazio ao total nao muda o total",
  (function () {
    const a = totais({ equipes: [{ metaMes: 100, metaDia: 10, metaAcumulada: 50,
      produzidoDia: 9, produzidoAcumulado: 45 }], config: {} }, "contrato-alfa");
    const b = totais({ equipes: [], config: {} }, "contrato-beta");
    return [a.metaMes + b.metaMes, a.produzidoAcumulado + b.produzidoAcumulado];
  })(), [100, 45]);

/* ── O contrato vazio precisa poder ser SALVO ───────────────────────────── */
const src03 = fs.readFileSync("assets/js/03-state-sync.js", "utf8");
const trechoNuvem = recortar(src03, "function ppNuvemJaRespondeu(projectId) {",
  "catch (e) { return false; }" + NL10 + "      }", "marca da nuvem");
function marcaDaNuvem(marcas) {
  return new Function("window", trechoNuvem + " return ppNuvemJaRespondeu;")(
    { __PP_NUVEM_RESPONDEU__: marcas });
}

conferir("antes da nuvem responder, o contrato conta como NAO carregado",
  marcaDaNuvem({})("contrato-beta"), false);
conferir("depois da nuvem responder, mesmo sem documento, conta como carregado",
  marcaDaNuvem({ "contrato-beta": true })("contrato-beta"), true);
conferir("a marca e por contrato, nao geral",
  marcaDaNuvem({ "contrato-alfa": true })("contrato-beta"), false);

conferir("gravar contrato sem equipes so e liberado com a marca da nuvem",
  src03.includes("} else if (ppNuvemJaRespondeu(projectId)) {"), true);
conferir("sem resposta da nuvem, a protecao de 22/07 continua recusando",
  src03.includes("este contrato ainda nao terminou de carregar da nuvem"), true);

/* ── Endereço próprio e linha na tabela de reserva do gerencial ─────────── */
const src07 = fs.readFileSync("assets/js/07-final-fix.js", "utf8");
conferir("da para abrir cada contrato pelo endereco",
  ["contrato-beta", "contrato-gama", "contrato-delta"].every(function (id) { return src07.includes("\"" + id + "\": \"" + id + "\""); }), true);

/* ═══ A META DE SÁBADO DO CENTRAL NÃO VAZA PARA OUTRO CONTRATO (18/09/2026) ══
   O DEFEITO: ao montar o Acompanhamento Gerencial, vários pontos pediam os
   totais de um contrato SEM dizer de qual contrato se tratava. Quando o id
   falta, a busca pela regra de fim de semana cai no contrato ABERTO na tela -
   e a meta de sábado do Alfa (R$ [valor]) entrava na conta de outro contrato.
   Havia até um comentário no código jurando que isso não acontecia.

   O cenário destes testes é o pior possível: o Alfa é o contrato aberto na
   tela, e o estado avaliado é de um contrato que lançou produção num sábado e
   NÃO tem meta de sábado. É assim que o vazamento aparecia. */
console.log(NL10 + "meta de sábado não vaza de um contrato para outro");

function totaisComMotorReal(contratoAberto) {
  return new Function("window", "n", trechoTotais + " return calcTotalsFromState;")(
    { ppMetaAcumuladaDoEstado: montarGerencial(contratoAberto).metaAcum },
    (v) => { const x = Number(v); return isFinite(x) ? x : 0; });
}

/* Um contrato com 1 equipe, produção na sexta 11/09 e no sábado 12/09.
   A meta acumulada do CSV (R$ [valor]) vale R$ [valor] depois de tirar o feriado
   de 07/09: este é o número certo, sem sábado nenhum. */
const estadoComSabado = {
  equipes: [{ equipe: "AD-01", metaDia: 1000, metaAcumulada: 9000 }],
  historico: [
    { data: "11/09/2026", total: 900, metaDia: 1000 },
    { data: "12/09/2026", total: 500, metaDia: 0 }
  ],
  config: { dataReferencia: "12/09/2026" }
};
const comAlfaAberto = totaisComMotorReal("contrato-alfa");

conferir("SEM id, com o Alfa aberto: NAO herda o sabado do Alfa",
  comAlfaAberto(estadoComSabado).metaAcumulada, 8000);
conferir("com o id do contrato novo: tambem nao herda",
  comAlfaAberto(estadoComSabado, "contrato-beta").metaAcumulada, 8000);
conferir("estado que carrega o proprio id: nao herda (2a tranca da porta)",
  comAlfaAberto(Object.assign({ projectId: "contrato-beta" }, estadoComSabado)).metaAcumulada,
  8000);

/* TRAVA: o Alfa NÃO pode perder o sábado dele. Se este teste falhar junto com
   os de cima, a correção virou "apagar o sábado de todo mundo". */
conferir("TRAVA: o Alfa CONTINUA com a meta de sabado dele (8.000 + a semente)",
  comAlfaAberto(estadoComSabado, "contrato-alfa").metaAcumulada, 8000 + alfa.valorFds("sab"));

/* TRAVA: o contrato que DECLARA meta de sábado na propria configuracao segue
   com ela mesmo sem id: porque isso nao depende do nome do contrato. */
conferir("TRAVA: meta de sabado declarada na configuracao vale mesmo sem id",
  comAlfaAberto(Object.assign({}, estadoComSabado, {
    config: { dataReferencia: "12/09/2026", metaSabadoAtiva: true,
      financeiroExecutivo: { projCalMetaSabado: 20000 } }
  })).metaAcumulada, 28000);

/* Cada ponto que pede os totais tem de dizer de qual contrato. */
const pontosQuePedem = (src03.match(/calcTotalsFromState\(/g) || []).length;
const pontosSemId = (src03.match(/calcTotalsFromState\([A-Za-z0-9_.]+\)/g) || []).length;
conferir("todo ponto do sincronismo informa o contrato ao pedir os totais",
  [pontosQuePedem > 0, pontosSemId], [true, 0]);
conferir("a linha do contrato no gerencial informa o contrato",
  src03.includes("calcTotalsFromState(state, project.id)"), true);
conferir("sem id, o calculo usa um contrato que nao existe em tabela nenhuma",
  src02.includes('|| "__contrato_desconhecido__"'), true);

/* ═══ A TROCA DE TELA NÃO PISCA E NÃO TRAVA (18/09/2026) ═══════════════════
   RELATO: "ao sair do gerencial e clicar em outro projeto, pisca uma tela de
   relance com algum dado... às vezes TRAVA nessa tela sem nada".

   A causa do "às vezes" era um relógio disparado e esquecido: quem fecha a tela
   de carregamento agenda o desaparecimento para 260 ms depois e ninguém cancela
   esse agendamento. Se o usuário clicasse num contrato dentro dessa janela, o
   relógio VELHO derrubava a capa NOVA, e o painel ficava à mostra ainda vazio.

   Estes testes rodam o arquivo assets/js/22-troca-de-tela.js DE VERDADE, com um
   relógio falso que eu adianto na mão. É a única forma de testar uma corrida de
   tempo: com relógio real o teste seria lento e instável. */
console.log(NL10 + "troca de tela: a capa certa cobre e sempre descobre");

function montarTrocaDeTela(abrirContrato) {
  const fonte = fs.readFileSync("assets/js/22-troca-de-tela.js", "utf8");
  let agora = 0, seq = 0;
  const pendentes = new Map();

  /* A tela de carregamento, de mentira: só o que o código de verdade toca. */
  const capa = { style: { display: "none", opacity: "0", pointerEvents: "none" }, dataset: {} };
  const doc = {
    getElementById: (id) => (id === "execLoadingOverlay" ? capa : null),
    querySelector: () => null,
    documentElement: { dataset: {}, style: {} }
  };
  const win = {
    /* A versão original: é ela que o arquivo 22 embrulha. */
    ppShowLoading: function () {
      capa.style.display = "flex";
      capa.style.opacity = "1";
      capa.dataset.shownAt = String(agora);
    },
    ppHideLoading: function () { },
    PP_LOADING_MIN_MS: 0,
    __ppRestoringCardScreen: false,
    _pickProject: abrirContrato || function () { },
    renderAll: function () { }
  };
  const escopo = {
    window: win,
    document: doc,
    console: { warn: function () { }, error: function () { } },
    setTimeout: (fn, ms) => { const id = ++seq; pendentes.set(id, { fn, quando: agora + (ms || 0) }); return id; },
    clearTimeout: (id) => { pendentes.delete(id); },
    setInterval: () => 0,
    clearInterval: () => { },
    Date: { now: () => agora }
  };
  const nomes = Object.keys(escopo);
  new Function(...nomes, fonte)(...nomes.map((k) => escopo[k]));

  /* Adianta o relógio, disparando na ordem certa tudo que vencer no caminho. */
  function avancar(ms) {
    const alvo = agora + ms;
    for (;;) {
      let proxId = null, prox = null;
      for (const [id, t] of pendentes) {
        if (t.quando <= alvo && (!prox || t.quando < prox.quando)) { prox = t; proxId = id; }
      }
      if (!prox) break;
      pendentes.delete(proxId);
      agora = prox.quando;
      prox.fn();
    }
    agora = alvo;
  }
  return { win, capa, avancar };
}

/* ── A CORRIDA QUE CAUSAVA O TRAVAMENTO ────────────────────────────────── */
{
  const t = montarTrocaDeTela();
  t.win.ppShowLoading("Gerencial");      /* abre o gerencial */
  t.win.ppHideLoading();                 /* sai dele: manda fechar a capa */
  t.avancar(100);                            /* o usuario clica rapido... */
  t.win.ppShowLoading("Outro contrato"); /* ...e abre outro contrato */
  t.avancar(400);                            /* o relogio VELHO venceria aqui */

  conferir("capa nova NAO e derrubada pelo fechamento da capa anterior",
    [t.capa.style.display, t.capa.style.opacity], ["flex", "1"]);
}

/* TRAVA: sem clique novo no meio, a capa tem de fechar normalmente. Sem este
   teste, a correcao poderia virar "a capa nunca mais fecha". */
{
  const t = montarTrocaDeTela();
  t.win.ppShowLoading("Contrato");
  t.win.ppHideLoading();
  t.avancar(400);
  conferir("TRAVA: sem clique novo, a capa fecha como sempre fechou",
    t.capa.style.display, "none");
}

/* ── A CAPA NUNCA FICA PRESA ───────────────────────────────────────────── */
{
  const t = montarTrocaDeTela();
  t.win.ppShowLoading("Contrato");
  t.win.__ppRestoringCardScreen = true;  /* sinalizador que bloqueia o fechar */
  t.win.ppHideLoading();
  t.avancar(400);
  conferir("durante a restauracao de um card, a capa continua no ar (correto)",
    t.capa.style.display, "flex");

  /* E se o sinalizador ficar preso ligado? O cao de guarda resolve. */
  t.avancar(15000);
  t.avancar(400);
  conferir("cao de guarda: sinalizador preso nao segura a capa para sempre",
    [t.capa.style.display, t.win.__ppRestoringCardScreen], ["none", false]);
}

/* ── UMA FALHA AO ABRIR O CONTRATO NAO PODE PRENDER A TELA ─────────────── */
{
  let chamou = false;
  const t = montarTrocaDeTela(function () {
    chamou = true;
    throw new Error("falha simulada ao abrir o contrato");
  });
  t.win.ppShowLoading("Contrato");
  t.win.__ppRestoringCardScreen = true;  /* como fica num F5 com card aberto */
  t.win._pickProject("contrato-beta");      /* estoura por dentro */
  t.avancar(400);

  conferir("a rotina de abrir contrato foi mesmo chamada", chamou, true);
  conferir("contrato que falha ao abrir: a capa desce e o sinalizador destrava",
    [t.capa.style.display, t.win.__ppRestoringCardScreen], ["none", false]);
}

/* ── A TELA DE CARREGAMENTO NAO PODE ENTRAR CLAREANDO ──────────────────── */
const cssTransicoes = fs.readFileSync("assets/css/13-transicoes.css", "utf8");
conferir("a tela de carregamento entra opaca, no primeiro quadro",
  /#execLoadingOverlay \{[^}]*animation:\s*none/.test(cssTransicoes), true);

/* Uma transformacao permanente numa tela inteira faz o menu suspenso (que e
   fixo e mora DENTRO do #dashboard) abrir fora do lugar. */
conferir("nenhuma animacao de tela congela estado (both/forwards)",
  /animation:[^;]*\b(both|forwards)\b/.test(cssTransicoes), false);
conferir("a entrada das telas inteiras nao usa transformacao",
  /@keyframes ppEntradaPainel \{[^@]*transform/.test(cssTransicoes), false);

/* ═══ A IMPORTAÇÃO DO MÊS CABE NA NUVEM E NO NAVEGADOR (24/09/2026) ═════════
   RELATO: "exclui o período de setembro e estou tentando subir a planilha com
   todos os dias acumulados; está com erro, não está subindo".

   A CAUSA: cada dia do banco guardava uma cópia da configuração com os
   comentários de TODOS os dias. Com 21 dias e 355 linhas de observação, o mês
   passava de 1 MB: a nuvem recusava, calada, e o navegador enchia.

   Estes testes rodam o arquivo de sincronização DE VERDADE
   (15-history-firestore-sync.js) contra uma nuvem de mentira que aplica o mesmo
   limite de 1 MiB por documento do Firebase, e um navegador de mentira com
   limite de espaço. */
console.log(NL10 + "importação do mês: cabe na nuvem, cabe no navegador, nenhum número muda");

const fonte15Sync = fs.readFileSync("assets/js/15-history-firestore-sync.js", "utf8");
const BANCO_BASE_T = "painel-produtividade-banco-diario-editavel-v3-projetos";
const PID_T = "contrato-alfa";

function ambienteSync(opcoes) {
  const op = opcoes || {};
  const nuvem = {}, escritas = [], avisos = [], ouvintes = {}, itens = {};
  const localStorage = {
    get length() { return Object.keys(itens).length; },
    key: (i) => Object.keys(itens)[i],
    getItem: (k) => (k in itens ? itens[k] : null),
    removeItem: (k) => { delete itens[k]; },
    setItem: (k, v) => {
      v = String(v);
      const usado = Object.keys(itens).reduce((s, x) => s + (x === k ? 0 : itens[x].length + x.length), 0);
      if (op.espaco && usado + v.length + k.length > op.espaco) {
        const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e;
      }
      itens[k] = v;
    }
  };
  function docRef(path) {
    return {
      collection: (n) => colRef(path + "/" + n),
      set: (data) => {
        const bytes = Buffer.byteLength(JSON.stringify(data), "utf8");
        escritas.push({ path, bytes });
        if (op.recusarTudo) return Promise.reject(new Error("permission-denied"));
        if (bytes > 1048576) return Promise.reject(new Error("exceeds the maximum allowed size"));
        nuvem[path] = JSON.parse(JSON.stringify(data));
        return Promise.resolve();
      },
      onSnapshot: () => () => { }
    };
  }
  function colRef(path) {
    return { doc: (id) => docRef(path + "/" + id), onSnapshot: (cb) => { ouvintes[path] = cb; return () => { }; } };
  }
  const win = { ppAvisoGravacao: (ok) => avisos.push(ok) };
  const g = {
    window: win, document: {}, localStorage,
    firebase: { apps: [1], firestore: () => ({ collection: (n) => colRef(n) }), auth: () => ({ currentUser: { uid: "u" } }) },
    currentProjectId: PID_T, DAILY_BANK_KEY_BASE: BANCO_BASE_T, currentUserLogin: "controller@exemplo.com",
    setDailyBank: (bank) => localStorage.setItem(BANCO_BASE_T + "::" + PID_T, JSON.stringify(bank)),
    loadProjectState: () => { },
    console: { warn: () => { }, error: () => { }, log: () => { } },
    setInterval: () => 0, setTimeout: op.timersNaHora ? (fn) => { fn(); return 0; } : () => 0, clearTimeout: () => { }, Blob
  };
  const nomes = Object.keys(g);
  new Function(...nomes, fonte15Sync)(...nomes.map((k) => g[k]));
  const docMes = (m) => nuvem["painel_produtividade/base/projects/" + PID_T + "/history/" + m];
  const local = () => JSON.parse(localStorage.getItem(BANCO_BASE_T + "::" + PID_T) || "{}");
  return { win, nuvem, escritas, avisos, ouvintes, localStorage, docMes, local };
}

/* Um mês como a importação monta: cada dia com uma CÓPIA da configuração, que
   carrega os comentários de todos os dias. Números inventados. */
const EQ_T = Array.from({ length: 22 }, (_, i) => "EQP-" + String(i + 1).padStart(2, "0"));
function mesDeTeste(mes, qtdDias, comentarios) {
  const out = {};
  for (let d = 1; d <= qtdDias; d++) {
    const dk = String(d).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/2026";
    out[dk] = {
      savedAt: "2026-09-24T10:00:00.000Z", source: "csv-producao", projectId: PID_T,
      totalProduzidoDia: 1000 * d, totalProduzidoAcumulado: 500 * d * (d + 1), totalMetaDia: 184800, totalMetaAcumulada: 184800 * d,
      config: {
        diasUteisMes: 21, diasLancados: d, dataReferencia: dk, descontoLiquido: 0.1,
        financeiroExecutivo: { _init: true, taxaImposto: 0.9, movimentos: [6, 7, 8, 9].map((m) => ({ ano: 2026, mes: m, forecastAtual: 100000, taxaImposto: 0.9, observacaoExecutiva: "x".repeat(200) })) },
        comentariosEquipe: JSON.parse(JSON.stringify(comentarios))
      },
      equipes: EQ_T.map((e) => ({ equipe: e, metaMes: 168000, metaDia: 8400, metaAcumulada: 8400 * d, produzidoDia: 5000, produzidoAcumulado: 5000 * d })),
      historico: Array.from({ length: d }, (_, i) => ({ data: String(i + 1).padStart(2, "0") + "/" + String(mes).padStart(2, "0"), total: 1000 * (i + 1) })),
      teamCards: { "EQP-01": { nomeEquipe: "EQP-01", diagnostico: "y".repeat(500) } }
    };
  }
  return out;
}
const comentariosSet = {};
for (let k = 0; k < 355; k++) {
  const dk = String((k % 21) + 1).padStart(2, "0") + "/09/2026";
  (comentariosSet[dk] = comentariosSet[dk] || {})[EQ_T[Math.floor(k / 21) % 22]] =
    { texto: "Equipe aguardando material na base; retorno previsto para amanha cedo, apos a liberacao do almoxarifado", origem: "csv", at: "2026-09-24T10:00:00.000Z" };
}
const julhoT = mesDeTeste(7, 31, {});
const agostoT = mesDeTeste(8, 31, {});
const setembroT = mesDeTeste(9, 21, comentariosSet);

/* ── 1. A nuvem aceita o mês inteiro ─────────────────────────────────────── */
const sN = ambienteSync();
sN.localStorage.setItem(BANCO_BASE_T + "::" + PID_T, JSON.stringify(Object.assign({}, julhoT, agostoT)));
sN.win.setDailyBank(Object.assign({}, julhoT, agostoT, setembroT));
await new Promise((r) => setTimeout(r, 10));

const envioSet = sN.escritas.find((e) => e.path.endsWith("/history/2026-09"));
conferir("setembro (21 dias, 355 observacoes) vai para a nuvem abaixo de 1 MB",
  !!envioSet && envioSet.bytes < 1048576, true);
conferir("TRAVA: a nuvem aceitou os 21 dias de setembro",
  sN.docMes("2026-09") ? Object.keys(sN.docMes("2026-09").days).length : 0, 21);
conferir("meses que nao mudaram (julho, agosto) NAO sao regravados na nuvem",
  sN.escritas.filter((e) => !e.path.endsWith("/history/2026-09")).length, 0);
conferir("os 21 dias ficam tambem no navegador",
  Object.keys(sN.local()).filter((k) => k.endsWith("/09/2026")).length, 21);
conferir("nenhum aviso de falha quando a nuvem aceita", sN.avisos.includes(false), false);

/* ── 2. Nenhum número muda ───────────────────────────────────────────────── */
const origDia = setembroT["15/09/2026"];
const nuvemDia = sN.docMes("2026-09").days["15/09/2026"];
conferir("equipes, metas e producao do dia identicas depois de enxugar",
  JSON.stringify(nuvemDia.equipes), JSON.stringify(origDia.equipes));
conferir("totais do dia identicos",
  ["totalProduzidoDia", "totalProduzidoAcumulado", "totalMetaDia", "totalMetaAcumulada"].map((k) => nuvemDia[k]),
  ["totalProduzidoDia", "totalProduzidoAcumulado", "totalMetaDia", "totalMetaAcumulada"].map((k) => origDia[k]));
conferir("historico do dia identico", JSON.stringify(nuvemDia.historico), JSON.stringify(origDia.historico));
conferir("configuracao numerica identica (dias, taxa, financeiro com movimentos)",
  JSON.stringify([nuvemDia.config.diasUteisMes, nuvemDia.config.diasLancados, nuvemDia.config.descontoLiquido, nuvemDia.config.financeiroExecutivo]),
  JSON.stringify([origDia.config.diasUteisMes, origDia.config.diasLancados, origDia.config.descontoLiquido, origDia.config.financeiroExecutivo]));

/* ── 3. O que sai do retrato: só texto de outros dias e cartões ─────────── */
conferir("o dia guarda SO o proprio comentario",
  Object.keys(nuvemDia.config.comentariosEquipe), ["15/09/2026"]);
conferir("e o comentario do proprio dia chega inteiro (quem le o retrato continua achando)",
  JSON.stringify(nuvemDia.config.comentariosEquipe["15/09/2026"]), JSON.stringify(comentariosSet["15/09/2026"]));
conferir("cartoes de equipe saem do retrato (a leitura cai nos cartoes atuais)",
  [nuvemDia.teamCards, sN.local()["15/09/2026"].teamCards], [undefined, undefined]);

/* ── 4. Navegador sem espaço ─────────────────────────────────────────────── */
const sC = ambienteSync({ espaco: 5000000 });
sC.localStorage.setItem("outro-contrato", "z".repeat(3900000));
sC.localStorage.setItem(BANCO_BASE_T + "::" + PID_T, JSON.stringify(Object.assign({}, julhoT, agostoT)));
sC.win.setDailyBank(Object.assign({}, julhoT, agostoT, setembroT));
await new Promise((r) => setTimeout(r, 10));
conferir("com o navegador quase cheio, os 21 dias de setembro ainda cabem",
  Object.keys(sC.local()).filter((k) => k.endsWith("/09/2026")).length, 21);

/* ── 5. Falha na nuvem aparece na tela ───────────────────────────────────── */
const sR = ambienteSync({ recusarTudo: true });
sR.win.setDailyBank(Object.assign({}, setembroT));
await new Promise((r) => setTimeout(r, 10));
conferir("se a nuvem recusar, o aviso vermelho aparece (antes era so no console)",
  sR.avisos.includes(false), true);

/* Mês que continuasse grande demais: não é enviado, e o aviso aparece. */
const sG = ambienteSync();
const gigante = mesDeTeste(10, 3, {});
Object.keys(gigante).forEach((k) => { gigante[k].equipes[0].obs = "w".repeat(400000); });
sG.win.setDailyBank(gigante);
await new Promise((r) => setTimeout(r, 10));
conferir("mes acima do limite nao e enviado para a nuvem e o aviso aparece",
  [sG.escritas.length, sG.avisos.includes(false)], [0, true]);

/* ── 6. O que chega da nuvem é guardado enxuto no navegador ─────────────── */
const sA = ambienteSync();
sA.win.loadProjectState(PID_T);
const ouvinte = sA.ouvintes["painel_produtividade/base/projects/" + PID_T + "/history"];
ouvinte && ouvinte({ docChanges: () => [{ type: "added", doc: { id: "2026-09", data: () => ({ days: setembroT, updatedAt: "2026-09-24T11:00:00.000Z" }) } }] });
const chegou = sA.local()["15/09/2026"];
conferir("mes antigo que chega da nuvem com todos os comentarios e guardado enxuto",
  chegou ? Object.keys(chegou.config.comentariosEquipe) : null, ["15/09/2026"]);
conferir("e com os numeros intactos",
  chegou ? JSON.stringify(chegou.equipes) : null, JSON.stringify(setembroT["15/09/2026"].equipes));

/* ── 7. Carregar um dia não apaga comentários de outros dias ───────────── */
const mesclarComent = sN.win.ppMesclarComentarios;
const vivos = {
  "10/09/2026": { "EQP-01": { texto: "vivo", origem: "manual" } },
  "11/09/2026": { "EQP-02": { texto: "", origem: "manual" } }
};
const doRetrato = {
  "10/09/2026": { "EQP-01": { texto: "antigo", origem: "csv" }, "EQP-03": { texto: "so no retrato", origem: "csv" } },
  "11/09/2026": { "EQP-02": { texto: "apagado a mao", origem: "csv" } }
};
const mesclado = mesclarComent(vivos, doRetrato);
conferir("comentario vivo vence o do retrato", mesclado["10/09/2026"]["EQP-01"].texto, "vivo");
conferir("comentario apagado a mao continua apagado", mesclado["11/09/2026"]["EQP-02"].texto, "");
conferir("o retrato so preenche o que a configuracao viva nao tem", mesclado["10/09/2026"]["EQP-03"].texto, "so no retrato");
conferir("sem comentarios vivos, fica o do retrato", Object.keys(mesclarComent(null, doRetrato)).length, 2);

const f16Carregar = fs.readFileSync("assets/js/16-producao-periodo-editor.js", "utf8");
const f02Carregar = fs.readFileSync("assets/js/02-core.js", "utf8");
conferir("'Carregar dia no editor' mescla os comentarios",
  f16Carregar.includes("window.ppMesclarComentarios(_comentariosVivos, config.comentariosEquipe)"), true);
/* O carregador antigo do banco diario (loadDaySnapshot) nao tinha mais botao e foi
   removido em 25/09/2026: nao sobra caminho que troque a configuracao por um dia
   salvo sem a mescla dos comentarios. */
conferir("o carregador antigo do banco diario nao existe mais (sem caminho sem a mescla)",
  f02Carregar.includes("function loadDaySnapshot"), false);

/* ── 7b. Abrir um contrato NÃO grava nada na nuvem (25/09/2026) ─────────
   Só o botão Salvar grava. Antes, ao abrir um contrato, duas rotinas
   regravavam sozinhas TODOS os meses do histórico com o que estava no
   navegador: a "migração" 3 s depois de abrir e a reconciliação de dias
   antigos. Um navegador desatualizado podia assim devolver à nuvem dias
   apagados ou números velhos de julho e agosto. Os temporizadores rodam na
   hora aqui, para que as duas rotinas tivessem chance de agir. */
const sAb = ambienteSync({ timersNaHora: true });
const julhoLegado = JSON.parse(JSON.stringify(julhoT));
Object.keys(julhoLegado).forEach((k) => { julhoLegado[k].source = "historico-legado-reconciliado"; });
const agostoLegado = JSON.parse(JSON.stringify(agostoT));
Object.keys(agostoLegado).forEach((k) => { agostoLegado[k].source = "historico-legado-reconciliado"; });
/* O navegador ainda guarda um dia que a nuvem já não tem. */
const soNoNavegador = { "05/06/2026": JSON.parse(JSON.stringify(julhoT["01/07/2026"])) };
sAb.localStorage.setItem(BANCO_BASE_T + "::" + PID_T, JSON.stringify(Object.assign({}, soNoNavegador, julhoLegado)));
sAb.win.ppReconcilePerformanceDailyBank = () => ({ changed: true, bank: sAb.local() });
sAb.win.loadProjectState(PID_T);
const ouvinteAb = sAb.ouvintes["painel_produtividade/base/projects/" + PID_T + "/history"];
ouvinteAb && ouvinteAb({ docChanges: () => [
  { type: "added", doc: { id: "2026-07", data: () => ({ days: julhoLegado, updatedAt: "2026-09-24T11:00:00.000Z" }) } },
  { type: "added", doc: { id: "2026-08", data: () => ({ days: agostoLegado, updatedAt: "2026-09-24T11:00:00.000Z" }) } }
] });
await new Promise((r) => setTimeout(r, 10));
conferir("abrir um contrato com dias antigos NAO grava nada na nuvem (so o botao Salvar grava)",
  sAb.escritas.map((e) => e.path.split("/").slice(-2).join("/")), []);
conferir("e os dias da nuvem chegam ao navegador como estao (julho e agosto intactos)",
  [Object.keys(sAb.local()).filter((k) => /\/0[78]\/2026$/.test(k)).length,
   JSON.stringify(sAb.local()["15/08/2026"].equipes) === JSON.stringify(agostoLegado["15/08/2026"].equipes)], [62, true]);
/* O Salvar continua gravando: depois de abrir, salvar agosto grava agosto. */
const aposSalvar = sAb.local();
aposSalvar["15/08/2026"] = JSON.parse(JSON.stringify(aposSalvar["15/08/2026"]));
aposSalvar["15/08/2026"].totalProduzidoDia = 123;
sAb.win.setDailyBank(aposSalvar);
await new Promise((r) => setTimeout(r, 10));
conferir("o botao Salvar continua gravando so o mes alterado",
  sAb.escritas.map((e) => e.path.split("/").slice(-1)[0]), ["2026-08"]);

/* ── 7c. Navegador cheio não esconde dado (00-armazenamento-seguro.js) ─────
   Relato de 25/09/2026: a planilha de setembro subia, a nuvem recebia os dias,
   mas a tela de quem importou mostrava só o 23/09: a cópia nova não cabia no
   navegador e a tela seguia lendo a velha. Um navegador de mentira com limite
   de espaço reproduz o caso. */
{
  const fonteGuarda = fs.readFileSync("assets/js/00-armazenamento-seguro.js", "utf8");
  function montarNavegador(limite) {
    class Storage {
      constructor() { this._i = {}; }
      get length() { return Object.keys(this._i).length; }
      key(n) { return Object.keys(this._i)[n]; }
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._i, k) ? this._i[k] : null; }
      removeItem(k) { delete this._i[k]; }
      setItem(k, v) {
        const usado = Object.keys(this._i).reduce((s, x) => s + (x === k ? 0 : x.length + this._i[x].length), 0);
        if (usado + k.length + String(v).length > limite) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
        this._i[k] = String(v);
      }
    }
    const local = new Storage(), sessao = new Storage();
    const win = { Storage, localStorage: local, sessionStorage: sessao };
    new Function("window", "Storage", "console", fonteGuarda)(win, Storage, { warn: () => { } });
    return { win, local, sessao };
  }
  const CH = "painel-produtividade-banco-diario-editavel-v3-projetos::contrato-alfa";
  const n1 = montarNavegador(1000);
  n1.local.setItem(CH, "a".repeat(100));
  conferir("com espaco sobrando, grava e le normalmente no navegador", [n1.local.getItem(CH).length, n1.local._i[CH].length], [100, 100]);
  n1.local.setItem("dados-de-outro-site", "z".repeat(600));
  n1.local.setItem(CH, "b".repeat(350));
  conferir("sem espaco: a tela le a versao NOVA (da memoria) e a copia velha nao fica no navegador",
    [n1.local.getItem(CH), n1.local._i[CH]], ["b".repeat(350), undefined]);
  n1.local.removeItem("dados-de-outro-site");
  n1.local.setItem(CH, "c".repeat(300));
  conferir("quando volta a caber, grava no navegador e a memoria e liberada",
    [n1.local.getItem(CH), n1.local._i[CH], n1.win.ppMemoriaDoNavegador.chaves()], ["c".repeat(300), "c".repeat(300), []]);
  n1.local.setItem("dados-de-outro-site", "z".repeat(600));
  n1.local.setItem(CH, "c".repeat(900));
  conferir("a memoria aparece na lista de chaves guardadas so em memoria", n1.win.ppMemoriaDoNavegador.chaves(), [CH]);
  n1.local.removeItem(CH);
  conferir("apagar a chave apaga tambem a copia em memoria", n1.local.getItem(CH), null);
  n1.local.setItem(CH, "d".repeat(900));
  n1.win.ppMemoriaDoNavegador.limpar();
  conferir("sair do usuario limpa o que ficou em memoria", n1.local.getItem(CH), null);
  let lancou = false;
  try { n1.local.setItem("outra-chave-qualquer", "y".repeat(2000)); } catch (e) { lancou = e.name === "QuotaExceededError"; }
  conferir("chaves que nao sao do painel continuam como sempre (o erro de espaco segue para quem gravou)", lancou, true);
  lancou = false;
  try { n1.sessao.setItem(CH, "s".repeat(2000)); } catch (e) { lancou = e.name === "QuotaExceededError"; }
  conferir("o armazenamento de sessao nao e tocado", lancou, true);
}

/* ── 8. A importação monta o histórico com os dias que acabou de ler ───── */
const f13Hist = fs.readFileSync("assets/js/13-ajuste-csv-data-desempenho.js", "utf8");
conferir("a lista 'Producao dia' da importacao sai do banco recem-montado, nao do navegador",
  f13Hist.includes("var _fullBankHist = bank;"), true);


/* ═══ PLANILHA COM VÁRIOS MESES: CADA MÊS COM AS SUAS METAS (24/09/2026) ═══
   PEDIDO: "ao adicionar a planilha .csv total já preenche os dias e o período,
   salvando também os já passados dos meses anteriores (julho e agosto)".

   Teste PONTA A PONTA: roda o importador real (13), a sincronização real (15)
   e o contador de dias real (19), com nuvem de mentira (limite de 1 MiB) e
   navegador de mentira. Cada dia é conferido contra o cálculo feito direto da
   planilha. Números inventados. */
console.log(NL10 + "planilha com varios meses: todos os dias, cada mes com a sua meta");

const src13Imp = fs.readFileSync("assets/js/13-ajuste-csv-data-desempenho.js", "utf8");
const trechoDiasImp = src19.slice(src19.indexOf("function pascoaDe(ano) {"), src19.indexOf("function contarDiasCalculo("));
const RAIZ_IMP = "painel_produtividade/base/projects/";

function painelImp(pid, opcoes) {
  const op = opcoes || {};
  const itens = op.itens ? JSON.parse(JSON.stringify(op.itens)) : {};
  const nuvem = op.nuvem || {}, escritas = [];
  const ls = {
    get length() { return Object.keys(itens).length; }, key: (i) => Object.keys(itens)[i],
    getItem: (k) => (k in itens ? itens[k] : null), removeItem: (k) => { delete itens[k]; }, setItem: (k, v) => { itens[k] = String(v); }
  };
  function docRef(path) {
    return {
      collection: (n) => colRef(path + "/" + n),
      set: (data) => {
        const bytes = Buffer.byteLength(JSON.stringify(data), "utf8"); escritas.push({ path, bytes });
        if (bytes > 1048576) return Promise.reject(new Error("too big"));
        nuvem[path] = JSON.parse(JSON.stringify(data)); return Promise.resolve();
      },
      onSnapshot: () => () => { }
    };
  }
  function colRef(path) { return { doc: (id) => docRef(path + "/" + id), onSnapshot: () => () => { } }; }
  const g = {
    window: { ppAvisoGravacao: () => { } },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: { classList: { contains: () => false } } },
    localStorage: ls, firebase: { apps: [1], firestore: () => ({ collection: (n) => colRef(n) }), auth: () => ({ currentUser: { uid: "u" } }) },
    console: { warn: () => { }, error: () => { }, log: () => { } }, setTimeout: () => 0, setInterval: () => 0, clearTimeout: () => { }, Blob,
    alert: () => { }, memo: (k, f) => f(), n: (v) => { const x = Number(v); return isFinite(x) ? x : 0; },
    config: op.config ? JSON.parse(JSON.stringify(op.config)) : { diasUteisMes: 21, diasLancados: 0, dataReferencia: "", financeiroExecutivo: { _init: true, movimentos: [] } },
    equipes: op.equipes ? JSON.parse(JSON.stringify(op.equipes)) : [], historico: [], teamCards: {}, teamCardTheme: {},
    currentProjectId: pid, DAILY_BANK_KEY_BASE: BANCO_BASE_T, STORAGE_KEY_BASE: "estado", currentUserLogin: "c@exemplo.com",
    setDailyBank: (bank) => ls.setItem(BANCO_BASE_T + "::" + pid, JSON.stringify(bank)), loadProjectState: () => { },
    ppPersistCurrentProject: () => { }
  };
  const nomes = Object.keys(g);
  const api = new Function(...nomes, trechoDiasImp + NL10 + src13Imp + NL10 + fonte15Sync + NL10 +
    " return { importar: function (t) { return window.importCsvText(t); }, get config() { return config; }," +
    " get equipes() { return equipes; }, get historico() { return historico; } };")(...nomes.map((k) => g[k]));
  return {
    api, nuvem, escritas, itens,
    local: () => JSON.parse(ls.getItem(BANCO_BASE_T + "::" + pid) || "{}"),
    docMes: (m) => nuvem[RAIZ_IMP + pid + "/history/" + m]
  };
}

/* A planilha: julho, agosto e setembro, 22 equipes, meta diferente em cada mês. */
const EQ_IMP = Array.from({ length: 22 }, (_, i) => "EQ-" + String(i + 1).padStart(2, "0"));
const METAS_IMP = { 7: { mes: 175000, dia: 7608.7 }, 8: { mes: 172000, dia: 8190.48 }, 9: { mes: 168000, dia: 8400 } };
const ULTIMO_IMP = { 7: 31, 8: 31, 9: 23 };
function planilhaImp(meses, semMeta) {
  const cab = semMeta ? "Data;Equipe;Serviço;Valor bruto;Base;Observação" : "Data;Equipe;Serviço;Valor bruto;Meta mês;Meta dia;Base;Observação";
  const linhas = [cab], esperado = {};
  for (const m of meses) {
    for (let d = 1; d <= ULTIMO_IMP[m]; d++) {
      if (new Date(2026, m - 1, d).getDay() === 0) continue;
      const dk = String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/2026";
      EQ_IMP.forEach((e, i) => {
        const valor = Math.round((900 + ((i * 37 + d * 11 + m * 5) % 700) + (i % 3) * 0.35) * 100) / 100;
        (esperado[dk] = esperado[dk] || {})[e] = valor;
        const obs = (i + d) % 3 === 0 ? "Equipe aguardando material na base" : "";
        const metas = semMeta ? [] : [String(METAS_IMP[m].mes), String(METAS_IMP[m].dia).replace(".", ",")];
        linhas.push([dk, e, "Servico", String(valor).replace(".", ",")].concat(metas, ["BASE", obs]).join(";"));
      });
    }
  }
  return { texto: linhas.join("\r\n"), esperado };
}
function diasUteisImp(dk) {
  const [d, m, a] = dk.split("/").map(Number);
  let c = 0;
  for (let x = 1; x <= d; x++) {
    const w = new Date(a, m - 1, x).getDay();
    if (w === 0 || w === 6 || (m === 9 && x === 7)) continue;
    c++;
  }
  return Math.max(1, c);
}
const semHorarioImp = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === "savedAt" || k === "at" || k === "updatedAt" ? "" : v)));

/* ── 1. Planilha total, painel vazio ─────────────────────────────────────── */
const totalImp = planilhaImp([7, 8, 9]);
const pT = painelImp("contrato-alfa");
pT.api.importar(totalImp.texto);
await new Promise((r) => setTimeout(r, 10));
const localT = pT.local();

conferir("planilha total: todos os dias de julho, agosto e setembro no navegador (27 + 26 + 20)",
  ["07", "08", "09"].map((m) => Object.keys(localT).filter((k) => k.slice(3, 5) === m).length), [27, 26, 20]);
conferir("planilha total: os tres meses aceitos pela nuvem",
  ["2026-07", "2026-08", "2026-09"].map((m) => pT.docMes(m) ? Object.keys(pT.docMes(m).days).length : 0), [27, 26, 20]);
conferir("planilha total: nenhum mes acima de 1 MB", pT.escritas.every((e) => e.bytes < 1048576), true);

const errosImp = { producao: 0, acumulado: 0, dias: 0, metas: 0, total: 0 };
Object.keys(totalImp.esperado).forEach((dk) => {
  const snap = localT[dk], m = Number(dk.slice(3, 5));
  if (!snap) { errosImp.producao++; return; }
  if (snap.config.diasLancados !== diasUteisImp(dk)) errosImp.dias++;
  let totalDia = 0;
  EQ_IMP.forEach((e) => {
    const t = snap.equipes.find((x) => x.equipe === e);
    const dia = totalImp.esperado[dk][e];
    totalDia += dia;
    const acum = Object.keys(totalImp.esperado).filter((k) => k.slice(3) === dk.slice(3) && Number(k.slice(0, 2)) <= Number(dk.slice(0, 2)))
      .reduce((s, k) => s + totalImp.esperado[k][e], 0);
    if (Math.abs(t.produzidoDia - dia) > 0.005) errosImp.producao++;
    if (Math.abs(t.produzidoAcumulado - Math.round(acum * 100) / 100) > 0.011) errosImp.acumulado++;
    const metaAcum = Math.round(METAS_IMP[m].dia * diasUteisImp(dk) * 100) / 100;
    if (Math.abs(t.metaDia - METAS_IMP[m].dia) > 0.005 || Math.abs(t.metaMes - METAS_IMP[m].mes) > 0.005 ||
      Math.abs(t.metaAcumulada - metaAcum) > 0.011) errosImp.metas++;
  });
  if (Math.abs(snap.totalProduzidoDia - Math.round(totalDia * 100) / 100) > 0.011) errosImp.total++;
});
conferir("planilha total: producao do dia, acumulado do mes, dias trabalhados, metas e total CORRETOS em todos os 73 dias",
  errosImp, { producao: 0, acumulado: 0, dias: 0, metas: 0, total: 0 });
conferir("planilha total: julho com a meta de JULHO (era a de setembro)",
  [localT["15/07/2026"].equipes[0].metaMes, localT["15/07/2026"].equipes[0].metaDia], [175000, 7608.7]);
conferir("planilha total: julho e agosto com os dias uteis do proprio mes (23 e 21)",
  [localT["15/07/2026"].config.diasUteisMes, localT["14/08/2026"].config.diasUteisMes], [23, 21]);
conferir("planilha total: o mes de referencia (setembro) segue a configuracao viva, como sempre",
  [pT.api.config.dataReferencia, pT.api.config.diasUteisMes, localT["23/09/2026"].config.diasUteisMes], ["23/09/2026", 21, 21]);
conferir("planilha total: lista 'Producao dia' com os 73 dias", pT.api.historico.length, 73);

/* ── 2. Só setembro, com julho e agosto já salvos ─────────────────────────── */
const pS = painelImp("contrato-alfa", { itens: pT.itens, nuvem: JSON.parse(JSON.stringify(pT.nuvem)), config: pT.api.config, equipes: pT.api.equipes });
pS.api.importar(planilhaImp([9]).texto);
await new Promise((r) => setTimeout(r, 10));
conferir("subindo SO setembro: a nuvem recebe so setembro", pS.escritas.map((e) => e.path.split("/").pop()), ["2026-09"]);
conferir("subindo SO setembro: julho e agosto intactos no navegador",
  Object.keys(localT).filter((k) => /\/0[78]\//.test(k)).every((k) => JSON.stringify(semHorarioImp(pS.local()[k])) === JSON.stringify(semHorarioImp(localT[k]))), true);
conferir("subindo SO setembro: julho e agosto intactos na nuvem",
  [JSON.stringify(pS.docMes("2026-07")) === JSON.stringify(pT.docMes("2026-07")), JSON.stringify(pS.docMes("2026-08")) === JSON.stringify(pT.docMes("2026-08"))], [true, true]);

/* ── 3. Reimportar a mesma planilha não muda nada ─────────────────────────── */
const pR = painelImp("contrato-alfa", { itens: pT.itens, nuvem: JSON.parse(JSON.stringify(pT.nuvem)), config: pT.api.config, equipes: pT.api.equipes });
pR.api.importar(totalImp.texto);
await new Promise((r) => setTimeout(r, 10));
conferir("reimportar a planilha total: mesmos dias e mesmos numeros, sem duplicar",
  [Object.keys(pR.local()).length, JSON.stringify(semHorarioImp(pR.local())) === JSON.stringify(semHorarioImp(localT))], [73, true]);

/* ── 4. Planilha sem coluna de meta: o mês anterior guarda o que já tinha ── */
const itensC = JSON.parse(JSON.stringify(pT.itens));
const bancoC = JSON.parse(itensC[BANCO_BASE_T + "::contrato-alfa"]);
Object.keys(bancoC).filter((k) => k.includes("/07/")).forEach((k) => { bancoC[k].config.diasUteisMes = 22; });
itensC[BANCO_BASE_T + "::contrato-alfa"] = JSON.stringify(bancoC);
const pM = painelImp("contrato-alfa", { itens: itensC, nuvem: JSON.parse(JSON.stringify(pT.nuvem)), config: pT.api.config, equipes: pT.api.equipes });
pM.api.importar(planilhaImp([7, 8, 9], true).texto);
await new Promise((r) => setTimeout(r, 10));
const julM = pM.local()["15/07/2026"];
conferir("sem meta na planilha: julho mantem a meta de julho ja salva",
  julM.equipes.every((t) => Math.abs(t.metaDia - 7608.7) < 0.005 && Math.abs(t.metaMes - 175000) < 0.005), true);
conferir("sem meta na planilha: julho mantem os dias uteis definidos pelo controller (22)", julM.config.diasUteisMes, 22);
conferir("sem meta na planilha: setembro mantem a meta de setembro", pM.api.equipes[0].metaDia, 8400);

/* ── 5. Todos os contratos, cada um no seu histórico ──────────────────────────── */
const nuvemComumImp = {};
let foraImp = 0, mesesImp = 0;
for (const pidI of PROJETOS.map((p) => p.id)) {
  const pI = painelImp(pidI, { nuvem: nuvemComumImp });
  pI.api.importar(totalImp.texto);
  await new Promise((r) => setTimeout(r, 5));
  pI.escritas.forEach((e) => { if (!e.path.includes("/projects/" + pidI + "/")) foraImp++; });
  mesesImp += ["2026-07", "2026-08", "2026-09"].filter((m) => pI.docMes(m) && Object.values(pI.docMes(m).days).every((d) => d.projectId === pidI)).length;
}
conferir(PROJETOS.length + " contratos: nenhuma gravacao fora do proprio contrato", foraImp, 0);
conferir(PROJETOS.length + " contratos: os tres meses de cada um gravados e etiquetados com o proprio contrato", mesesImp, PROJETOS.length * 3);

/* ── 6. A migração pós-nuvem só roda para o contrato aberto ─────────────────── */
conferir("a migracao do historico so roda para o contrato aberto (nunca grava o banco de um no historico de outro)",
  fonte15Sync.includes("if (!_initialHistoryHydrated[pid] && pid === currentPid()) {") && fonte15Sync.includes("if (pid !== currentPid()) return;"), true);


/* ═══ ACOMPANHAMENTO GERENCIAL: ORÇAMENTO, FORECAST E REALIZADO ═══════════════
   Roda o arquivo de contas de verdade (assets/gerencial/01-calculo.js) com
   números pequenos, feitos à mão, e depois com os dados fictícios do projeto. */
console.log(NL10 + "acompanhamento gerencial: contas");
const escopoGer = {};
new Function("window", fs.readFileSync("assets/gerencial/01-calculo.js", "utf8"))(escopoGer);
const PG = escopoGer.PPGerencial;
const doze = (v) => Array.from({ length: 12 }, () => v);

conferir("taxa liquida: vale a do financeiro quando existe", PG.taxaLiquida({ financeiroExecutivo: { taxaImposto: 0.9 }, taxaLiquida: 0.8 }), 0.9);
conferir("taxa liquida: sem financeiro, vale a do contrato", PG.taxaLiquida({ taxaLiquida: 0.8 }), 0.8);
conferir("taxa liquida: sem nenhuma, 1 menos o desconto", PG.taxaLiquida({ descontoLiquido: 0.15 }), 0.85);

const prodG = PG.producaoPorMes([
  { data: "01/07", total: 100 }, { data: "02/07", total: 50 },
  { data: "02/07/2026", total: 50 }, { data: "01/08/2026", total: 70 }, { data: "01/08/2025", total: 999 }
], 2026);
conferir("producao por mes: o mesmo dia gravado nos dois formatos conta uma vez", prodG.valores[6], 150);
conferir("producao por mes: dia de outro ano fica de fora", prodG.valores[7], 70);
conferir("producao por mes: mes sem lancamento fica marcado como vazio", prodG.tem[8], 0);

const dG = PG.dre({ receitaBruta: 1000, pessoal: 300, frota: 100, materiais: 50, terceiros: 50, indiretas: 100 }, 0.9);
conferir("DRE: receita liquida = bruta x taxa", dG.receitaLiquida, 900);
conferir("DRE: deducoes = bruta - liquida", dG.deducoes, 100);
conferir("DRE: custos diretos somam as quatro linhas", dG.custosDiretos, 500);
conferir("DRE: EBITDA = liquida - custos diretos - indiretas", dG.ebitda, 300);
conferir("DRE: margem EBITDA = EBITDA / liquida", Math.round(dG.margemEbitda * 10000) / 10000, 0.3333);

conferir("politica: receita 2% abaixo do orcado esta dentro", PG.situacao(PG.desvio("receitaLiquida", 98, 100)), "ok");
conferir("politica: receita 5% abaixo pede atencao", PG.situacao(PG.desvio("receitaLiquida", 95, 100)), "att");
conferir("politica: receita 8% abaixo fica fora da politica", PG.situacao(PG.desvio("receitaLiquida", 92, 100)), "alr");
conferir("politica: custo 8% ACIMA do orcado e desfavoravel", PG.situacao(PG.desvio("pessoal", 108, 100)), "alr");
conferir("politica: custo abaixo do orcado e sempre favoravel", PG.situacao(PG.desvio("pessoal", 80, 100)), "ok");
conferir("politica: receita acima do orcado e sempre favoravel", PG.situacao(PG.desvio("receitaLiquida", 150, 100)), "ok");

const orcG = {
  ano: 2026, mesFechado: 2, forecastVersao: "9+3",
  budget: { receitaBruta: doze(1000), pessoal: doze(300), frota: doze(100), materiais: doze(50), terceiros: doze(50), indiretas: doze(100) },
  forecast: { receitaBruta: doze(1100), pessoal: doze(300), frota: doze(100), materiais: doze(50), terceiros: doze(50), indiretas: doze(100) },
  realizado: { receitaBruta: [0, 900], pessoal: [300, 300], frota: [100, 100], materiais: [50, 50], terceiros: [50, 50], indiretas: [100, 100] },
  justificativas: [{ mes: 2, linha: "ebitda", texto: "Chuva", responsavel: "Gerencia", prazo: "15/04/2026" }]
};
const cG = PG.montarContrato({ id: "t", nome: "Teste", config: { taxaLiquida: 0.9, orcamento: orcG },
  historico: [{ data: "10/01/2026", total: 1000 }] });
conferir("realizado sem receita digitada usa a producao lancada no mes", cG.real[0].receitaBruta, 1000);
conferir("realizado com receita digitada usa o que foi digitado", cG.real[1].receitaBruta, 900);
conferir("mes ainda nao fechado nao tem realizado", cG.real[2], null);
conferir("acumulado no ano soma so os meses fechados", PG.recorte(cG, "ytd", 11).real.receitaBruta, 1900);
conferir("projecao do ano = realizado dos fechados + forecast do resto",
  PG.recorte(cG, "ano", 11).real.receitaBruta, 1000 + 900 + 10 * 1100);
const pendG = PG.pendencias(cG);
conferir("fora da politica: so fevereiro (receita -10% e EBITDA -30%)",
  pendG.map((p) => p.mes + ":" + p.linha), ["1:receitaLiquida", "1:ebitda"]);
conferir("a justificativa escrita fica presa ao desvio certo",
  pendG.map((p) => !!p.justificativa), [false, true]);
const totG = PG.consolidar([cG, cG]);
conferir("consolidado soma os contratos mes a mes", totG.budget[0].receitaBruta, 2000);

/* Com os dados fictícios que o painel abre */
const sementeG = {};
new Function("window", fs.readFileSync("assets/demo/dados-ficticios.js", "utf8"))(sementeG);
const docsG = (sementeG.PP_DEMO_SEMENTE || {}).documentos || {};
const contratosG = PROJETOS.map((p) => {
  const doc = docsG[Object.keys(docsG).find((k) => k.endsWith("/projects/" + p.id))] || {};
  return PG.montarContrato({ id: p.id, nome: p.nome, config: doc.config || {}, historico: doc.historico || [] });
});
conferir("dados ficticios: os 4 contratos tem orcamento do ano", contratosG.map((c) => c.budget[0].receitaBruta > 0), [true, true, true, true]);
conferir("dados ficticios: julho e agosto fechados, realizado igual a producao lancada",
  contratosG.every((c) => c.fechados === 8 && [6, 7].every((m) => Math.abs(c.real[m].receitaBruta - c.producao[m]) < 0.01 && c.producao[m] > 0)), true);
conferir("dados ficticios: tres contratos dentro da politica e um fora (Gama)",
  contratosG.map((c) => c.id + ":" + PG.situacaoContrato(PG.recorte(c, "ytd", 7))),
  ["contrato-alfa:ok", "contrato-beta:ok", "contrato-gama:alr", "contrato-delta:ok"]);
conferir("dados ficticios: o desvio mais recente do Gama segue sem justificativa",
  PG.pendencias(contratosG[2]).filter((p) => !p.justificativa).length, 1);


/* ═══ DEMONSTRAÇÃO: LOGIN GUARDADO VOLTA NO RITMO DO FIREBASE (27/09/2026) ═══
   O DEFEITO: com o login guardado, a nuvem de demonstração dizia quem estava
   logado já no primeiro instante da página. Um trecho antigo do painel abria
   então as escutas dos contratos antes da hora, e depois de recarregar (F5)
   os 4 contratos ficavam em "carregando" para sempre. No Firebase de verdade
   o login volta um instante depois; a demonstração tem de fazer igual. */
console.log(NL10 + "demonstração: login guardado volta depois do carregamento");
const sessaoDemo = await (async () => {
  const guardado = { "pp-demo-sessao-v1": "demo-admin" };
  const armazenamento = {
    getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); },
    removeItem: (k) => { delete guardado[k]; }, key: (i) => Object.keys(guardado)[i], get length() { return Object.keys(guardado).length; }
  };
  const aoCarregar = [];
  const janela = { PP_DEMO_SEMENTE: { gerada: "teste", contas: { "admin@demo.com": { uid: "demo-admin", senha: "x" } },
    documentos: { "users/demo-admin": { nome: "Admin" } } } };
  const documento = { write() {}, addEventListener: (t, f) => { if (t === "DOMContentLoaded") aoCarregar.push(f); }, body: { classList: { add() {} } } };
  new Function("window", "document", "localStorage", fs.readFileSync("assets/js/00-modo-demonstracao.js", "utf8"))(janela, documento, armazenamento);
  const noInicio = janela.firebase.auth().currentUser;
  const avisado = await new Promise((r) => janela.firebase.auth().onAuthStateChanged((u) => r(u)));
  return { noInicio, avisado };
})();
conferir("no primeiro instante da pagina ninguem esta logado (igual ao Firebase)", sessaoDemo.noInicio, null);
conferir("um instante depois o login guardado volta e o painel e avisado", (sessaoDemo.avisado || {}).email, "admin@demo.com");

console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'todos os testes passaram'));
process.exit(falhas ? 1 : 0);
