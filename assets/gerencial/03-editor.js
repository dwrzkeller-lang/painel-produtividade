/* ═══ ACOMPANHAMENTO GERENCIAL · EDITOR DE ORÇAMENTO E FORECAST ═════════════
   Uma grade de 12 meses por contrato, em três versões (orçamento, forecast e
   realizado do fechamento), mais as justificativas dos desvios fora da
   política. Grava só no botão Salvar, direto na nuvem, junto do contrato. */
(function () {
  'use strict';
  if (window.__ppGerencialEditor) return;
  window.__ppGerencialEditor = true;
  var G = window.PPGerencial;

  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function lerNumero(txt) {
    var s = String(txt == null ? '' : txt).trim().replace(/\s/g, '').replace(/^R\$/, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var v = Number(s); return isFinite(v) ? v : NaN;
  }
  var NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var MIL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var ABAS = [['budget', 'Orçamento'], ['forecast', 'Forecast'], ['realizado', 'Realizado'], ['justificativas', 'Justificativas']];
  var ROTULOS = { receitaBruta: 'Receita bruta', pessoal: 'Pessoal', frota: 'Frota e combustível', materiais: 'Materiais', terceiros: 'Serviços de terceiros', indiretas: 'Despesas indiretas' };
  var VERSOES = ['3+9', '6+6', '9+3'];

  var ed = null; /* { pid, orc, aba, sujo } */

  function podeEditar(pid) {
    try { if (typeof window.ppIsReadOnlyRole === 'function' && window.ppIsReadOnlyRole()) return false; } catch (e) { }
    var ids = window.currentUserProjectIds;
    return String(window.currentUserRole || '') === 'admin' || !Array.isArray(ids) || ids.indexOf(pid) >= 0;
  }
  function editaveis() {
    return (typeof PROJECTS !== 'undefined' ? PROJECTS : []).filter(function (p) { return podeEditar(p.id); });
  }
  function orcamentoVazio(ano) {
    var bloco = function () { var b = {}; G.ENTRADAS.forEach(function (k) { b[k] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; }); return b; };
    return { ano: ano, forecastVersao: '9+3', mesFechado: 0, budget: bloco(), forecast: bloco(), realizado: bloco(), justificativas: [] };
  }
  function carregar(pid) {
    var st = loadStoredProjectState(pid);
    var orc = JSON.parse(JSON.stringify((st.config && st.config.orcamento) || orcamentoVazio(new Date().getFullYear())));
    ['budget', 'forecast', 'realizado'].forEach(function (b) {
      orc[b] = orc[b] || {};
      G.ENTRADAS.forEach(function (k) { var v = orc[b][k] || []; orc[b][k] = []; for (var i = 0; i < 12; i++) orc[b][k].push(num(v[i])); });
    });
    orc.justificativas = Array.isArray(orc.justificativas) ? orc.justificativas : [];
    return { st: st, orc: orc };
  }

  function montar() {
    if (el('gerEditorBg')) return;
    var bg = document.createElement('div');
    bg.className = 'modal-bg ger-editor-bg';
    bg.id = 'gerEditorBg';
    bg.innerHTML = '<div class="modal ger-editor" role="dialog" aria-modal="true" aria-labelledby="gerEdTitulo">' +
      '<div class="modal-head"><span id="gerEdTitulo">Orçamento e forecast</span><button type="button" class="btn btn-white" onclick="ppGerFecharEditor()">Fechar</button></div>' +
      '<div class="modal-body ger-editor-corpo" id="gerEdCorpo"></div>' +
      '<div class="modal-foot"><span class="ger-ed-aviso" id="gerEdAviso"></span><button type="button" class="btn btn-white" onclick="ppGerFecharEditor()">Cancelar</button>' +
      '<button type="button" class="btn btn-green" id="gerEdSalvar" onclick="ppGerSalvarEditor()">Salvar</button></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener('input', aoDigitar);
    bg.addEventListener('change', aoMudar);
    bg.addEventListener('click', function (e) {
      var aba = e.target.closest && e.target.closest('[data-aba]');
      if (aba) { guardarGrade(); ed.aba = aba.getAttribute('data-aba'); desenhar(); }
    });
  }

  function grade() {
    var bloco = ed.orc[ed.aba];
    var fechados = num(ed.orc.mesFechado);
    var linhas = G.ENTRADAS.map(function (k) {
      var total = 0;
      var cels = bloco[k].map(function (v, i) {
        total += num(v);
        var travado = ed.aba === 'realizado' && i >= fechados;
        return '<td><input class="ger-ed-num" data-linha="' + k + '" data-mes="' + i + '" inputmode="decimal" value="' + (travado ? '' : NUM.format(num(v))) + '"' + (travado ? ' disabled title="Mês ainda não fechado"' : '') + '></td>';
      }).join('');
      return '<tr><th scope="row">' + ROTULOS[k] + '</th>' + cels + '<td class="ger-ed-total" data-total="' + k + '">' + MIL.format(total / 1000) + '</td></tr>';
    }).join('');
    var taxa = G.taxaLiquida((ed.st && ed.st.config) || {});
    var calc = function (id, rot) {
      var soma = 0;
      var cels = G.MESES.map(function (_, i) {
        var e = {}; G.ENTRADAS.forEach(function (k) { e[k] = bloco[k][i]; });
        var d = G.dre(e, taxa); soma += id === 'margemEbitda' ? 0 : d[id];
        return '<td data-calc="' + id + '" data-mes="' + i + '">' + (id === 'margemEbitda' ? (d.margemEbitda * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : MIL.format(d[id] / 1000)) + '</td>';
      }).join('');
      return '<tr class="ger-ed-calc"><th scope="row">' + rot + '</th>' + cels + '<td>' + (id === 'margemEbitda' ? '' : MIL.format(soma / 1000)) + '</td></tr>';
    };
    return '<div class="ger-rolagem"><table class="ger-ed-grade"><thead><tr><th>R$</th>' + G.MESES.map(function (m, i) { return '<th class="' + (i < fechados ? 'fechado' : '') + '">' + m + '</th>'; }).join('') + '<th>Ano (mil)</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody><tbody class="ger-ed-calculado">' + calc('receitaLiquida', 'Receita líquida (mil)') + calc('ebitda', 'EBITDA (mil)') + calc('margemEbitda', 'Margem EBITDA') + '</tbody></table></div>';
  }

  function justificativas() {
    guardarGrade();
    var c = G.montarContrato({ id: ed.pid, nome: '', config: Object.assign({}, ed.st.config, { orcamento: ed.orc }), historico: ed.st.historico });
    var lista = G.pendencias(c);
    if (!lista.length) return '<p class="ger-ed-vazio">Nenhum desvio acima de ' + Math.round(G.POLITICA.limite * 100) + '% nos meses fechados deste contrato.</p>';
    return '<div class="ger-rolagem"><table class="ger-ed-just"><thead><tr><th>Mês</th><th>Linha</th><th>Desvio</th><th>Justificativa e plano de ação</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>' +
      lista.map(function (x) {
        var j = x.justificativa || {};
        var chave = (x.mes + 1) + '|' + x.linha;
        return '<tr><td>' + G.MESES[x.mes] + '</td><td>' + (x.linha === 'ebitda' ? 'EBITDA' : 'Receita líquida') + '</td>' +
          '<td class="ger-var st-alr">' + (x.desvio.pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%</td>' +
          '<td><textarea data-just="' + chave + '" data-campo="texto" rows="2">' + esc(j.texto || '') + '</textarea></td>' +
          '<td><input data-just="' + chave + '" data-campo="responsavel" value="' + esc(j.responsavel || '') + '"></td>' +
          '<td><input data-just="' + chave + '" data-campo="prazo" placeholder="dd/mm/aaaa" value="' + esc(j.prazo || '') + '"></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function desenhar() {
    var nomes = editaveis();
    var sel = nomes.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === ed.pid ? ' selected' : '') + '>' + esc(p.nome) + '</option>'; }).join('');
    var fech = '';
    for (var i = 0; i <= 12; i++) fech += '<option value="' + i + '"' + (i === num(ed.orc.mesFechado) ? ' selected' : '') + '>' + (i === 0 ? 'Nenhum' : G.MESES_LONGOS[i - 1]) + '</option>';
    var versoes = VERSOES.map(function (v) { return '<option' + (v === ed.orc.forecastVersao ? ' selected' : '') + '>' + v + '</option>'; }).join('');
    el('gerEdCorpo').innerHTML =
      '<div class="ger-ed-topo"><label>Contrato<select id="gerEdContrato">' + sel + '</select></label>' +
      '<label>Ano<input value="' + esc(ed.orc.ano) + '" disabled></label>' +
      '<label>Versão do forecast<select id="gerEdVersao">' + versoes + '</select></label>' +
      '<label>Último mês fechado<select id="gerEdFechado">' + fech + '</select></label></div>' +
      '<div class="ger-alternar ger-ed-abas" role="tablist">' + ABAS.map(function (a) { return '<button type="button" role="tab" data-aba="' + a[0] + '"' + (ed.aba === a[0] ? ' aria-pressed="true"' : '') + '>' + a[1] + '</button>'; }).join('') + '</div>' +
      (ed.aba === 'justificativas' ? justificativas() : grade()) +
      '<p class="ger-nota">' + (ed.aba === 'realizado' ? 'Realizado do fechamento contábil. Se a receita de um mês fechado ficar em branco, vale a produção lançada no painel.' :
        ed.aba === 'justificativas' ? 'Desvios desfavoráveis acima de ' + Math.round(G.POLITICA.limite * 100) + '% pedem justificativa, responsável e prazo do plano de ação.' :
          'Valores em reais. Custos em positivo; o sinal é aplicado no resultado.') + '</p>';
    el('gerEdTitulo').textContent = 'Orçamento e forecast · ' + ((nomes.find(function (p) { return p.id === ed.pid; }) || {}).nome || '');
    avisar(ed.sujo ? 'Alterações não salvas' : '');
  }
  function avisar(t, bom) { var a = el('gerEdAviso'); if (a) { a.textContent = t || ''; a.className = 'ger-ed-aviso' + (bom ? ' bom' : ''); } }

  /* Guarda o que está digitado na grade (sem gravar na nuvem) */
  function guardarGrade() {
    if (!ed || ed.aba === 'justificativas') return;
    document.querySelectorAll('#gerEdCorpo .ger-ed-num:not([disabled])').forEach(function (inp) {
      var v = lerNumero(inp.value);
      if (!isNaN(v)) ed.orc[ed.aba][inp.getAttribute('data-linha')][Number(inp.getAttribute('data-mes'))] = v;
    });
  }
  function aoDigitar(e) {
    var t = e.target;
    if (t.classList && t.classList.contains('ger-ed-num')) {
      ed.sujo = true; avisar('Alterações não salvas');
      var v = lerNumero(t.value);
      t.classList.toggle('invalido', isNaN(v));
      if (!isNaN(v)) {
        ed.orc[ed.aba][t.getAttribute('data-linha')][Number(t.getAttribute('data-mes'))] = v;
        atualizarCalculados();
      }
    } else if (t.hasAttribute && t.hasAttribute('data-just')) {
      ed.sujo = true; avisar('Alterações não salvas');
      var partes = t.getAttribute('data-just').split('|');
      var j = ed.orc.justificativas.find(function (x) { return num(x.mes) === Number(partes[0]) && x.linha === partes[1]; });
      if (!j) { j = { mes: Number(partes[0]), linha: partes[1] }; ed.orc.justificativas.push(j); }
      j[t.getAttribute('data-campo')] = t.value;
    }
  }
  /* Atualiza só as linhas calculadas, sem refazer os campos (o cursor fica onde está) */
  function atualizarCalculados() {
    var bloco = ed.orc[ed.aba], taxa = G.taxaLiquida(ed.st.config || {});
    G.ENTRADAS.forEach(function (k) {
      var cel = document.querySelector('#gerEdCorpo [data-total="' + k + '"]');
      if (cel) cel.textContent = MIL.format(bloco[k].reduce(function (s, v) { return s + num(v); }, 0) / 1000);
    });
    document.querySelectorAll('#gerEdCorpo [data-calc]').forEach(function (cel) {
      var i = Number(cel.getAttribute('data-mes')), id = cel.getAttribute('data-calc');
      var e = {}; G.ENTRADAS.forEach(function (k) { e[k] = bloco[k][i]; });
      var d = G.dre(e, taxa);
      cel.textContent = id === 'margemEbitda' ? (d.margemEbitda * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : MIL.format(d[id] / 1000);
    });
  }
  function aoMudar(e) {
    var t = e.target;
    if (t.id === 'gerEdContrato') {
      if (ed.sujo && !confirm('Há alterações não salvas neste contrato. Trocar de contrato e descartar?')) { t.value = ed.pid; return; }
      abrirContrato(t.value, ed.aba);
    } else if (t.id === 'gerEdVersao') { ed.orc.forecastVersao = t.value; ed.sujo = true; avisar('Alterações não salvas'); }
    else if (t.id === 'gerEdFechado') { guardarGrade(); ed.orc.mesFechado = Number(t.value); ed.sujo = true; desenhar(); }
    else if (t.classList && t.classList.contains('ger-ed-num')) {
      var v = lerNumero(t.value);
      if (!isNaN(v)) t.value = NUM.format(v);
    }
  }
  function abrirContrato(pid, aba) {
    var c = carregar(pid);
    ed = { pid: pid, st: c.st, orc: c.orc, aba: aba || 'budget', sujo: false };
    desenhar();
  }

  window.ppGerAbrirEditor = function (pid) {
    var lista = editaveis();
    if (!lista.length) { alert('Seu perfil pode consultar o orçamento, mas não editar.'); return; }
    var alvo = pid && lista.some(function (p) { return p.id === pid; }) ? pid : lista[0].id;
    montar();
    abrirContrato(alvo, 'budget');
    el('gerEditorBg').classList.add('open');
  };
  window.ppGerFecharEditor = function () {
    if (ed && ed.sujo && !confirm('Fechar sem salvar as alterações?')) return;
    var bg = el('gerEditorBg'); if (bg) bg.classList.remove('open');
    ed = null;
  };
  window.ppGerSalvarEditor = function () {
    if (!ed) return;
    guardarGrade();
    if (document.querySelector('#gerEdCorpo .invalido')) { avisar('Há valores inválidos em vermelho. Corrija antes de salvar.'); return; }
    if (!podeEditar(ed.pid)) { avisar('Seu perfil não pode salvar este contrato.'); return; }
    var botao = el('gerEdSalvar');
    botao.disabled = true; avisar('Salvando…');
    try {
      var st = loadStoredProjectState(ed.pid);
      st.config = normalizeConfigObject(st.config || {});
      ed.orc.atualizadoEm = new Date().toISOString();
      ed.orc.atualizadoPor = window.currentUserLogin || '';
      ed.orc.justificativas = ed.orc.justificativas.filter(function (j) { return String(j.texto || j.responsavel || j.prazo || '').trim(); });
      st.config.orcamento = JSON.parse(JSON.stringify(ed.orc));
      try { if (typeof currentProjectId !== 'undefined' && currentProjectId === ed.pid && typeof config !== 'undefined' && config) config.orcamento = JSON.parse(JSON.stringify(ed.orc)); } catch (e) { }
      Promise.resolve(ppSaveStateRemote(ed.pid, st, true)).then(function () {
        ed.sujo = false; ed.st = loadStoredProjectState(ed.pid);
        botao.disabled = false; avisar('Salvo', true);
        try { if (typeof window.ppGerDesenhar === 'function') window.ppGerDesenhar(true); } catch (e) { }
      }, function () { botao.disabled = false; avisar('Não foi possível salvar. Tente de novo.'); });
    } catch (e) { botao.disabled = false; avisar('Não foi possível salvar. Tente de novo.'); }
  };
})();
