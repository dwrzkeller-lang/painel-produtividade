/* ═══ ACOMPANHAMENTO GERENCIAL · CONTAS ═════════════════════════════════════
   Resultado por contrato no padrão de controladoria: orçamento anual
   (budget), forecast revisado no ano (3+9, 6+6, 9+3) e realizado do
   fechamento mensal. Arquivo só de contas, sem tela: dá para testar sozinho.

   Linhas do resultado (DRE gerencial):
     Receita bruta
     (−) Deduções            = receita bruta × (1 − taxa líquida do contrato)
     Receita líquida
     (−) Pessoal, Frota, Materiais, Terceiros  → Custos diretos
     Margem de contribuição  = receita líquida − custos diretos
     (−) Despesas indiretas
     EBITDA                  = margem de contribuição − despesas indiretas
     Margem EBITDA           = EBITDA ÷ receita líquida

   Política de desvio (mesma régua em todas as telas):
     desvio desfavorável até 3%  → dentro da política
     de 3% a 7%                   → atenção
     acima de 7%                  → fora da política: exige justificativa
   Desvio favorável (receita acima, custo abaixo do orçado) é sempre verde. */
(function (raiz) {
  'use strict';

  var MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var POLITICA = { tolerancia: 0.03, limite: 0.07 };
  var ENTRADAS = ['receitaBruta', 'pessoal', 'frota', 'materiais', 'terceiros', 'indiretas'];
  var CUSTOS = ['pessoal', 'frota', 'materiais', 'terceiros'];
  var LINHAS = [
    { id: 'receitaBruta', nome: 'Receita bruta', tipo: 'receita' },
    { id: 'deducoes', nome: 'Deduções e impostos', tipo: 'custo', recuo: true },
    { id: 'receitaLiquida', nome: 'Receita líquida', tipo: 'receita', forte: true },
    { id: 'pessoal', nome: 'Pessoal', tipo: 'custo', recuo: true },
    { id: 'frota', nome: 'Frota e combustível', tipo: 'custo', recuo: true },
    { id: 'materiais', nome: 'Materiais', tipo: 'custo', recuo: true },
    { id: 'terceiros', nome: 'Serviços de terceiros', tipo: 'custo', recuo: true },
    { id: 'custosDiretos', nome: 'Custos diretos', tipo: 'custo', forte: true },
    { id: 'margemContribuicao', nome: 'Margem de contribuição', tipo: 'receita', forte: true },
    { id: 'indiretas', nome: 'Despesas indiretas', tipo: 'custo', recuo: true },
    { id: 'ebitda', nome: 'EBITDA', tipo: 'receita', forte: true, destaque: true },
    { id: 'margemEbitda', nome: 'Margem EBITDA', tipo: 'percentual' }
  ];

  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function vetor(v) { var s = []; for (var i = 0; i < 12; i++) s.push(num(v && v[i])); return s; }

  /* A mesma taxa líquida do painel do contrato (fator líquido) */
  function taxaLiquida(cfg) {
    cfg = cfg || {};
    var fin = cfg.financeiroExecutivo || {};
    if (num(fin.taxaImposto) > 0) return num(fin.taxaImposto);
    if (cfg.taxaLiquida != null && cfg.taxaLiquida !== '' && num(cfg.taxaLiquida) > 0) return num(cfg.taxaLiquida);
    return 1 - Math.max(0, Math.min(1, num(cfg.descontoLiquido)));
  }

  /* Soma da produção diária (histórico do painel) por mês do ano. As datas
     vêm como o painel grava: 'dd/mm' (ano de referência) ou 'dd/mm/aaaa';
     o mesmo dia gravado nos dois formatos conta uma vez só (vale o último). */
  function producaoPorMes(historico, ano) {
    var p = vetor(null), tem = vetor(null), dias = {};
    (historico || []).forEach(function (h) {
      var m = String(h && h.data || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
      if (!m || (m[3] && Number(m[3]) !== ano)) return;
      dias[Number(m[2]) + '/' + Number(m[1])] = num(h.total);
    });
    Object.keys(dias).forEach(function (k) { var mes = Number(k.split('/')[0]) - 1; p[mes] += dias[k]; tem[mes] = 1; });
    return { valores: p, tem: tem };
  }

  /* Uma coluna do DRE a partir das entradas de um mês */
  function dre(e, taxa) {
    var rb = num(e.receitaBruta);
    var rl = rb * taxa;
    var d = rb - rl;
    var cd = CUSTOS.reduce(function (s, k) { return s + num(e[k]); }, 0);
    var mc = rl - cd;
    var eb = mc - num(e.indiretas);
    return {
      receitaBruta: rb, deducoes: d, receitaLiquida: rl, pessoal: num(e.pessoal), frota: num(e.frota), materiais: num(e.materiais),
      terceiros: num(e.terceiros), custosDiretos: cd, margemContribuicao: mc, indiretas: num(e.indiretas), ebitda: eb,
      margemEbitda: rl ? eb / rl : 0
    };
  }
  function somarDre(lista, taxaMedia) {
    var t = { receitaBruta: 0, deducoes: 0, receitaLiquida: 0, pessoal: 0, frota: 0, materiais: 0, terceiros: 0, custosDiretos: 0, margemContribuicao: 0, indiretas: 0, ebitda: 0 };
    lista.forEach(function (d) { Object.keys(t).forEach(function (k) { t[k] += num(d && d[k]); }); });
    t.margemEbitda = t.receitaLiquida ? t.ebitda / t.receitaLiquida : 0;
    return t;
  }

  /* Contrato: 12 meses de orçamento, forecast e realizado (fechados), e a
     prévia do mês corrente a partir da produção lançada no painel. */
  function montarContrato(entrada) {
    var cfg = entrada.config || {};
    var orc = cfg.orcamento || {};
    var ano = num(orc.ano) || new Date().getFullYear();
    var fechados = Math.max(0, Math.min(12, num(orc.mesFechado)));
    var taxa = taxaLiquida(cfg);
    var prod = producaoPorMes(entrada.historico, ano);
    var linhas = function (bloco, m) { var e = {}; ENTRADAS.forEach(function (k) { e[k] = num(bloco && bloco[k] && bloco[k][m]); }); return e; };
    var budget = [], forecast = [], real = [];
    for (var m = 0; m < 12; m++) {
      budget.push(dre(linhas(orc.budget, m), taxa));
      forecast.push(dre(linhas(orc.forecast, m), taxa));
      if (m < fechados) {
        var er = linhas(orc.realizado, m);
        if (!er.receitaBruta && prod.tem[m]) er.receitaBruta = prod.valores[m];
        real.push(dre(er, taxa));
      } else real.push(null);
    }
    return {
      id: entrada.id, nome: entrada.nome, ano: ano, fechados: fechados, taxa: taxa, versao: String(orc.forecastVersao || ''),
      budget: budget, forecast: forecast, real: real, producao: prod.valores,
      justificativas: Array.isArray(orc.justificativas) ? orc.justificativas : [],
      previa: entrada.previa || null
    };
  }

  /* Período: 'mes' (um mês fechado), 'ytd' (acumulado até o mês) ou 'ano'
     (fechados reais + forecast dos meses que faltam = projeção do ano). */
  function recorte(c, visao, mes) {
    var ult = Math.min(mes, c.fechados - 1);
    if (visao === 'ano') {
      var proj = [];
      for (var m = 0; m < 12; m++) proj.push(m < c.fechados ? c.real[m] : c.forecast[m]);
      return { real: somarDre(proj), budget: somarDre(c.budget), forecast: somarDre(c.forecast), rotuloReal: 'Projeção' };
    }
    var ini = visao === 'ytd' ? 0 : ult;
    var r = [], b = [], f = [];
    for (var k = ini; k <= ult; k++) { r.push(c.real[k]); b.push(c.budget[k]); f.push(c.forecast[k]); }
    return { real: ult >= 0 ? somarDre(r) : null, budget: somarDre(b), forecast: somarDre(f), rotuloReal: 'Real' };
  }

  /* Desvio de uma linha: valor, percentual e se é favorável */
  function desvio(linha, real, ref) {
    var tipo = (LINHAS.find(function (l) { return l.id === linha; }) || {}).tipo;
    if (tipo === 'percentual') return { valor: real - ref, pct: null, favoravel: real >= ref };
    var v = real - ref;
    var pct = ref ? v / Math.abs(ref) : 0;
    var favoravel = tipo === 'custo' ? v <= 0 : v >= 0;
    return { valor: v, pct: pct, favoravel: favoravel };
  }
  /* Situação na política: ok (dentro), att (atenção), alr (fora da política) */
  function situacao(d) {
    if (!d || d.pct == null) return '';
    if (d.favoravel) return 'ok';
    var a = Math.abs(d.pct);
    return a <= POLITICA.tolerancia ? 'ok' : a <= POLITICA.limite ? 'att' : 'alr';
  }
  /* Situação do contrato: a pior entre receita líquida e EBITDA */
  function situacaoContrato(rec) {
    if (!rec.real) return '';
    var ordem = { '': 0, ok: 1, att: 2, alr: 3 };
    var s1 = situacao(desvio('receitaLiquida', rec.real.receitaLiquida, rec.budget.receitaLiquida));
    var s2 = situacao(desvio('ebitda', rec.real.ebitda, rec.budget.ebitda));
    return ordem[s1] >= ordem[s2] ? s1 : s2;
  }

  /* Desvios fora da política nos meses fechados: pedem justificativa */
  function pendencias(c) {
    var lista = [];
    for (var m = 0; m < c.fechados; m++) {
      ['receitaLiquida', 'ebitda'].forEach(function (linha) {
        var d = desvio(linha, c.real[m][linha], c.budget[m][linha]);
        if (situacao(d) !== 'alr') return;
        var j = c.justificativas.find(function (x) { return num(x.mes) === m + 1 && x.linha === linha; }) || null;
        lista.push({ contrato: c.id, nome: c.nome, mes: m, linha: linha, desvio: d, justificativa: j });
      });
    }
    return lista;
  }

  /* Soma de vários contratos, mês a mês */
  function consolidar(contratos) {
    if (!contratos.length) return null;
    var fechados = Math.min.apply(null, contratos.map(function (c) { return c.fechados; }));
    var col = function (tipo, m) { return somarDre(contratos.map(function (c) { return c[tipo][m]; })); };
    var budget = [], forecast = [], real = [], producao = [];
    for (var m = 0; m < 12; m++) {
      budget.push(col('budget', m)); forecast.push(col('forecast', m));
      real.push(m < fechados ? col('real', m) : null);
      producao.push(contratos.reduce(function (s, c) { return s + num(c.producao[m]); }, 0));
    }
    return { id: 'total', nome: 'Total', ano: contratos[0].ano, fechados: fechados, budget: budget, forecast: forecast, real: real, producao: producao,
      versao: contratos[0].versao, justificativas: [] };
  }

  raiz.PPGerencial = {
    MESES: MESES, MESES_LONGOS: MESES_LONGOS, POLITICA: POLITICA, LINHAS: LINHAS, ENTRADAS: ENTRADAS,
    taxaLiquida: taxaLiquida, producaoPorMes: producaoPorMes, dre: dre, somarDre: somarDre, montarContrato: montarContrato,
    recorte: recorte, desvio: desvio, situacao: situacao, situacaoContrato: situacaoContrato, pendencias: pendencias, consolidar: consolidar
  };
})(typeof window !== 'undefined' ? window : globalThis);
