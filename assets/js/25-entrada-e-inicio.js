/* ═══ ENTRADA, CAPAS E ESCOLHA DE CONTRATOS ════════════════════════════════
   • Entrada: mostrar a senha e "Esqueci minha senha".
   • Capas: cobrem a tela no primeiro quadro; só a saída esmaece. Depois de
     entrar, a capa cumprimenta a pessoa enquanto os contratos chegam.
   • Escolha de contratos: um quadro por contrato com os números do mês.

   Os números da escolha de contratos saem das MESMAS funções do painel
   (loadStoredProjectState + calcTotalsFromState) e só aparecem depois que os
   dados do contrato chegaram; antes disso o quadro fica em espera. */
(function () {
  'use strict';
  if (window.__paEntrada) return;
  window.__paEntrada = true;

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function moeda(v) { return BRL.format(num(v)); }
  function pct(v) { return (num(v) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }
  var PAPEIS = { admin: 'Administrador', ceo: 'Diretoria', diretor: 'Diretoria', gerente: 'Gerente', coordenador: 'Coordenador', controller: 'Controller' };

  /* ── Entrada ───────────────────────────────────────────────────────── */
  var OLHO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_FECHADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  window.ppAlternarSenha = function (botao) {
    var campo = el('loginPass');
    if (!campo) return;
    var mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    if (botao) {
      botao.innerHTML = mostrar ? OLHO_FECHADO : OLHO;
      botao.title = mostrar ? 'Ocultar a senha' : 'Mostrar a senha';
      botao.setAttribute('aria-label', botao.title);
    }
    try { campo.focus(); } catch (e) { }
  };
  window.ppEsqueciSenha = function () {
    var aviso = el('loginError');
    var email = String((el('loginUser') || {}).value || '').trim();
    var dizer = function (texto, bom) { if (aviso) { aviso.textContent = texto; aviso.classList.toggle('bom', !!bom); } };
    if (window.PP_MODO_DEMONSTRACAO) { dizer('Na demonstração, a senha de todas as contas é demo123.', true); return; }
    if (!email) { dizer('Digite seu e-mail acima e clique de novo em "Esqueci minha senha".'); return; }
    try {
      window.firebase.auth().sendPasswordResetEmail(email)
        .then(function () { dizer('Enviamos um link para criar uma senha nova em ' + email + '.', true); })
        .catch(function () { dizer('Não foi possível enviar o link. Confira o e-mail digitado.'); });
    } catch (e) { dizer('Não foi possível enviar o link agora.'); }
  };
  document.addEventListener('input', function (e) {
    if (e.target && (e.target.id === 'loginUser' || e.target.id === 'loginPass')) {
      var aviso = el('loginError'); if (aviso && aviso.classList.contains('bom')) { aviso.textContent = ''; aviso.classList.remove('bom'); }
    }
  });

  /* Nome e sobrenome da conta, para o cumprimento ("Olá, Diego Keller") */
  function nomeCurto() { return String(window.currentUserNome || '').trim().split(/\s+/).slice(0, 2).join(' '); }

  /* ── Capas ─────────────────────────────────────────────────────────── */
  function capa() { return el('execLoadingOverlay'); }
  function escreverCapa(c, titulo, sub, passo) {
    if (!c) return;
    var t = c.querySelector('[data-pa-titulo]');
    if (t) t.innerHTML = esc(titulo || '') + '<small data-pa-sub>' + esc(sub || '') + '</small>';
    var p = c.querySelector('.pa-capa-passo');
    if (p && passo !== undefined) p.textContent = passo;
  }
  if (typeof window.ppShowLoading === 'function') {
    var mostrarOriginal = window.ppShowLoading;
    window.ppShowLoading = function (subtitulo) {
      var r = mostrarOriginal.apply(this, arguments);
      var c = capa();
      if (c) {
        c.style.transition = 'none';
        c.style.opacity = '1';
        c.style.display = 'flex';
        void c.offsetWidth;
        var gerencial = /gerencial/i.test(String(subtitulo || ''));
        escreverCapa(c, subtitulo ? String(subtitulo) : 'Carregando', '', gerencial ? 'carregando orçamento, forecast e realizado' : 'carregando os números do contrato');
      }
      return r;
    };
  }
  if (typeof window.ppHideLoading === 'function') {
    var esconderOriginal = window.ppHideLoading;
    window.ppHideLoading = function () {
      var c = capa();
      if (c && c.style.display !== 'none' && !window.__ppRestoringCardScreen) c.style.transition = 'opacity .3s ease';
      return esconderOriginal.apply(this, arguments);
    };
  }
  /* A capa da sessão (ao abrir a página) só diz o que está fazendo */
  (function () { var s = el('authSplash'); if (s) escreverCapa(s, '', '', 'conferindo o acesso'); })();

  /* A tela de contratos nunca aparece com quadros em "carregando": enquanto
     algum contrato não chegou da nuvem (logo depois de entrar ou ao reabrir
     a página já logado), a capa cumprimenta e cobre a tela. Se a nuvem não
     responder em 6 segundos, a capa sai e os quadros dizem "carregando". */
  var cumprimentando = false;
  var esperaEsgotada = false;
  function cumprimentar() {
    if (cumprimentando) return;
    cumprimentando = true;
    var c = capa();
    if (!c) { cumprimentando = false; return; }
    c.style.transition = 'none'; c.style.opacity = '1'; c.style.display = 'flex'; c.style.pointerEvents = 'auto';
    var nome = nomeCurto();
    escreverCapa(c, 'Olá' + (nome ? ', ' + nome : ''), PAPEIS[window.currentUserRole] || '', 'carregando os contratos');
    var inicio = Date.now();
    (function esperar() {
      var prontos = itensLiberados().filter(function (i) { return i.id !== '__executive__'; }).every(function (i) { return nuvemRespondeu(i.id); });
      var passou = Date.now() - inicio;
      if ((prontos && passou >= 900) || passou >= 6000) {
        if (!prontos) esperaEsgotada = true;
        cumprimentando = false;
        desenharInicio();
        c.style.transition = 'opacity .3s ease'; c.style.opacity = '0'; c.style.pointerEvents = 'none';
        setTimeout(function () { if (c.style.opacity === '0') c.style.display = 'none'; }, 320);
        return;
      }
      setTimeout(esperar, 120);
    })();
  }
  if (typeof MutationObserver === 'function') {
    var estavaTravado = document.body.classList.contains('app-locked');
    new MutationObserver(function () {
      var travado = document.body.classList.contains('app-locked');
      if (travado) esperaEsgotada = false;
      estavaTravado = travado;
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── Escolha de contratos ──────────────────────────────────────────── */
  function inicioVisivel() { var bg = el('projectPickerBg'); return !!(bg && bg.style.display && bg.style.display !== 'none'); }
  function itensLiberados() {
    var lista = el('pickerProjectList');
    if (!lista) return [];
    return Array.prototype.map.call(lista.querySelectorAll('button[data-pid]'), function (b) {
      return { id: b.getAttribute('data-pid'), nome: (b.textContent || '').trim() };
    });
  }
  function nuvemRespondeu(pid) { try { return !!(window.__PP_NUVEM_RESPONDEU__ || {})[pid]; } catch (e) { return false; } }
  function descricao(pid) {
    try { var d = (typeof EXECUTIVE_PROJECT_DEFAULTS !== 'undefined') && EXECUTIVE_PROJECT_DEFAULTS[pid]; return d ? (d.contract || '') + (d.region ? ' · Regional ' + d.region : '') : ''; } catch (e) { return ''; }
  }
  function metricas(pid) {
    if (!nuvemRespondeu(pid)) return null;
    try {
      var estado = loadStoredProjectState(pid);
      var t = calcTotalsFromState(estado, pid);
      var cfg = estado.config || {};
      var ref = String(cfg.dataReferencia || '').trim();
      /* Produção de cada dia do mês de referência (datas 'dd/mm' ou 'dd/mm/aaaa';
         o dia repetido nos dois formatos conta uma vez) */
      var mr = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      var dias = {};
      (Array.isArray(estado.historico) ? estado.historico : []).forEach(function (h) {
        var m = String(h && h.data || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
        if (!m || !mr || Number(m[2]) !== Number(mr[2]) || (m[3] && m[3] !== mr[3])) return;
        dias[Number(m[1])] = num(h.total);
      });
      var ritmo = Object.keys(dias).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { return dias[d]; });
      var metaAcum = num(t.metaAcumulada), prod = num(t.produzidoAcumulado), metaMes = num(t.metaMes);
      return {
        equipes: (estado.equipes || []).length, ref: ref, metaMes: metaMes, metaAcumulada: metaAcum, produzido: prod,
        desvio: prod - metaAcum, desvioPct: metaAcum ? (prod - metaAcum) / metaAcum : 0,
        realizadoMes: metaMes ? prod / metaMes : 0, esperadoMes: metaMes ? metaAcum / metaMes : 0, ritmo: ritmo
      };
    } catch (e) { return null; }
  }
  /* Mesma régua de cor do gerencial: na meta, até 5% abaixo, mais de 5% abaixo */
  function situacao(dp, temMeta) { return !temMeta ? '' : dp >= 0 ? 'ok' : dp >= -0.05 ? 'att' : 'alr'; }
  var ROTULO = { ok: 'Na meta', att: 'Atenção', alr: 'Abaixo da meta' };
  function linhaRitmo(v) {
    if (!v || v.length < 2) return '<svg viewBox="0 0 200 30"></svg>';
    var L = 200, A = 30, max = Math.max.apply(null, v), min = Math.min(0, Math.min.apply(null, v)), f = (max - min) || 1;
    var p = v.map(function (x, i) { return [(i / (v.length - 1)) * L, A - 2 - ((x - min) / f) * (A - 6)]; });
    var d = p.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + L + ' ' + A + '" preserveAspectRatio="none" aria-hidden="true"><path class="pa-area" d="' + d + ' L' + L + ' ' + A + ' L0 ' + A + ' Z"/><path d="' + d + '"/></svg>';
  }
  function quadroContrato(item) {
    var m = metricas(item.id);
    if (!m) {
      return '<div class="pa-contrato pa-esperando" aria-busy="true"><div class="pa-contrato-topo"><div class="pa-contrato-nome"><b>' + esc(item.nome) + '</b><small>carregando</small></div></div>' +
        '<span class="pa-esqueleto" style="width:70%"></span><span class="pa-esqueleto" style="width:45%"></span><div class="pa-medidor"></div></div>';
    }
    var st = situacao(m.desvioPct, m.metaAcumulada > 0);
    var r = Math.max(0, Math.min(100, m.realizadoMes * 100)), e = Math.max(0, Math.min(100, m.esperadoMes * 100));
    return '<button type="button" class="pa-contrato st-' + st + '" data-pid="' + esc(item.id) + '">' +
      '<div class="pa-contrato-topo"><div class="pa-contrato-nome"><b>' + esc(item.nome) + '</b><small>' + esc(descricao(item.id) || (m.equipes + ' equipes')) + '</small></div>' +
      (st ? '<span class="pa-ficha st-' + st + '">' + ROTULO[st] + '</span>' : '') + '</div>' +
      '<div class="pa-numeros"><div><small>Produção acumulada</small><b>' + moeda(m.produzido) + '</b></div>' +
      '<div><small>Meta acumulada</small><b>' + moeda(m.metaAcumulada) + '</b></div>' +
      '<div><small>Desvio</small><b class="' + (m.desvio >= 0 ? 'pa-pos' : 'pa-neg') + '">' + (m.desvio >= 0 ? '+' : '') + pct(m.desvioPct) + '</b></div></div>' +
      '<div><div class="pa-medidor st-' + st + '"><i style="width:' + r.toFixed(2) + '%"></i><em style="left:' + e.toFixed(2) + '%"></em></div>' +
      '<div class="pa-medidor-legenda"><span>' + pct(m.realizadoMes) + ' da meta do mês</span><span>traço: esperado até hoje</span></div></div>' +
      '<div class="pa-ritmo">' + linhaRitmo(m.ritmo) + '<span>' + m.equipes + ' equipes</span></div>' +
      '</button>';
  }
  var ICONE_GERENCIAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/></svg>';
  var assinatura = '';
  function desenharInicio() {
    if (!inicioVisivel()) return;
    var itens = itensLiberados();
    var contratos = itens.filter(function (i) { return i.id !== '__executive__'; });
    if (!cumprimentando && !esperaEsgotada && contratos.some(function (c) { return !nuvemRespondeu(c.id); })) { cumprimentar(); return; }
    var gerencial = itens.some(function (i) { return i.id === '__executive__'; });
    var html = '';
    if (gerencial) {
      html += '<button type="button" class="pa-gerencial" data-pid="__executive__"><span class="pa-gerencial-icone">' + ICONE_GERENCIAL + '</span>' +
        '<span><b>Acompanhamento gerencial</b><small>Orçamento, forecast e realizado de todos os contratos</small></span><span class="pa-gerencial-ir">Abrir</span></button>';
    }
    html += '<div class="pa-secao-rotulo"><b>Contratos</b><span>' + contratos.length + (contratos.length === 1 ? ' contrato' : ' contratos') + '</span></div>';
    html += contratos.length ? '<div class="pa-contratos">' + contratos.map(quadroContrato).join('') + '</div>'
      : '<p class="pa-inicio-data">Nenhum contrato liberado para este usuário.</p>';
    var refs = contratos.map(function (c) { var m = metricas(c.id); return m && m.ref; }).filter(Boolean);
    if (refs.length) html += '<div class="pa-rodape-inicio"><span>Dados até ' + esc(refs.sort().slice(-1)[0]) + '</span><span>Dados fictícios de demonstração</span></div>';
    var nome = nomeCurto();
    var data = '';
    try { data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); data = data.charAt(0).toUpperCase() + data.slice(1); } catch (e) { }
    var nova = html + '|' + nome + '|' + data + '|' + window.currentUserRole;
    if (nova === assinatura) return;
    assinatura = nova;
    if (el('paInicioConteudo')) el('paInicioConteudo').innerHTML = html;
    if (el('paInicioOla')) el('paInicioOla').textContent = 'Olá' + (nome ? ', ' + nome : '');
    if (el('paInicioData')) el('paInicioData').textContent = data;
    if (el('paInicioAdmin')) el('paInicioAdmin').hidden = window.currentUserRole !== 'admin';
    if (el('paInicioUsuario')) el('paInicioUsuario').innerHTML = '<b>' + esc(window.currentUserNome || window.currentUserLogin || '') + '</b> · ' + esc(PAPEIS[window.currentUserRole] || '');
  }
  window.ppDesenharInicio = desenharInicio;
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#paInicioConteudo [data-pid]');
    if (!b || b.classList.contains('pa-esperando')) return;
    var pid = b.getAttribute('data-pid');
    if (typeof window.pickerAbrir === 'function') window.pickerAbrir(pid);
    else if (typeof window._pickProject === 'function') window._pickProject(pid);
  });
  if (typeof MutationObserver === 'function') {
    var obs = new MutationObserver(function () { if (inicioVisivel()) { assinatura = ''; desenharInicio(); } });
    ['projectPickerBg', 'pickerProjectList'].forEach(function (id) { var a = el(id); if (a) obs.observe(a, { attributes: true, attributeFilter: ['style'], childList: true }); });
  }
  setInterval(function () { if (inicioVisivel()) desenharInicio(); }, 1500);

  /* ── Gráficos com barras retas, como o resto do painel ─────────────── */
  try {
    if (window.Chart) {
      window.Chart.defaults.elements.bar.borderRadius = 0;
      window.Chart.register({
        id: 'paBarrasRetas',
        beforeUpdate: function (chart) {
          (chart.data && chart.data.datasets || []).forEach(function (ds) { if (typeof ds.borderRadius === 'number') ds.borderRadius = 0; });
        }
      });
    }
  } catch (e) { }
  /* Demonstração: apaga o que foi mudado neste navegador e volta aos dados
     fictícios originais. Não existe na nuvem de verdade. */
  window.ppRestaurarDemonstracao = function () {
    if (!window.PP_MODO_DEMONSTRACAO || !window.ppDemo) return;
    if (!confirm('Apagar as alterações feitas neste navegador e voltar aos dados originais da demonstração?')) return;
    window.ppDemo.restaurar();
  };
  (function () {
    var b = document.getElementById('admRestaurarDemo');
    if (b) b.hidden = !window.PP_MODO_DEMONSTRACAO;
  })();

})();
