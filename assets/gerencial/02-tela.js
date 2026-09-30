/* ═══ ACOMPANHAMENTO GERENCIAL · TELA ═══════════════════════════════════════
   Monta o gerencial dentro do próprio painel (sem página separada). Os dados
   de cada contrato vêm do mesmo lugar que o painel do contrato usa
   (loadStoredProjectState), então os números batem entre as telas.

   Seções:
     1. Indicadores do período (real × orçamento)
     2. Resultado gerencial (DRE): real, orçamento, forecast e desvios
     3. Prévia do mês corrente: produção lançada × orçamento do mês
     4. Resultado por contrato
     5. Evolução mensal (12 meses) e gráficos
     6. Desvios fora da política e justificativas */
(function () {
  'use strict';
  if (window.__ppGerencialTela) return;
  window.__ppGerencialTela = true;
  var G = window.PPGerencial;

  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  var MIL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  function mil(v) { var x = num(v) / 1000; return (x < 0 ? '−' : '') + MIL.format(Math.abs(x)); }
  function mi(v) { var x = num(v); return (x < 0 ? '−' : '') + 'R$ ' + (Math.abs(x) / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi'; }
  function pct(v, casas) { var c = casas == null ? 1 : casas; return (num(v) < 0 ? '−' : num(v) > 0 ? '+' : '') + (Math.abs(num(v)) * 100).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }) + '%'; }
  function pctSemSinal(v) { return (num(v) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
  function pp(v) { return (num(v) < 0 ? '−' : num(v) > 0 ? '+' : '') + (Math.abs(num(v)) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' p.p.'; }
  var ROTULO = { ok: 'Dentro da política', att: 'Atenção', alr: 'Fora da política' };
  var ROTULO_CURTO = { ok: 'Dentro', att: 'Atenção', alr: 'Fora' };
  var NOME_LINHA = { receitaLiquida: 'Receita líquida', ebitda: 'EBITDA' };

  /* Estado da tela (fica aqui, não no HTML, para sobreviver às atualizações) */
  var estado = { selecionados: null, visao: 'ytd', mes: null, metrica: 'receitaLiquida' };
  var graficos = {};

  /* ── Dados ─────────────────────────────────────────────────────────── */
  function liberados() {
    var ids = window.currentUserProjectIds;
    var lista = (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
    return lista.filter(function (p) { return !Array.isArray(ids) || ids.indexOf(p.id) >= 0; });
  }
  function nuvemRespondeu(pid) { try { return !!(window.__PP_NUVEM_RESPONDEU__ || {})[pid]; } catch (e) { return false; } }
  function lerContratos() {
    return liberados().map(function (p) {
      var st = loadStoredProjectState(p.id);
      var t = calcTotalsFromState(st, p.id);
      var c = G.montarContrato({ id: p.id, nome: p.nome, config: st.config, historico: st.historico });
      var ref = String((st.config || {}).dataReferencia || '');
      var mm = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      c.previa = { ref: ref, mes: mm ? Number(mm[2]) - 1 : c.fechados, produzido: num(t.produzidoAcumulado), metaMes: num(t.metaMes), metaAcumulada: num(t.metaAcumulada) };
      return c;
    });
  }

  /* ── Pedaços de tela ───────────────────────────────────────────────── */
  function ficha(st, curto) { return st ? '<span class="ger-ficha st-' + st + '">' + (curto ? ROTULO_CURTO : ROTULO)[st] + '</span>' : ''; }
  function celDesvio(d, casas) {
    var st = G.situacao(d);
    return '<td class="ger-var st-' + st + '">' + (d.pct == null ? pp(d.valor) : pct(d.pct, casas)) + '</td>';
  }
  function kpi(chave, rotulo, valor, sub, destaque, cor, icone, barra) {
    return '<article class="kpi ger-kpi" data-kpi="' + chave + '" style="--accent:' + cor + '"><div class="icon">' + icone + '</div><div>' +
      '<div class="label">' + rotulo + '</div><span class="value">' + valor + '</span>' +
      '<div class="sub"><span>' + sub + '</span><b>' + (destaque || '') + '</b></div>' +
      '<div class="progress"><span style="width:' + Math.max(0, Math.min(100, barra || 0)).toFixed(1) + '%"></span></div></div></article>';
  }
  function nomePeriodo(c) {
    var m = estado.mes;
    if (estado.visao === 'mes') return G.MESES_LONGOS[m] + '/' + c.ano;
    if (estado.visao === 'ytd') return 'janeiro a ' + G.MESES_LONGOS[m] + '/' + c.ano;
    return 'ano ' + c.ano + ' (real até ' + G.MESES_LONGOS[c.fechados - 1] + ' + forecast)';
  }

  function blocoIndicadores(tot, rec, recAno, contratos) {
    var dRL = G.desvio('receitaLiquida', rec.real.receitaLiquida, rec.budget.receitaLiquida);
    var dEB = G.desvio('ebitda', rec.real.ebitda, rec.budget.ebitda);
    var dAno = G.desvio('ebitda', recAno.real.ebitda, recAno.budget.ebitda);
    var fora = contratos.filter(function (c) { return G.situacaoContrato(G.recorte(c, estado.visao, estado.mes)) === 'alr'; }).length;
    var cor = function (d) { var s = G.situacao(d); return s === 'alr' ? '#D0402B' : s === 'att' ? '#E0A100' : '#1E8A4C'; };
    return '<section class="kpis ger-kpis">' +
      kpi('receita', 'Receita líquida', mi(rec.real.receitaLiquida), 'orçamento ' + mi(rec.budget.receitaLiquida), pct(dRL.pct), cor(dRL), 'R', rec.budget.receitaLiquida ? rec.real.receitaLiquida / rec.budget.receitaLiquida * 100 : 0) +
      kpi('ebitda', 'EBITDA', mi(rec.real.ebitda), 'orçamento ' + mi(rec.budget.ebitda), pct(dEB.pct), cor(dEB), 'E', rec.budget.ebitda ? rec.real.ebitda / rec.budget.ebitda * 100 : 0) +
      kpi('margem', 'Margem EBITDA', pctSemSinal(rec.real.margemEbitda), 'orçamento ' + pctSemSinal(rec.budget.margemEbitda), pp(rec.real.margemEbitda - rec.budget.margemEbitda), rec.real.margemEbitda >= rec.budget.margemEbitda ? '#1E8A4C' : '#D0402B', '%', rec.real.margemEbitda * 400) +
      kpi('projecao', 'EBITDA projetado no ano', mi(recAno.real.ebitda), 'orçamento anual ' + mi(recAno.budget.ebitda), pct(dAno.pct), cor(dAno), 'P', recAno.budget.ebitda ? recAno.real.ebitda / recAno.budget.ebitda * 100 : 0) +
      kpi('politica', 'Contratos fora da política', fora + ' de ' + contratos.length, 'desvio desfavorável acima de ' + Math.round(G.POLITICA.limite * 100) + '%', '', fora ? '#D0402B' : '#1E8A4C', '!', contratos.length ? (contratos.length - fora) / contratos.length * 100 : 0) +
      '</section>';
  }

  function blocoDre(rec) {
    var linhas = G.LINHAS.map(function (l) {
      var r = rec.real[l.id], b = rec.budget[l.id], f = rec.forecast[l.id];
      var percentual = l.tipo === 'percentual';
      var fmt = percentual ? pctSemSinal : mil;
      var dB = G.desvio(l.id, r, b), dF = G.desvio(l.id, r, f);
      return '<tr class="' + (l.forte ? 'forte ' : '') + (l.recuo ? 'recuo ' : '') + (l.destaque ? 'destaque' : '') + '">' +
        '<td class="ger-linha">' + (l.tipo === 'custo' && !l.forte ? '(−) ' : '') + l.nome + '</td>' +
        '<td>' + fmt(r) + '</td><td>' + fmt(b) + '</td>' +
        '<td>' + (percentual ? '' : mil(dB.valor)) + '</td>' + celDesvio(dB) +
        '<td>' + fmt(f) + '</td>' + celDesvio(dF) + '</tr>';
    }).join('');
    return '<section class="panel ger-janela"><div class="panel-head"><span>Resultado gerencial</span><small>R$ mil · ' + esc(nomePeriodo({ ano: rec.ano || '', fechados: rec.fechados || 0 })) + '</small></div>' +
      '<div class="panel-body"><div class="ger-rolagem"><table class="ger-tabela ger-dre"><thead><tr><th>Linha</th><th>' + esc(rec.rotuloReal) + '</th><th>Orçamento</th><th>Desvio R$</th><th>Desvio %</th><th>Forecast</th><th>× Forecast</th></tr></thead><tbody>' +
      linhas + '</tbody></table></div></div></section>';
  }

  function blocoPrevia(contratos) {
    var linhas = [], tot = { prod: 0, esp: 0, bud: 0, proj: 0 };
    var mesRef = null;
    contratos.forEach(function (c) {
      var p = c.previa; if (!p) return;
      mesRef = p.mes;
      var bud = c.budget[p.mes] ? c.budget[p.mes].receitaBruta : 0;
      var fr = p.metaMes ? p.metaAcumulada / p.metaMes : 0;
      var esp = bud * fr, proj = fr ? p.produzido / fr : 0;
      var dEsp = G.desvio('receitaBruta', p.produzido, esp), dProj = G.desvio('receitaBruta', proj, bud);
      tot.prod += p.produzido; tot.esp += esp; tot.bud += bud; tot.proj += proj;
      linhas.push('<tr><td class="ger-linha">' + esc(c.nome) + '</td><td>' + mil(p.produzido) + '</td><td>' + mil(esp) + '</td>' + celDesvio(dEsp) +
        '<td>' + mil(bud) + '</td><td>' + mil(proj) + '</td>' + celDesvio(dProj) + '</tr>');
    });
    var dT = G.desvio('receitaBruta', tot.prod, tot.esp), dTP = G.desvio('receitaBruta', tot.proj, tot.bud);
    var nomeMes = mesRef == null ? '' : G.MESES_LONGOS[mesRef];
    var ref = contratos.map(function (c) { return c.previa && c.previa.ref; }).filter(Boolean).sort().slice(-1)[0] || '';
    return '<section class="panel ger-janela"><div class="panel-head"><span>Prévia de ' + esc(nomeMes) + '</span><small>receita bruta · R$ mil · produção até ' + esc(ref) + '</small></div>' +
      '<div class="panel-body"><div class="ger-rolagem"><table class="ger-tabela"><thead><tr><th>Contrato</th><th>Produção até a data</th><th>Orçamento até a data</th><th>Desvio</th><th>Orçamento do mês</th><th>Projeção do mês</th><th>× Orçamento</th></tr></thead>' +
      '<tbody>' + linhas.join('') + '</tbody><tfoot><tr><td class="ger-linha">Total</td><td>' + mil(tot.prod) + '</td><td>' + mil(tot.esp) + '</td>' + celDesvio(dT) +
      '<td>' + mil(tot.bud) + '</td><td>' + mil(tot.proj) + '</td>' + celDesvio(dTP) + '</tr></tfoot></table></div>' +
      '<p class="ger-nota">Projeção do mês no ritmo atual: produção até a data dividida pela parcela da meta do mês já vencida.</p></div></section>';
  }

  function blocoContratos(contratos, total) {
    var linha = function (c, rodape) {
      var r = G.recorte(c, estado.visao, estado.mes), a = G.recorte(c, 'ano', estado.mes);
      var dR = G.desvio('receitaLiquida', r.real.receitaLiquida, r.budget.receitaLiquida);
      var dE = G.desvio('ebitda', r.real.ebitda, r.budget.ebitda);
      var dA = G.desvio('ebitda', a.real.ebitda, a.budget.ebitda);
      var st = G.situacaoContrato(r);
      return '<tr><td class="ger-linha">' + esc(c.nome) + '</td>' +
        '<td>' + mil(r.real.receitaLiquida) + '</td><td>' + mil(r.budget.receitaLiquida) + '</td>' + celDesvio(dR) +
        '<td>' + mil(r.real.ebitda) + '</td><td>' + mil(r.budget.ebitda) + '</td>' + celDesvio(dE) +
        '<td>' + pctSemSinal(r.real.margemEbitda) + '</td><td>' + pctSemSinal(r.budget.margemEbitda) + '</td>' +
        '<td>' + mil(a.real.ebitda) + '</td>' + celDesvio(dA) +
        '<td class="ger-centro">' + (rodape ? '' : ficha(st, true)) + '</td></tr>';
    };
    return '<section class="panel ger-janela"><div class="panel-head"><span>Resultado por contrato</span><small>R$ mil · ' + esc(nomePeriodo(total)) + '</small></div>' +
      '<div class="panel-body"><div class="ger-rolagem"><table class="ger-tabela ger-contratos"><thead>' +
      '<tr class="ger-grupos"><th></th><th colspan="3">Receita líquida</th><th colspan="3">EBITDA</th><th colspan="2">Margem EBITDA</th><th colspan="2">EBITDA no ano</th><th></th></tr>' +
      '<tr><th>Contrato</th><th>Real</th><th>Orçamento</th><th>Desvio</th><th>Real</th><th>Orçamento</th><th>Desvio</th><th>Real</th><th>Orçamento</th><th>Projeção</th><th>× Orçamento</th><th>Situação</th></tr></thead>' +
      '<tbody>' + contratos.map(function (c) { return linha(c); }).join('') + '</tbody>' +
      (contratos.length > 1 ? '<tfoot>' + linha(total, true).replace('<td class="ger-linha">Total</td>', '<td class="ger-linha">Total</td>') + '</tfoot>' : '') +
      '</table></div></div></section>';
  }

  function blocoEvolucao(total) {
    var m = estado.metrica;
    var celula = function (tipo, i) {
      var v = total[tipo][i];
      if (!v) return '<td class="ger-vazio">·</td>';
      return '<td>' + mil(v[m]) + '</td>';
    };
    var soma = function (tipo) { return total[tipo].reduce(function (s, v) { return s + (v ? v[m] : 0); }, 0); };
    var projAno = 0, i;
    for (i = 0; i < 12; i++) projAno += i < total.fechados ? total.real[i][m] : total.forecast[i][m];
    var linhaVar = '<tr class="ger-varlinha"><td class="ger-linha">Real × orçamento</td>';
    for (i = 0; i < 12; i++) {
      if (i < total.fechados) { var d = G.desvio(m, total.real[i][m], total.budget[i][m]); linhaVar += '<td class="ger-var st-' + G.situacao(d) + '">' + pct(d.pct) + '</td>'; }
      else linhaVar += '<td class="ger-vazio">·</td>';
    }
    var dAno = G.desvio(m, projAno, soma('budget'));
    linhaVar += '<td class="ger-var st-' + G.situacao(dAno) + '">' + pct(dAno.pct) + '</td></tr>';
    var cab = '<th>' + (m === 'ebitda' ? 'EBITDA' : 'Receita líquida') + '</th>' + G.MESES.map(function (n, k) { return '<th class="' + (k < total.fechados ? 'fechado' : 'aberto') + '">' + n + '</th>'; }).join('') + '<th>Ano</th>';
    return '<section class="panel ger-janela"><div class="panel-head"><span>Evolução mensal</span>' +
      '<div class="ger-alternar" role="group" aria-label="Linha mostrada"><button type="button" data-metrica="receitaLiquida"' + (m === 'receitaLiquida' ? ' aria-pressed="true"' : '') + '>Receita líquida</button><button type="button" data-metrica="ebitda"' + (m === 'ebitda' ? ' aria-pressed="true"' : '') + '>EBITDA</button></div>' +
      '<small>R$ mil · meses fechados em destaque</small></div>' +
      '<div class="panel-body"><div class="ger-rolagem"><table class="ger-tabela ger-meses"><thead><tr>' + cab + '</tr></thead><tbody>' +
      '<tr><td class="ger-linha">Orçamento</td>' + G.MESES.map(function (_, k) { return celula('budget', k); }).join('') + '<td>' + mil(soma('budget')) + '</td></tr>' +
      '<tr><td class="ger-linha">Forecast ' + esc(total.versao) + '</td>' + G.MESES.map(function (_, k) { return celula('forecast', k); }).join('') + '<td>' + mil(soma('forecast')) + '</td></tr>' +
      '<tr class="forte"><td class="ger-linha">Real</td>' + G.MESES.map(function (_, k) { return celula('real', k); }).join('') + '<td title="Real dos meses fechados + forecast dos meses que faltam">' + mil(projAno) + '*</td></tr>' +
      linhaVar + '</tbody></table></div><p class="ger-nota">* Ano: real dos meses fechados mais o forecast dos meses que faltam.</p>' +
      '<div class="ger-graficos"><div class="ger-grafico"><canvas id="gerGraficoMeses" aria-label="Evolução mensal"></canvas></div><div class="ger-grafico"><canvas id="gerGraficoContratos" aria-label="EBITDA por contrato"></canvas></div></div>' +
      '</div></section>';
  }

  function blocoJustificativas(contratos) {
    var lista = [];
    contratos.forEach(function (c) { lista = lista.concat(G.pendencias(c)); });
    lista.sort(function (a, b) { return b.mes - a.mes || a.nome.localeCompare(b.nome); });
    var pend = lista.filter(function (x) { return !(x.justificativa && String(x.justificativa.texto || '').trim()); }).length;
    var corpo = lista.length ? lista.map(function (x) {
      var j = x.justificativa || {};
      var ok = String(j.texto || '').trim();
      return '<tr><td class="ger-linha">' + esc(x.nome) + '</td><td class="ger-centro">' + G.MESES[x.mes] + '</td><td class="ger-esq">' + NOME_LINHA[x.linha] + '</td>' +
        '<td class="ger-var st-alr">' + pct(x.desvio.pct) + '</td><td class="ger-texto">' + (ok ? esc(j.texto) : '<span class="ger-falta">Sem justificativa</span>') + '</td>' +
        '<td class="ger-esq">' + esc(j.responsavel || '') + '</td><td class="ger-centro">' + esc(j.prazo || '') + '</td>' +
        '<td class="ger-centro">' + (ok ? '<span class="ger-ficha st-ok">Justificado</span>' : '<span class="ger-ficha st-alr">Pendente</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="ger-centro ger-vazio-linha">Nenhum desvio acima de ' + Math.round(G.POLITICA.limite * 100) + '% nos meses fechados.</td></tr>';
    return '<section class="panel ger-janela"><div class="panel-head"><span>Desvios fora da política</span><small>' + lista.length + ' desvio(s) · ' + pend + ' sem justificativa</small></div>' +
      '<div class="panel-body"><div class="ger-rolagem"><table class="ger-tabela ger-justificativas"><thead><tr><th>Contrato</th><th>Mês</th><th>Linha</th><th>Desvio</th><th>Justificativa e plano de ação</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead>' +
      '<tbody>' + corpo + '</tbody></table></div>' +
      '<p class="ger-politica"><b>Política de desvio:</b> até ' + Math.round(G.POLITICA.tolerancia * 100) + '% desfavorável, dentro da política · de ' + Math.round(G.POLITICA.tolerancia * 100) + '% a ' + Math.round(G.POLITICA.limite * 100) + '%, atenção · acima de ' + Math.round(G.POLITICA.limite * 100) + '%, justificativa e plano de ação obrigatórios. Forecast revisado a cada trimestre (3+9, 6+6, 9+3).</p>' +
      '</div></section>';
  }

  function blocoFiltros(contratos, total) {
    var chips = liberados().map(function (p) {
      var on = estado.selecionados.indexOf(p.id) >= 0;
      return '<button type="button" class="ger-contrato' + (on ? ' on' : '') + '" data-contrato="' + esc(p.id) + '" aria-pressed="' + on + '">' + esc(p.nome) + '</button>';
    }).join('');
    var meses = '';
    for (var i = 0; i < total.fechados; i++) meses += '<option value="' + i + '"' + (i === estado.mes ? ' selected' : '') + '>' + G.MESES_LONGOS[i].charAt(0).toUpperCase() + G.MESES_LONGOS[i].slice(1) + '/' + total.ano + '</option>';
    var visao = [['mes', 'Mês'], ['ytd', 'Acumulado no ano'], ['ano', 'Projeção do ano']].map(function (v) {
      return '<button type="button" data-visao="' + v[0] + '"' + (estado.visao === v[0] ? ' aria-pressed="true"' : '') + '>' + v[1] + '</button>';
    }).join('');
    return '<section class="ger-filtros"><div class="ger-filtro"><span class="ger-rotulo">Contratos</span><div class="ger-chips">' + chips + '</div></div>' +
      '<div class="ger-filtro"><span class="ger-rotulo">Visão</span><div class="ger-alternar" role="group">' + visao + '</div></div>' +
      '<div class="ger-filtro"><span class="ger-rotulo">Até o mês</span><select id="gerMes"' + (estado.visao === 'ano' ? ' disabled' : '') + '>' + meses + '</select></div></section>';
  }

  /* ── Montagem ──────────────────────────────────────────────────────── */
  var assinatura = '';
  function desenhar(forcar) {
    var app = el('gerencialApp');
    if (!app || !document.body.classList.contains('executive-mode')) return;
    var todos = lerContratos();
    if (!todos.length) { app.innerHTML = '<div class="ger-vazio-geral">Nenhum contrato liberado para este usuário.</div>'; return; }
    if (!estado.selecionados) estado.selecionados = todos.map(function (c) { return c.id; });
    estado.selecionados = estado.selecionados.filter(function (id) { return todos.some(function (c) { return c.id === id; }); });
    if (!estado.selecionados.length) estado.selecionados = todos.map(function (c) { return c.id; });
    var contratos = todos.filter(function (c) { return estado.selecionados.indexOf(c.id) >= 0; });
    var total = G.consolidar(contratos);
    if (!total.fechados) {
      app.innerHTML = '<header class="titlebar ger-titlebar"><div class="titlebar-left"><div class="logo-marca"></div></div><span class="title-text">ACOMPANHAMENTO GERENCIAL</span>' +
        '<button type="button" class="btn btn-white ger-editar pp-edit-only" onclick="ppGerAbrirEditor()">Orçamento e forecast</button><button type="button" class="btn btn-back" onclick="voltarAoPicker()">Voltar</button></header>' +
        '<div class="ger-vazio-geral">Ainda não há mês fechado no orçamento dos contratos selecionados. Cadastre o orçamento e o realizado em Orçamento e forecast.</div>';
      assinatura = '';
      return;
    }
    if (estado.mes == null || estado.mes > total.fechados - 1) estado.mes = Math.max(0, total.fechados - 1);
    var rec = G.recorte(total, estado.visao, estado.mes);
    rec.ano = total.ano; rec.fechados = total.fechados;
    var recAno = G.recorte(total, 'ano', estado.mes);
    var nova = JSON.stringify([estado, todos.map(function (c) { return [c.id, c.budget, c.forecast, c.real, c.justificativas, c.previa]; })]);
    if (!forcar && nova === assinatura) return;
    assinatura = nova;
    var rolagem = app.scrollTop;
    var titulo = '<header class="titlebar ger-titlebar"><div class="titlebar-left"><div class="logo-marca" aria-label="Painel de Produtividade"></div></div>' +
      '<span class="title-text">ACOMPANHAMENTO GERENCIAL</span>' +
      '<div class="title-date">ORÇAMENTO ' + total.ano + ' · FORECAST ' + esc(total.versao) + ' · FECHADO ATÉ ' + G.MESES_LONGOS[total.fechados - 1].toUpperCase() + '</div>' +
      '<button type="button" class="btn btn-white ger-editar pp-edit-only" onclick="ppGerAbrirEditor()">Orçamento e forecast</button>' +
      '<button type="button" class="btn btn-back" onclick="voltarAoPicker()">Voltar</button></header>';
    app.innerHTML = titulo + blocoFiltros(contratos, total) + blocoIndicadores(total, rec, recAno, contratos) +
      '<div class="ger-grade2">' + blocoDre(rec) + blocoPrevia(contratos) + '</div>' +
      blocoContratos(contratos, total) + blocoEvolucao(total) + blocoJustificativas(contratos) +
      '<footer class="ger-rodape">Valores fictícios de demonstração · R$ mil = milhares de reais</footer>';
    app.scrollTop = rolagem;
    desenharGraficos(total, contratos);
  }
  window.ppGerDesenhar = desenhar;

  function desenharGraficos(total, contratos) {
    if (!window.Chart) return;
    Object.keys(graficos).forEach(function (k) { try { graficos[k].destroy(); } catch (e) { } });
    graficos = {};
    var m = estado.metrica, rot = m === 'ebitda' ? 'EBITDA' : 'Receita líquida';
    var realOuFc = G.MESES.map(function (_, i) { return i < total.fechados ? total.real[i][m] / 1000 : total.forecast[i][m] / 1000; });
    var c1 = el('gerGraficoMeses');
    if (c1) graficos.meses = new Chart(c1, {
      type: 'bar',
      data: { labels: G.MESES, datasets: [
        { type: 'bar', label: 'Real (fechado) e forecast', data: realOuFc, backgroundColor: G.MESES.map(function (_, i) { return i < total.fechados ? '#1F6FB2' : '#A9C6E3'; }), order: 2 },
        { type: 'line', label: 'Orçamento', data: total.budget.map(function (v) { return v[m] / 1000; }), borderColor: '#161B24', backgroundColor: '#161B24', borderDash: [5, 4], pointRadius: 2, borderWidth: 2, tension: 0, order: 1 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { title: { display: true, text: rot + ' mensal (R$ mil)', align: 'start', color: '#161B24', font: { weight: '700', size: 12 } }, legend: { position: 'bottom', labels: { boxWidth: 10 } },
          tooltip: { callbacks: { label: function (x) { return ' ' + x.dataset.label + ': R$ ' + MIL.format(x.raw) + ' mil'; } } } },
        scales: { y: { ticks: { callback: function (v) { return MIL.format(v); } }, grid: { color: '#EEF0F3' } }, x: { grid: { display: false } } } }
    });
    var c2 = el('gerGraficoContratos');
    if (c2) {
      var recs = contratos.map(function (c) { return G.recorte(c, estado.visao, estado.mes); });
      graficos.contratos = new Chart(c2, {
        type: 'bar',
        data: { labels: contratos.map(function (c) { return c.nome; }), datasets: [
          { label: 'Real', data: recs.map(function (r) { return r.real.ebitda / 1000; }), backgroundColor: recs.map(function (r) { var s = G.situacao(G.desvio('ebitda', r.real.ebitda, r.budget.ebitda)); return s === 'alr' ? '#D0402B' : s === 'att' ? '#E0A100' : '#1E8A4C'; }) },
          { label: 'Orçamento', data: recs.map(function (r) { return r.budget.ebitda / 1000; }), backgroundColor: '#C9D3DE' }
        ] },
        options: { responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { title: { display: true, text: 'EBITDA por contrato: real × orçamento (R$ mil)', align: 'start', color: '#161B24', font: { weight: '700', size: 12 } }, legend: { position: 'bottom', labels: { boxWidth: 10 } },
            tooltip: { callbacks: { label: function (x) { return ' ' + x.dataset.label + ': R$ ' + MIL.format(x.raw) + ' mil'; } } } },
          scales: { y: { ticks: { callback: function (v) { return MIL.format(v); } }, grid: { color: '#EEF0F3' } }, x: { grid: { display: false } } } }
      });
    }
  }

  /* ── Interação (estado guardado aqui) ──────────────────────────────── */
  document.addEventListener('click', function (e) {
    var alvo = e.target && e.target.closest && e.target.closest('#gerencialApp [data-contrato], #gerencialApp [data-visao], #gerencialApp [data-metrica]');
    if (!alvo) return;
    if (alvo.hasAttribute('data-contrato')) {
      var id = alvo.getAttribute('data-contrato');
      var i = estado.selecionados.indexOf(id);
      if (i >= 0 && estado.selecionados.length > 1) estado.selecionados.splice(i, 1); else if (i < 0) estado.selecionados.push(id);
    } else if (alvo.hasAttribute('data-visao')) estado.visao = alvo.getAttribute('data-visao');
    else estado.metrica = alvo.getAttribute('data-metrica');
    desenhar(true);
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'gerMes') { estado.mes = Number(e.target.value); desenhar(true); }
  });

  /* ── Abrir o gerencial (substitui a página separada antiga) ────────── */
  function esperarContratos(max) {
    var ini = Date.now();
    return new Promise(function (ok) {
      (function tick() {
        var prontos = liberados().every(function (p) { return nuvemRespondeu(p.id); });
        if (prontos || Date.now() - ini >= max) { ok(); return; }
        setTimeout(tick, 120);
      })();
    });
  }
  window.openExecutivePanel = function () {
    document.body.classList.add('executive-mode');
    try { if (typeof window.ppShowExecLoading === 'function') window.ppShowExecLoading(); } catch (e) { }
    try { if (typeof ppSubscribeAllProjects === 'function') ppSubscribeAllProjects(); } catch (e) { }
    try { if (window.ppHistorySync && window.ppHistorySync.subscribeAllProjectsHistory) window.ppHistorySync.subscribeAllProjectsHistory(); } catch (e) { }
    esperarContratos(8000).then(function () {
      assinatura = '';
      desenhar(true);
      try { if (typeof window.ppHideExecLoading === 'function') window.ppHideExecLoading(); else window.ppHideLoading(); } catch (e) { }
    });
  };
  try { openExecutivePanel = window.openExecutivePanel; } catch (e) { }
  /* Dado novo na nuvem: redesenha só se algo mudou */
  try { if (window.ppExecutiveBridge && window.ppExecutiveBridge.onExecutiveRefresh) window.ppExecutiveBridge.onExecutiveRefresh(function () { desenhar(false); }); } catch (e) { }
  setInterval(function () { desenhar(false); }, 2000);
})();
