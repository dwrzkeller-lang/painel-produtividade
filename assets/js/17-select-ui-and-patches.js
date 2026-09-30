    (function () {
      'use strict';

      var TARGETS = '.login-field select, .tc-field select, .field select, .pfin-field select, .pp-team-day-select, #editRole, #editStatus, #bankPeriodFilter, #dailyBankSelect';
      var EXCLUDE = ['ppProdPeriodMonth', 'ppProdPeriodDay'];

      function boxClass(native) {
        if (native.classList.contains('pp-team-day-select')) return 'pp-sel-box pp-sel-box-sm pp-team-filter-box';
        if (native.closest('.login-field')) return 'pp-sel-box pp-sel-box-lg';
        if (native.closest('.tc-field')) return 'pp-sel-box pp-sel-box-md';
        if (native.closest('.bank-row')) return 'pp-sel-box pp-sel-box-sm';
        if (native.closest('.field')) return 'pp-sel-box pp-sel-box-sm';
        return 'pp-sel-box pp-sel-box-xs';
      }

      function wrap(native) {
        if (native._aplDone) return;
        if (EXCLUDE.indexOf(native.id) >= 0) return;
        native._aplDone = true;

        var wrapper = document.createElement('div');
        wrapper.className = 'pp-sel';
        if (native.classList.contains('pp-team-day-select')) wrapper.classList.add('pp-team-select-ui');
        if (native.classList.contains('pp-team-month-select')) wrapper.classList.add('pp-team-month-ui');

        var box = document.createElement('div');
        box.className = boxClass(native);
        box.setAttribute('tabindex', '0');
        box.setAttribute('role', 'combobox');
        box.setAttribute('aria-expanded', 'false');

        var valSpan = document.createElement('span');
        valSpan.className = 'pp-sel-val';

        var ico = document.createElement('span');
        ico.className = 'pp-sel-ico';
        ico.innerHTML = '<svg viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        box.appendChild(valSpan);
        box.appendChild(ico);

        var listDiv = document.createElement('div');
        listDiv.className = 'pp-sel-list';
        listDiv.setAttribute('role', 'listbox');

        native.parentNode.insertBefore(wrapper, native);
        wrapper.appendChild(native);
        wrapper.appendChild(box);
        wrapper.appendChild(listDiv);

        native.setAttribute('aria-hidden', 'true');
        native.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;overflow:hidden';

        function syncLabel() {
          var opt = native.options[native.selectedIndex];
          valSpan.textContent = opt ? opt.text : '';
          listDiv.querySelectorAll('.pp-sel-opt').forEach(function (item, i) {
            item.classList.toggle('is-sel', i === native.selectedIndex);
          });
        }

        var _searchable = native.classList.contains('pp-sel-search');
        function _norm(t) {
          return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        function _applySearchFilter(term) {
          var q = _norm(term);
          var visiveis = 0;
          listDiv.querySelectorAll('.pp-sel-opt').forEach(function (item) {
            var ok = !q || _norm(item.textContent).indexOf(q) >= 0;
            item.style.display = ok ? '' : 'none';
            if (ok) visiveis++;
          });
          var empty = listDiv.querySelector('.pp-sel-empty');
          if (empty) empty.style.display = visiveis ? 'none' : 'block';
        }
        function buildList() {
          listDiv.innerHTML = '';
          if (_searchable) {
            var searchWrap = document.createElement('div');
            searchWrap.className = 'pp-sel-search-wrap';
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'pp-sel-search-input';
            input.placeholder = 'Buscar equipe...';
            input.setAttribute('autocomplete', 'off');
            input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
            input.addEventListener('click', function (e) { e.stopPropagation(); });
            input.addEventListener('keydown', function (e) {
              e.stopPropagation();
              if (e.key === 'Escape') { if (input.value) { input.value = ''; _applySearchFilter(''); } else { closeMe(); } }
            });
            input.addEventListener('input', function () { _applySearchFilter(input.value); });
            searchWrap.appendChild(input);
            listDiv.appendChild(searchWrap);
          }
          Array.from(native.options).forEach(function (opt, i) {
            var item = document.createElement('div');
            item.className = 'pp-sel-opt' + (i === native.selectedIndex ? ' is-sel' : '');
            item.setAttribute('role', 'option');
            item.textContent = opt.text;
            item.addEventListener('mousedown', function (e) {
              e.preventDefault();
              native.selectedIndex = i;
              native.dispatchEvent(new Event('change', { bubbles: true }));
              closeAll();
              syncLabel();
            });
            listDiv.appendChild(item);
          });
          if (_searchable) {
            var empty = document.createElement('div');
            empty.className = 'pp-sel-empty';
            empty.textContent = 'Nenhuma equipe encontrada';
            empty.style.display = 'none';
            listDiv.appendChild(empty);
          }
        }

        function openMe() {
          closeAll();
          buildList();
          wrapper.classList.add('is-open');
          box.setAttribute('aria-expanded', 'true');
          var rect = wrapper.getBoundingClientRect();
          if (window.innerHeight - rect.bottom < 240 && rect.top > 240) {
            listDiv.style.top = 'auto';
            listDiv.style.bottom = 'calc(100% + 4px)';
          } else {
            listDiv.style.top = 'calc(100% + 4px)';
            listDiv.style.bottom = 'auto';
          }
          if (_searchable) {
            var _si = listDiv.querySelector('.pp-sel-search-input');
            if (_si) setTimeout(function () { try { _si.focus(); } catch (e) { } }, 0);
          }
        }

        function closeMe() {
          wrapper.classList.remove('is-open');
          box.setAttribute('aria-expanded', 'false');
        }

        box.addEventListener('click', function (e) {
          e.stopPropagation();
          wrapper.classList.contains('is-open') ? closeMe() : openMe();
        });

        listDiv.addEventListener('click', function (e) { e.stopPropagation(); });

        box.addEventListener('keydown', function (e) {
          var idx = native.selectedIndex;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            wrapper.classList.contains('is-open') ? closeMe() : openMe();
          } else if (e.key === 'Escape') {
            closeMe();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (idx < native.options.length - 1) { native.selectedIndex = idx + 1; syncLabel(); }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (idx > 0) { native.selectedIndex = idx - 1; syncLabel(); }
          }
        });

        new MutationObserver(function () {
          if (!wrapper.classList.contains('is-open')) syncLabel();
        }).observe(native, { childList: true, subtree: true });

        native.addEventListener('change', syncLabel);

        syncLabel();
      }

      function closeAll() {
        document.querySelectorAll('.pp-sel.is-open').forEach(function (w) {
          w.classList.remove('is-open');
          var b = w.querySelector('.pp-sel-box');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
      }

      document.addEventListener('click', closeAll);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
      });

      function initAll() {
        document.querySelectorAll(TARGETS).forEach(wrap);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(initAll, 80); });
      } else {
        setTimeout(initAll, 80);
      }

      window.aplReinitSelects = initAll;

      window.aplSyncSelectEl = function (native) {
        if (!native || !native._aplDone) return;
        var wrapper = native.parentNode;
        if (!wrapper || !wrapper.classList.contains('pp-sel')) return;
        var valSpan = wrapper.querySelector('.pp-sel-val');
        if (!valSpan) return;
        var opt = native.options[native.selectedIndex];
        valSpan.textContent = opt ? opt.text : '';
        wrapper.querySelectorAll('.pp-sel-opt').forEach(function (item, i) {
          item.classList.toggle('is-sel', i === native.selectedIndex);
        });
      };

    })();

    (function () {
      window.ppSelectedFinanceMonth = window.ppSelectedFinanceMonth || null;
      window.ppSetSelectedFinanceMonth = function (key) {
        if (!key) { window.ppSelectedFinanceMonth = null; return; }
        var m = String(key).match(/^(\d{4})-(\d{1,2})$/);
        window.ppSelectedFinanceMonth = m ? { ano: Number(m[1]), mes: Number(m[2]) } : null;
      };
      var MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      function pad2(v) { v = String(v); return v.length < 2 ? '0' + v : v; }
      function collectFinanceMonths() {
        var seen = {};
        (typeof PROJECTS !== 'undefined' ? PROJECTS : []).forEach(function (p) {
          try {
            var st = loadStoredProjectState(p.id);
            var movs = st && st.config && st.config.financeiroExecutivo && st.config.financeiroExecutivo.movimentos;
            if (Array.isArray(movs)) movs.forEach(function (m) {
              if (m && m.ano && m.mes) {
                var key = m.ano + '-' + pad2(m.mes);
                seen[key] = { key: key, ano: Number(m.ano), mes: Number(m.mes), label: (MES[m.mes - 1] || m.mes) + ' / ' + m.ano, rank: Number(m.ano) * 12 + Number(m.mes) };
              }
            });
          } catch (e) { }
        });
        return Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return b.rank - a.rank; });
      }
      window.ppCollectFinanceMonths = collectFinanceMonths;

      if (typeof loadStoredProjectState === 'function') {
        var __prevLoadState = loadStoredProjectState;
        var CAMPOS = ['budgetAno', 'forecastAtual', 'projecaoProducao', 'receitaLiquidaAtual', 'custosAtuais', 'custosFechamento', 'receitaBrutaForecast', 'taxaImposto', 'avancoFisicoPlanejado', 'avancoFisicoReal', 'receitaLiquidaProjetada', 'custosProjetados', 'ebitdaForecastMeta', 'projRecLiqEstimativa', 'diasProjecaoFechamento', 'diasProjecaoUsarCalc', 'diasProjecaoMediaDias', 'projCalMetaSabado', 'projCalMetaDomingo', 'wipArranque', 'custosDiferimentos', 'faturamentoProjetado', 'valorFatBi', 'diaLimiteFaturamento', 'observacaoExecutiva', 'checkAtualizado', 'dataHoraAtualizacao', 'wipMensalDesconto', 'wipDescontoAtivo', 'diasUteisForecast', 'comentarioProjRecLiq', 'comentarioCustosProj'];
        var VAZIO_MES = {
          budgetAno: 0, forecastAtual: 0, projecaoProducao: 0, receitaLiquidaAtual: 0,
          custosAtuais: 0, custosFechamento: 0, receitaBrutaForecast: 0, taxaImposto: 0,
          avancoFisicoPlanejado: 0, avancoFisicoReal: 0, receitaLiquidaProjetada: 0,
          custosProjetados: 0, ebitdaForecastMeta: 0, wipArranque: 0,
          projRecLiqEstimativa: null, diasProjecaoFechamento: null, diasProjecaoUsarCalc: false,
          diasProjecaoMediaDias: null, projCalMetaSabado: null, projCalMetaDomingo: null,
          custosDiferimentos: 0, faturamentoProjetado: 0, valorFatBi: 0,
          diaLimiteFaturamento: 0, observacaoExecutiva: '', checkAtualizado: false,
          dataHoraAtualizacao: '',
          wipMensalDesconto: 0, wipDescontoAtivo: true, diasUteisForecast: 0,
          comentarioProjRecLiq: '', comentarioCustosProj: ''
        };
        loadStoredProjectState = function (projectId) {
          var st = __prevLoadState(projectId);
          try {
            var sel = window.ppSelectedFinanceMonth;
            if (window.__ppProjectingFinanceMonth && st && st.config && st.config.financeiroExecutivo) {
              var f = st.config.financeiroExecutivo;
              var movs = Array.isArray(f.movimentos) ? f.movimentos : [];
              var mov = sel ? movs.filter(function (m) { return Number(m.ano) === sel.ano && Number(m.mes) === sel.mes; })[0] : null;
              if (sel || !movs.length) CAMPOS.forEach(function (k) { f[k] = mov && mov[k] !== undefined ? mov[k] : VAZIO_MES[k]; });
              f.__ppFinanceMonthProjected = true;
              f.__ppFinanceMovementFound = !!mov;
              f.__ppFinanceMovementKey = sel ? (sel.ano + '-' + pad2(sel.mes)) : '';
            }
          } catch (e) { }
          return st;
        };
      }

      if (window.ppExecutiveBridge && typeof window.ppExecutiveBridge.getExecutiveDb === 'function') {
        var __prevGetDb = window.ppExecutiveBridge.getExecutiveDb;
        window.ppExecutiveBridge.getExecutiveDb = function () {
          var months = collectFinanceMonths();
          if (!window.ppSelectedFinanceMonth && months.length) {
            window.ppSelectedFinanceMonth = { ano: months[0].ano, mes: months[0].mes };
          }
          window.__ppProjectingFinanceMonth = true;
          var db;
          try { db = __prevGetDb(); } finally { window.__ppProjectingFinanceMonth = false; }
          try {
            db.financeMonths = months;
            db.selectedFinanceMonth = window.ppSelectedFinanceMonth ? (window.ppSelectedFinanceMonth.ano + '-' + pad2(window.ppSelectedFinanceMonth.mes)) : '';
          } catch (e) { }
          try { db.dailyRevenueSeries = buildDailyRevenueSeries(); } catch (e) { db.dailyRevenueSeries = { labels: [], forecast: [], real: [] }; }
          return db;
        };
      }

      function buildDailyRevenueSeries() {
        var sel = window.ppSelectedFinanceMonth;
        var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
        var list = (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
        var byDay = {};
        function taxaDoProjeto(pid) {
          try {
            var st = loadStoredProjectState(pid);
            var f = st && st.config && st.config.financeiroExecutivo;
            var movs = (f && Array.isArray(f.movimentos)) ? f.movimentos : [];
            var mov = sel ? movs.filter(function (m) { return Number(m.ano) === sel.ano && Number(m.mes) === sel.mes; })[0] : null;
            var t = mov && mov.taxaImposto != null ? Number(mov.taxaImposto) : 0;
            return t > 0 ? t : 1;
          } catch (e) { return 1; }
        }
        list.forEach(function (p) {
          var pid = p.id;
          var fator = taxaDoProjeto(pid);
          var raw;
          try { raw = localStorage.getItem(base + '::' + pid); } catch (e) { raw = null; }
          if (!raw) return;
          var bank; try { bank = JSON.parse(raw); } catch (e) { return; }
          if (!bank || typeof bank !== 'object') return;
          Object.keys(bank).forEach(function (dk) {
            var mm = String(dk).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (!mm) return;
            var dd = +mm[1], mo = +mm[2], yy = +mm[3];
            if (sel && (mo !== sel.mes || yy !== sel.ano)) return;
            var day = bank[dk] || {};
            var real = (Number(day.totalProduzidoDia) || 0) * fator;
            var fore = (Number(day.totalMetaDia) || 0) * fator;
            if (!byDay[dk]) byDay[dk] = { real: 0, forecast: 0, time: new Date(yy, mo - 1, dd).getTime() };
            byDay[dk].real += real;
            byDay[dk].forecast += fore;
          });
        });
        var keys = Object.keys(byDay).sort(function (a, b) { return byDay[a].time - byDay[b].time; });
        return {
          labels: keys.map(function (k) { return k.slice(0, 5); }),
          real: keys.map(function (k) { return Math.round(byDay[k].real * 100) / 100; }),
          forecast: keys.map(function (k) { return Math.round(byDay[k].forecast * 100) / 100; })
        };
      }
    })();

    (function () {
      function ppStampMovimentoProjectId() {
        try {
          if (typeof config === 'undefined' || !config || !config.financeiroExecutivo) return false;
          var pid = (typeof currentProjectId !== 'undefined') ? currentProjectId : '';
          if (!pid) return false;
          var movs = config.financeiroExecutivo.movimentos;
          if (!Array.isArray(movs) || !movs.length) return false;
          var changed = false;
          movs.forEach(function (mv) { if (mv && !mv.projectId) { mv.projectId = pid; changed = true; } });
          if (changed) {
            if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true);
            else if (typeof saveLocalSilent === 'function') saveLocalSilent();
            console.log('[Movimentos] projectId carimbado em ' + movs.length + ' movimento(s) do projeto ' + pid);
          }
          return changed;
        } catch (e) { return false; }
      }
      window.ppStampMovimentoProjectId = ppStampMovimentoProjectId;
      setTimeout(ppStampMovimentoProjectId, 2500);
      if (typeof loadProjectState === 'function') {
        var _prevLoadProjectState = loadProjectState;
        loadProjectState = function () {
          var r = _prevLoadProjectState.apply(this, arguments);
          setTimeout(ppStampMovimentoProjectId, 800);
          return r;
        };
      }
    })();
