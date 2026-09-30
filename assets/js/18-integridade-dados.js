    (function () {
      "use strict";

      var TORRE_SVG =
        '<svg class="pp-load-torre" viewBox="0 0 64 80" role="img" aria-label="Torre de transmissao">' +
        '<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M19 78 L29.5 7 M45 78 L34.5 7"/><path d="M29.5 7 H34.5"/>' +
        '<path d="M7 21 H57"/><path d="M11 33 H53"/><path d="M15 45 H49"/>' +
        '<path d="M26.2 21 L37.8 33 M37.8 21 L26.2 33"/>' +
        '<path d="M24.4 33 L39.6 45 M39.6 33 L24.4 45"/>' +
        '<path d="M22.6 45 L41.4 62 M41.4 45 L22.6 62"/><path d="M21 62 H43"/></g>' +
        '<g fill="currentColor" opacity=".85"><circle cx="7" cy="21" r="2.6"/><circle cx="57" cy="21" r="2.6"/>' +
        '<circle cx="11" cy="33" r="2.4"/><circle cx="53" cy="33" r="2.4"/></g></svg>';

      function vestirTelaDeCarregamento(raiz) {
        try {
          if (!raiz || raiz.dataset.aneAplicado === '1') return;
          var marca = raiz.querySelector('.splash-brand');
          if (!marca) return;

          var sufixo = marca.querySelector('.sp-qt');
          if (sufixo) sufixo.remove();

          var torre = document.createElement('div');
          torre.innerHTML = TORRE_SVG;
          if (torre.firstChild) raiz.insertBefore(torre.firstChild, marca);

          var divisao = document.createElement('div');
          divisao.className = 'pp-load-divisao';
          divisao.textContent = 'Gestão de Produtividade Operacional';
          marca.parentNode.insertBefore(divisao, marca.nextSibling);

          var legenda = raiz.querySelector('#execLoadingMsg');
          if (legenda) legenda.style.display = 'none';

          raiz.dataset.aneAplicado = '1';
        } catch (e) { }
      }

      function vestirTodasAsTelas() {
        vestirTelaDeCarregamento(document.getElementById('authSplash'));
        vestirTelaDeCarregamento(document.getElementById('execLoadingOverlay'));
      }

      if (typeof window.ppShowLoading === 'function') {
        var mostrarLoadingOriginal = window.ppShowLoading;
        window.ppShowLoading = function () {
          var r = mostrarLoadingOriginal.apply(this, arguments);
          vestirTodasAsTelas();
          try {
            var sub = document.getElementById('execLoadingSub');
            if (sub) sub.remove();
          } catch (e) { }
          return r;
        };
      }
      vestirTodasAsTelas();

      function garantirEspacador() {
        try {
          var tabela = document.getElementById('mainTable');
          if (!tabela) return;
          var corpo = tabela.tBodies && tabela.tBodies[0];
          if (!corpo || !corpo.rows.length) return;

          var ultima = corpo.rows[corpo.rows.length - 1];
          if (ultima && ultima.classList.contains('pp-linha-espacadora')) return;

          var colunas = (tabela.querySelectorAll('thead th') || []).length || 10;
          var tr = document.createElement('tr');
          tr.className = 'pp-linha-espacadora';
          tr.setAttribute('aria-hidden', 'true');
          var td = document.createElement('td');
          td.colSpan = colunas;
          tr.appendChild(td);
          corpo.appendChild(tr);
        } catch (e) { }
      }

      var ALTURA_MIN = 360;

      function ajustarAlturaDaFaixa() {
        try {
          var faixa = document.querySelector('.dashboard .main');
          var tabela = document.getElementById('mainTable');
          if (!faixa || !tabela) return;
          var corpo = tabela.tBodies && tabela.tBodies[0];
          if (!corpo) return;

          var alturaConteudo = 0;
          if (tabela.tHead) alturaConteudo += tabela.tHead.offsetHeight;
          Array.prototype.forEach.call(corpo.rows, function (tr) {
            if (!tr.classList.contains('pp-linha-espacadora')) alturaConteudo += tr.offsetHeight;
          });
          if (tabela.tFoot) alturaConteudo += tabela.tFoot.offsetHeight;
          if (!alturaConteudo) return;

          var painel = faixa.querySelector('.panel');
          var barra = painel ? painel.querySelector('.panel-head') : null;
          var extra = (barra ? barra.offsetHeight : 25) + 18;

          var altura = Math.max(ALTURA_MIN, alturaConteudo + extra);

          var atual = faixa.style.height;
          var nova = altura + 'px';
          if (atual !== nova) faixa.style.height = nova;
        } catch (e) { }
      }

      if (typeof window.renderAll === 'function') {
        var renderAllOriginal = window.renderAll;
        var reentrante = false;
        window.renderAll = function () {
          var r = renderAllOriginal.apply(this, arguments);
          if (reentrante) return r;
          reentrante = true;
          try { garantirEspacador(); } catch (e) { }
          try { ajustarAlturaDaFaixa(); } catch (e) { }
          try {
            if (typeof window.ppMarcarBotoesEdicao === 'function') window.ppMarcarBotoesEdicao();
          } catch (e) { }
          reentrante = false;
          return r;
        };
      }
      garantirEspacador();
      ajustarAlturaDaFaixa();

      (function fixarRotuloEntrar() {
        var btn = document.getElementById('loginSubmitBtn');
        if (!btn || typeof MutationObserver !== 'function') return;
        var ROTULO = 'Entrar';
        var ajustando = false;
        function ajustar() {
          if (ajustando) return;
          if (btn.getAttribute('data-ocupado') === '1') return;
          var txt = (btn.textContent || '').trim();
          if (txt === ROTULO || txt.indexOf('Entrando') === 0) return;
          ajustando = true;
          btn.textContent = ROTULO;
          ajustando = false;
        }
        new MutationObserver(ajustar).observe(btn, { childList: true, characterData: true, subtree: true });
        ajustar();
      })();

      var relogioEntrar = null;
      var LIMITE_ENTRAR = 8000;

      window.ppBotaoEntrarOcupado = function (ocupado, texto) {
        var btn = document.getElementById('loginSubmitBtn');
        if (!btn) return;
        if (relogioEntrar) { clearTimeout(relogioEntrar); relogioEntrar = null; }
        if (ocupado) {
          if (!btn.getAttribute('data-rotulo')) {
            btn.setAttribute('data-rotulo', (btn.textContent || 'Entrar').trim() || 'Entrar');
          }
          btn.setAttribute('data-ocupado', '1');
          btn.setAttribute('aria-busy', 'true');
          btn.disabled = true;
          btn.innerHTML = '<span class="marca-rodinha" aria-hidden="true"></span>' +
            '<span>' + String(texto || 'Entrando').replace(/[<>&]/g, '') + '</span>';

          relogioEntrar = setTimeout(function () {
            relogioEntrar = null;
            if (!document.body.classList.contains('app-locked')) return;
            if (btn.getAttribute('data-ocupado') !== '1') return;
            window.ppBotaoEntrarOcupado(false);
          }, LIMITE_ENTRAR);
        } else {
          btn.removeAttribute('data-ocupado');
          btn.removeAttribute('aria-busy');
          btn.disabled = false;
          btn.textContent = btn.getAttribute('data-rotulo') || 'Entrar';
        }
      };

      (function travarCliqueDuplo() {
        var btn = document.getElementById('loginSubmitBtn');
        if (!btn) return;
        btn.addEventListener('click', function (ev) {
          if (btn.getAttribute('data-ocupado') === '1') {
            ev.preventDefault();
            ev.stopImmediatePropagation();
          }
        }, true);
      })();

      (function destravarQuandoAbrir() {
        if (typeof MutationObserver !== 'function') return;
        var estava = document.body.classList.contains('app-locked');
        new MutationObserver(function () {
          var agora = document.body.classList.contains('app-locked');
          if (agora === estava) return;
          estava = agora;
          if (typeof window.ppBotaoEntrarOcupado === 'function') {
            window.ppBotaoEntrarOcupado(false);
          }
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      })();

      function travarBotao(btn, texto) {
        if (!btn) return;
        if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.style.opacity = '.72';
        btn.style.cursor = 'wait';
        btn.style.transform = 'scale(.985)';
        btn.textContent = texto;
      }
      function destravarBotao(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.transform = '';
        if (btn.dataset.textoOriginal) {
          btn.textContent = btn.dataset.textoOriginal;
          delete btn.dataset.textoOriginal;
        }
      }
      function escolhaAtual() {
        try {
          var sel = document.getElementById('pickerSelect');
          if (sel && sel.value) return sel.value;
          var ativo = document.querySelector('#pickerProjectList button[data-pid].active');
          if (ativo) return ativo.getAttribute('data-pid') || '';
        } catch (e) { }
        return '';
      }
      function seletorVisivel() {
        var bg = document.getElementById('projectPickerBg');
        return !!(bg && bg.style.display !== 'none');
      }

      if (typeof window.pickerOpenSelected === 'function') {
        var abrirOriginal = window.pickerOpenSelected;
        var abrindo = false;
        window.pickerOpenSelected = function () {
          if (abrindo) return;
          abrindo = true;
          var btn = document.getElementById('pickerOpenBtn');
          travarBotao(btn, 'Abrindo...');
          var tentativas = 0;
          (function tentar() {
            tentativas++;
            var id = escolhaAtual();
            if (id && typeof window.pickerSelectTile === 'function') {
              try { window.pickerSelectTile(id); } catch (e) { }
            }
            if (id) { try { abrirOriginal(); } catch (e) { } }
            setTimeout(function () {
              if (!seletorVisivel()) { abrindo = false; destravarBotao(btn); return; }
              if (tentativas === 1 && !id) travarBotao(btn, 'Carregando opcoes...');
              if (tentativas < 20) { setTimeout(tentar, 300); return; }
              abrindo = false;
              destravarBotao(btn);
            }, 180);
          })();
        };
      }

      function qtdeMovimentos(estado) {
        try {
          var m = estado && estado.config && estado.config.financeiroExecutivo
            && estado.config.financeiroExecutivo.movimentos;
          return Array.isArray(m) ? m.length : 0;
        } catch (e) { return 0; }
      }
      function temFinanceiro(estado) {
        try {
          var fin = (estado && estado.config && estado.config.financeiroExecutivo) || {};
          if (Array.isArray(fin.movimentos) && fin.movimentos.length) return true;
          var chaves = ['budgetAno', 'forecastAtual', 'projecaoProducao', 'receitaLiquidaAtual',
            'custosAtuais', 'custosFechamento', 'receitaBrutaForecast', 'receitaLiquidaProjetada',
            'custosProjetados', 'ebitdaForecastMeta', 'wipArranque', 'custosDiferimentos',
            'faturamentoProjetado', 'valorFatBi'];
          return chaves.some(function (k) {
            var v = Number(fin[k]);
            return isFinite(v) && Math.abs(v) > 0.00001;
          });
        } catch (e) { return false; }
      }
      function nomeProjeto(pid) {
        try {
          var p = (typeof projectById === 'function') ? projectById(pid) : null;
          return (p && p.nome) || pid;
        } catch (e) { return pid; }
      }

      var jaAvisado = {};
      function avisarBloqueio(titulo, detalhe) {
        try {
          var box = document.getElementById('ppAvisoIntegridade');
          if (!box) {
            box = document.createElement('div');
            box.id = 'ppAvisoIntegridade';
            box.setAttribute('style', 'position:fixed;right:16px;bottom:16px;z-index:100000;display:flex;' +
              'flex-direction:column;gap:8px;max-width:min(460px,92vw);font:600 12px Segoe UI,Arial,sans-serif;');
            document.body.appendChild(box);
          }
          var card = document.createElement('div');
          card.setAttribute('style', 'background:#B3321F;color:#fff;border-radius:10px;padding:12px 14px;' +
            'box-shadow:0 8px 24px rgba(0,0,0,.28);line-height:1.35;');
          var t = document.createElement('div');
          t.setAttribute('style', 'font-weight:900;font-size:12.5px;margin-bottom:2px');
          t.textContent = titulo;
          var d = document.createElement('div');
          d.setAttribute('style', 'font-weight:600;opacity:.92;font-size:11.5px');
          d.textContent = detalhe;
          var wrap = document.createElement('div');
          wrap.setAttribute('style', 'text-align:right;margin-top:8px');
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('style', 'background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:6px;' +
            'padding:5px 12px;font:800 11px Segoe UI,Arial,sans-serif;cursor:pointer');
          b.textContent = 'Fechar';
          b.onclick = function () { try { card.remove(); } catch (e) { } };
          wrap.appendChild(b);
          card.appendChild(t); card.appendChild(d); card.appendChild(wrap);
          box.appendChild(card);
        } catch (e) { }
      }

      if (typeof window.ppSaveStateRemote === 'function') {
        var salvarOriginal = window.ppSaveStateRemote;
        window.ppSaveStateRemote = function (projectId, state, immediate) {
          try {
            var cache = window.__PP_REMOTE_PROJECT_CACHE__ || {};
            var naNuvem = cache[projectId];
            var intencional = !!window.__ppIntentionalClear;
            if (!intencional && naNuvem) {
              var movAntes = qtdeMovimentos(naNuvem);
              var movAgora = qtdeMovimentos(state);
              var tinhaFin = temFinanceiro(naNuvem);
              var temFin = temFinanceiro(state);
              if ((movAntes > 0 && movAgora === 0) || (tinhaFin && !temFin)) {
                console.warn('Painel integridade: bloqueado save que apagaria financeiro de',
                  projectId, { movimentosNaNuvem: movAntes, movimentosNoSave: movAgora });
                if (!jaAvisado[projectId]) {
                  jaAvisado[projectId] = true;
                  avisarBloqueio('Gravacao bloqueada: ' + nomeProjeto(projectId),
                    'O painel tentou salvar este contrato sem os movimentos/financeiro que ja existem na ' +
                    'nuvem (' + movAntes + ' movimento(s) cadastrado(s)). A gravacao foi barrada para nao ' +
                    'apagar o que esta la. Os dados na tela continuam corretos.');
                }
                return Promise.resolve(state);
              }
            }
          } catch (e) {
          }
          return salvarOriginal(projectId, state, immediate);
        };
      }

      window.scheduleEditorPreview = function () { };
      window.scheduleEditorAutoSave = function () { };

      (function gravarNoDiaSelecionado() {
        if (typeof window.dailyKey !== 'function') return;
        var dailyKeyOriginal = window.dailyKey;
        var BASE_VISAO = 'painel-produtividade-view-dia-graficos-v1-projetos';

        window.dailyKey = function () {
          try {
            var pid = window.currentProjectId ||
              (typeof currentProjectId !== 'undefined' ? currentProjectId : '');
            if (pid) {
              var escolhido = localStorage.getItem(BASE_VISAO + '::' + pid);
              if (escolhido && escolhido !== '__current' &&
                /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(escolhido).trim())) {
                return String(escolhido).trim();
              }
            }
          } catch (e) { }
          return dailyKeyOriginal();
        };
      })();

      if (typeof window.saveDaySnapshot === 'function') {
        var gravarDiaOriginal = window.saveDaySnapshot;
        window.saveDaySnapshot = function () {
          var r = gravarDiaOriginal.apply(this, arguments);
          try {
            var data = (typeof window.dailyKey === 'function') ? window.dailyKey() : '';
            if (!data || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(data).trim())) return r;
            data = String(data).trim();

            if (typeof equipes === 'undefined' || !Array.isArray(equipes)) return r;
            var totalDoDia = equipes.reduce(function (s, e) {
              var v = Number(e && e.produzidoDia);
              return s + (isFinite(v) ? v : 0);
            }, 0);

            if (typeof historico === 'undefined' || !Array.isArray(historico)) return r;
            var i = historico.findIndex(function (h) {
              return h && String(h.data || '').trim() === data;
            });
            if (i >= 0) historico[i] = Object.assign({}, historico[i], { data: data, total: totalDoDia });
            else historico.push({ data: data, total: totalDoDia });
          } catch (e) { }
          return r;
        };
        try { saveDaySnapshot = window.saveDaySnapshot; } catch (e) { }
      }

      (function fecharGravacaoDoConsolidado() {
        function bloqueada() {
          console.warn('Painel: o Acompanhamento Gerencial nao grava. Edite pelo Editor de Forecast do contrato.');
          return Promise.resolve();
        }
        try { window.ppUpdateExecutiveFinance = bloqueada; } catch (e) { }
        try {
          if (window.ppExecutiveBridge) window.ppExecutiveBridge.updateExecutiveFinance = bloqueada;
        } catch (e) { }
      })();

      if (typeof window.loginApp === 'function') {
        var loginOriginal = window.loginApp;
        var autenticando = false;
        window.loginApp = function (evento) {
          if (autenticando) { if (evento) evento.preventDefault(); return false; }
          autenticando = true;
          try { return loginOriginal(evento); }
          finally { setTimeout(function () { autenticando = false; }, 1200); }
        };
      }
    
  (function () {
    var ID = 'aneAvisoGravacao';

    function estilo() {
      if (document.getElementById(ID + 'Estilo')) return;
      var css = [
        '#' + ID + '{position:fixed;right:14px;bottom:14px;z-index:100000;max-width:340px;',
        'display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border-radius:11px;',
        'font-family:inherit;font-size:11.5px;font-weight:800;line-height:1.35;color:#fff;',
        'box-shadow:0 12px 30px -10px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);',
        'transition:opacity .18s ease,transform .18s ease}',
        '#' + ID + '.marca-visivel{opacity:1;transform:translateY(0)}',
        '#' + ID + '.marca-ok{background:#1E8A4C}',
        '#' + ID + '.marca-erro{background:#B3321F}',
        '#' + ID + ' b{display:block;font-size:12px;margin-bottom:2px}',
        '#' + ID + ' button{margin-left:auto;background:transparent;border:0;color:#fff;',
        'font-size:15px;font-weight:900;cursor:pointer;line-height:1;padding:0 2px}'
      ].join('');
      var tag = document.createElement('style');
      tag.id = ID + 'Estilo';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    var relogio = null;

    window.ppAvisoGravacao = function (ok, motivo) {
      try {
        estilo();
        var caixa = document.getElementById(ID);
        if (!caixa) {
          caixa = document.createElement('div');
          caixa.id = ID;
          document.body.appendChild(caixa);
        }
        clearTimeout(relogio);

        caixa.className = ok ? 'marca-ok' : 'marca-erro';
        caixa.innerHTML = ok
          ? '<span><b>Salvo na nuvem</b></span>'
          : '<span><b>Não salvou na nuvem</b>Tente salvar de novo.</span>' +
            '<button type="button" aria-label="Fechar">&times;</button>';

        var fechar = caixa.querySelector('button');
        if (fechar) fechar.onclick = function () { caixa.classList.remove('marca-visivel'); };

        requestAnimationFrame(function () { caixa.classList.add('marca-visivel'); });

        if (ok) relogio = setTimeout(function () { caixa.classList.remove('marca-visivel'); }, 4000);
      } catch (e) { }
    };
  })();

  (function () {
    function injetarEstilo() {
      if (document.getElementById('aneBuscaEquipeEstilo')) return;
      var css = [
        '.pp-busca-equipe{margin-left:auto;margin-right:8px;min-width:150px;max-width:210px;',
        'padding:5px 9px;border:1px solid rgba(255,255,255,.55);border-radius:8px;',
        'background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:10.5px;',
        'font-weight:800;outline:none}',
        '.pp-busca-equipe::placeholder{color:rgba(255,255,255,.8);font-weight:700}',
        '.pp-busca-equipe:focus{background:rgba(255,255,255,.26);border-color:#fff}',
        '.pp-busca-bloco{display:block;width:100%;max-width:none;margin:0 0 6px;',
        'background:#fff;color:#161B24;border-color:var(--line,#E3E6EA)}',
        '.pp-busca-bloco::placeholder{color:#99A1AC}',
        '.pp-busca-bloco:focus{background:#fff;border-color:#1F6FB2}',
        '.pp-linha-filtro td{background:#E7F0F9 !important;color:#185A92 !important;',
        'font-weight:900 !important}',
        '@media (max-width:760px){.pp-busca-equipe{min-width:110px}}'
      ].join('');
      var tag = document.createElement('style');
      tag.id = 'aneBuscaEquipeEstilo';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    window.ppBuscarEquipe = function (texto) {
      window.ppFiltroEquipe = String(texto || '');
      try {
        window.ppFiltroEquipeProjeto =
          (typeof window.currentProjectId !== 'undefined') ? window.currentProjectId : '';
      } catch (e) { }
      try { if (typeof window.renderAll === 'function') window.renderAll(); } catch (e) { }
    };

    window.ppFiltrarListaEquipes = function (idSelect, texto) {
      try {
        var select = document.getElementById(idSelect);
        if (!select) return;
        var alvo = String(texto || '').trim().toLowerCase();
        var escolhida = select.value;
        var lista = (typeof equipes !== 'undefined' && Array.isArray(equipes)) ? equipes : [];
        var html = '';
        lista.forEach(function (item) {
          var nome = String((item && item.equipe) || '');
          if (!nome) return;
          var casa = !alvo || nome.toLowerCase().indexOf(alvo) >= 0;
          if (!casa && nome !== escolhida) return;
          html += '<option value="' + nome.replace(/"/g, '&quot;') + '">' +
            nome.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</option>';
        });
        select.innerHTML = html;
        if (escolhida) select.value = escolhida;
      } catch (e) { }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injetarEstilo);
    } else {
      injetarEstilo();
    }
  })();

})();
