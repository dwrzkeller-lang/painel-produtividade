    (function () {
      var PATCH_FLAG = '__ppPatch3006Applied';
      if (window[PATCH_FLAG]) return;
      window[PATCH_FLAG] = true;
      function safeN(v) {
        try { if (typeof n === 'function') return n(v); } catch (e) { }
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        var s = String(v ?? '0').replace(/\s/g, '').replace(/R\$/gi, '');
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        var x = Number(s); return Number.isFinite(x) ? x : 0;
      }
      function safeMoney(v) { try { return money(v); } catch (e) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } }
      function safeEsc(v) { try { return escapeHtml(v); } catch (e) { return String(v ?? '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); } }
      function safeAttr(v) { try { return escapeAttr(v); } catch (e) { return safeEsc(v); } }
      function parseDateBR(value) {
        var s = String(value || ''); var m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        if (!m) return null; var y = m[3] ? Number(m[3]) : 2026; if (y < 100) y += 2000; return new Date(y, Number(m[2]) - 1, Number(m[1]));
      }
      function canonDate(value) {
        var d = parseDateBR(value); if (!d) return String(value || 'Atual').trim();
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
      }
      function dateSortValue(value, savedAt) {
        var d = parseDateBR(value); if (d) return d.getTime();
        var t = Date.parse(savedAt || value); return Number.isFinite(t) ? t : 0;
      }
      var WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      function isBusinessDay(d) { var w = d.getDay(); return w !== 0 && w !== 6; }
      function fmtFuture(d) { return WEEK[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
      function businessUntilDate(d) {
        try {
          if (typeof window.ppDiasUteisAte === 'function') {
            var g = window.ppDiasUteisAte(typeof config !== 'undefined' ? config : null, d);
            if (isFinite(g)) return g;
          }
        } catch (e) { }
        var c = 0, x = new Date(d.getFullYear(), d.getMonth(), 1); while (x <= d) { if (isBusinessDay(x)) c++; x.setDate(x.getDate() + 1); } return c;
      }
      function futureBusinessLabelsSafe(count, refValue) {
        count = Math.max(0, Number(count) || 0); var ref = parseDateBR(refValue) || new Date();
        var labels = [], d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1), end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
        while (d <= end && labels.length < count) { if (isBusinessDay(d)) labels.push(fmtFuture(d)); d.setDate(d.getDate() + 1); }
        while (labels.length < count) labels.push('Dia útil ' + (labels.length + 1));
        return labels;
      }

      function hideLegacyYtdFields() { ['edFinYtd', 'edFinYtg', 'edFinBacklog'].forEach(function (id) { var el = document.getElementById(id); var f = el && el.closest('.field'); if (f) f.classList.add('pp-hidden-field'); }); }
      function createField(id, label, placeholder) { var div = document.createElement('div'); div.className = 'field pp-fin-extra'; div.innerHTML = '<label>' + safeEsc(label) + '</label><input id="' + id + '" type="number" step="0.01" placeholder="' + safeAttr(placeholder || '0,00') + '">'; return div; }
      function ensureFinanceWipFields() {
        hideLegacyYtdFields();
        var grid = document.getElementById('edFinProjecao')?.closest('.form-grid'); if (!grid) return;
        if (!document.getElementById('edFinWipArranque')) {
          var ref = document.getElementById('edFinProjecao')?.closest('.field');
          var field = createField('edFinWipArranque', 'WIP de Arranque', 'Ex.: 345122,11');
          if (ref && ref.nextSibling) grid.insertBefore(field, ref.nextSibling); else grid.appendChild(field);
        }
        if (!document.getElementById('edFinCustosDiferimentos')) {
          var ref2 = document.getElementById('edFinCustosFech')?.closest('.field') || document.getElementById('edFinCustos')?.closest('.field');
          var field2 = createField('edFinCustosDiferimentos', 'Custos de Diferimentos', 'Ex.: 100000,00');
          if (ref2 && ref2.nextSibling) grid.insertBefore(field2, ref2.nextSibling); else grid.appendChild(field2);
        }
        var f = (window.config && config.financeiroExecutivo) || {};
        var w = document.getElementById('edFinWipArranque'); if (w && !w.dataset.boundValue) { w.value = inputValue ? inputValue(f.wipArranque || f.wipDeArranque || 0) : (f.wipArranque || 0); w.dataset.boundValue = '1'; }
        var c = document.getElementById('edFinCustosDiferimentos'); if (c && !c.dataset.boundValue) { c.value = inputValue ? inputValue(f.custosDiferimentos || f.custosDeDiferimentos || 0) : (f.custosDiferimentos || 0); c.dataset.boundValue = '1'; }
      }
      function collectWipFinanceFields() {
        try {
          if (!window.config) return;
          config = normalizeConfigObject(config);
          config.financeiroExecutivo = Object.assign({}, config.financeiroExecutivo || {}, { _init: true });
          var w = document.getElementById('edFinWipArranque');
          var c = document.getElementById('edFinCustosDiferimentos');
          if (w) config.financeiroExecutivo.wipArranque = parseMoneyInput ? parseMoneyInput(w.value) : safeN(w.value);
          if (c) config.financeiroExecutivo.custosDiferimentos = parseMoneyInput ? parseMoneyInput(c.value) : safeN(c.value);
        } catch (e) { }
      }
      function patchFinanceEditor() {
        if (typeof setFinanceEditorFields === 'function' && !setFinanceEditorFields.__ppWip) {
          var oldSet = setFinanceEditorFields;
          setFinanceEditorFields = function () { oldSet.apply(this, arguments); ensureFinanceWipFields(); var f = (config && config.financeiroExecutivo) || {}; var w = document.getElementById('edFinWipArranque'); if (w) w.value = inputValue ? inputValue(f.wipArranque || f.wipDeArranque || 0) : (f.wipArranque || 0); var c = document.getElementById('edFinCustosDiferimentos'); if (c) c.value = inputValue ? inputValue(f.custosDiferimentos || f.custosDeDiferimentos || 0) : (f.custosDiferimentos || 0); };
          setFinanceEditorFields.__ppWip = true;
        }
        if (typeof collectFinanceEditor === 'function' && !collectFinanceEditor.__ppWip) {
          var oldCollect = collectFinanceEditor;
          collectFinanceEditor = function () { oldCollect.apply(this, arguments); collectWipFinanceFields(); };
          collectFinanceEditor.__ppWip = true;
        }
      }

      function ensureJsonTools() {
        return;
      }
      function buildProjectJsonPayload() {
        try { if (typeof collectEditor === 'function') collectEditor(); } catch (e) { }
        try { if (document.getElementById('teamCardPage')?.classList.contains('open') && typeof collectTeamCardEditor === 'function') collectTeamCardEditor(); } catch (e) { }
        return { version: '3.0-30-06', projectId: window.currentProjectId || '', exportedAt: new Date().toISOString(), config: config, equipes: equipes, historico: historico, teamCards: teamCards, teamCardTheme: teamCardTheme };
      }
      window.exportJson = function () { ensureJsonTools(); var box = document.getElementById('jsonBox'); if (box) box.value = JSON.stringify(buildProjectJsonPayload(), null, 2); };
      window.downloadProjectJson = function () {
        var payload = buildProjectJsonPayload(); ensureJsonTools(); var box = document.getElementById('jsonBox'); if (box) box.value = JSON.stringify(payload, null, 2);
        var name = 'painel_' + String((window.currentProjectId || 'projeto')).replace(/[^a-z0-9_-]+/gi, '_') + '_backup.json';
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 200);
      };
      window.importJson = function () {
        try {
          ensureJsonTools(); var raw = document.getElementById('jsonBox')?.value || ''; if (!raw.trim()) throw new Error('Cole ou selecione um JSON primeiro.');
          var obj = JSON.parse(raw);
          var cfg = obj.config || (obj.state && obj.state.config); var eq = obj.equipes || (obj.state && obj.state.equipes); var hist = obj.historico || (obj.state && obj.state.historico);
          if (!cfg || !Array.isArray(eq) || !Array.isArray(hist)) throw new Error('Estrutura esperada: config, equipes e historico.');
          config = normalizeConfigObject(cfg); equipes = eq; historico = hist;
          if (obj.teamCards && typeof obj.teamCards === 'object') teamCards = obj.teamCards;
          if (obj.teamCardTheme && typeof obj.teamCardTheme === 'object') teamCardTheme = obj.teamCardTheme;
          collectWipFinanceFields();
          if (typeof saveLocalSilent === 'function') saveLocalSilent();
          if (typeof editorRows === 'function') editorRows();
          if (typeof renderAll === 'function') renderAll();
          alert('JSON importado e aplicado com sucesso.');
        } catch (e) { alert('Erro ao importar JSON: ' + (e.message || e)); }
      };
      window.importProjectJsonFile = function (event) {
        var file = event.target.files && event.target.files[0]; if (!file) return; var reader = new FileReader();
        reader.onload = function () { ensureJsonTools(); var box = document.getElementById('jsonBox'); if (box) box.value = reader.result; importJson(); };
        reader.onerror = function () { alert('Não foi possível ler o arquivo JSON.'); };
        reader.readAsText(file, 'utf-8'); event.target.value = '';
      };

      function patchCardsEvolution() {
        window.getTeamEvolutionSeries = function (d) {
          var equipe = String(d && d.equipe || '').trim();
          var rows = [];
          var _ref = parseDateBR((config && config.dataReferencia) || '') || new Date();
          var _refMes = _ref.getMonth(), _refAno = _ref.getFullYear();
          function _mesmoMes(key) {
            var dt = parseDateBR(key);
            return dt && dt.getMonth() === _refMes && dt.getFullYear() === _refAno;
          }
          try {
            var bank = (typeof getDailyBank === 'function') ? getDailyBank() : {};
            Object.keys(bank || {}).forEach(function (key) {
              if (!_mesmoMes(key)) return;
              var snap = bank[key] || {}; var arr = Array.isArray(snap.equipes) ? snap.equipes : [];
              var item = arr.find(function (e) { return String(e.equipe || '').trim() === equipe; });
              if (item) rows.push({ label: canonDate(key), value: safeN(item.produzidoAcumulado), savedAt: snap.savedAt || '', sort: dateSortValue(key, snap.savedAt) });
            });
          } catch (e) { }
          if (!rows.length) {
            try {
              var totalProjeto = (data().total.produzidoAcumulado || 1), factor = Math.max(0, safeN(d.produzidoAcumulado) / totalProjeto), cumulative = 0;
              (historico || []).forEach(function (h) { cumulative += safeN(h.total) * factor; rows.push({ label: canonDate(h.data), value: Math.min(safeN(d.produzidoAcumulado), Math.max(0, cumulative)), sort: dateSortValue(h.data) }); });
            } catch (e) { }
          }
          var refLabel = canonDate((config && config.dataReferencia) || 'Atual');
          rows.push({ label: refLabel, value: safeN(d && d.produzidoAcumulado), sort: dateSortValue(refLabel), savedAt: new Date().toISOString() });
          var map = {};
          rows.filter(function (r) { return Number.isFinite(r.value); }).sort(function (a, b) { return a.sort - b.sort; }).forEach(function (r) { map[r.label] = r; });
          var out = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.sort - b.sort; });
          if (!out.length) out.push({ label: refLabel, value: safeN(d && d.produzidoAcumulado), sort: Date.now() });
          return out.map(function (r) { return { label: String(r.label).replace('/2026', ''), value: Math.max(0, safeN(r.value)) }; });
        };
        function metaForLabel(label, fallbackIndex, totalActual, dSel) {
          var dt = parseDateBR(label); var metaDia = safeN((dSel || {}).metaDia) || 0;
          if (dt && metaDia) return Math.min(safeN((dSel || {}).metaMes), metaDia * businessUntilDate(dt));
          var d = dSel; var metaAtual = Math.min(safeN(d && d.metaMes), safeN(d && d.metaAcumulada));
          return metaAtual * ((fallbackIndex + 1) / Math.max(totalActual, 1));
        }
        function makeCardChart(canvas, d, theme, operational) {
          if (!canvas) return null; if (!window.Chart) { canvas.outerHTML = '<div class="tc-empty-chart">Gráfico indisponível: verifique a conexão e recarregue o arquivo.</div>'; return null; }
          var series = getTeamEvolutionSeries(d); var labelsReal = series.map(function (s) { return s.label; }); var realData = series.map(function (s) { return Math.max(0, safeN(s.value)); });
          var diasMes = Math.max(1, safeN(config && config.diasUteisMes) || 21); var diasLancados = Math.max(1, Math.min(diasMes, safeN(config && config.diasLancados) || realData.length || 1)); var diasRestantes = Math.max(0, diasMes - diasLancados);
          var future = futureBusinessLabelsSafe(diasRestantes, config && config.dataReferencia); var labels = labelsReal.concat(future); var metaMes = Math.max(0, safeN(d && d.metaMes)); var current = safeN(d && d.produzidoAcumulado); var saldo = Math.max(0, metaMes - current); var req = future.length ? saldo / future.length : 0;
          var realDataset = realData.concat(future.map(function () { return null; })); var recovery = realData.slice(0, -1).map(function () { return null; }).concat([realData[realData.length - 1] ?? current]).concat(future.map(function (_, i) { return Math.min(metaMes, current + req * (i + 1)); }));
          var dSelecionada = (window.selectedTeamData && selectedTeamData()) || null;
          var metaActual = labelsReal.map(function (l, i) { return Math.min(metaMes, metaForLabel(l, i, labelsReal.length, dSelecionada) || (safeN(d.metaAcumulada) * ((i + 1) / Math.max(labelsReal.length, 1)))); });
          var metaFuture = future.map(function (_, i) { return Math.min(metaMes, safeN(d.metaAcumulada) + (metaMes - safeN(d.metaAcumulada)) * ((i + 1) / Math.max(future.length, 1))); }); var meta = metaActual.concat(metaFuture);
          var color = (theme && theme.destaque) || (window.teamCardTheme && teamCardTheme.destaque) || '#1F6FB2'; var vals = realDataset.concat(recovery, meta).filter(function (v) { return v !== null && Number.isFinite(Number(v)); }); var maxY = (Math.max.apply(Math, [metaMes, current].concat(vals)) * 1.15) || 10000;
          return new Chart(canvas, { type: 'line', data: { labels: labels, datasets: [{ label: 'Produzido', data: realDataset, borderColor: color, backgroundColor: color, borderWidth: 3, pointRadius: 2.6, tension: .22, shortLabel: 'produzido' }, { label: 'Necessário até o fim do mês', data: recovery, borderColor: '#1E8A4C', backgroundColor: '#1E8A4C', borderWidth: 2.6, pointRadius: 2.4, borderDash: [7, 5], tension: .18 }, { label: 'Meta', data: meta, borderColor: '#161B24', backgroundColor: '#161B24', borderWidth: 2, pointRadius: 0, borderDash: [5, 5], tension: 0 }] }, options: { responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { top: 18, right: 12, left: 4, bottom: 0 } }, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 14, boxHeight: 3, color: '#3F4752', font: { size: 12, weight: '500' } } }, tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + safeMoney(ctx.raw); } } } }, scales: { x: { grid: { display: false }, ticks: { color: '#67707C', font: { size: 11, weight: '500' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 11 } }, y: { beginAtZero: true, suggestedMax: maxY, grid: { color: '#E9ECF0' }, ticks: { color: '#67707C', font: { size: 11, weight: '500' }, callback: function (v) { return 'R$ ' + Math.round(v / 1000) + ' mil'; } } } } }, plugins: (typeof tcLineLabelPlugin !== 'undefined' ? [tcLineLabelPlugin] : []) });
        }
        window.createTeamCardChart = function (canvas, d, themeOverride) { return makeCardChart(canvas, d, themeOverride || teamCardTheme, false); };
        window.createOperationalTeamChart = function (canvas, d, chartId) { return makeCardChart(canvas, d, teamCardTheme, true); };
      }

      function accumForecastNetDe(recLiqForecast, diasTotal, diasDecorridos) {
        return diasTotal > 0 ? (recLiqForecast / diasTotal) * diasDecorridos : 0;
      }

      function patchBuildExecutiveProjectWip() {
        if (typeof buildExecutiveProject === 'function' && !buildExecutiveProject.__ppWip) {
          var oldBuild = buildExecutiveProject;
          buildExecutiveProject = function (project) {
            var out = oldBuild.apply(this, arguments);
            try {
              var state = loadStoredProjectState(project.id); var fin = (state && state.config && state.config.financeiroExecutivo) || {};
              var wip = safeN(fin.wipArranque ?? fin.wipDeArranque ?? fin.wip ?? 0); var dif = Math.abs(safeN(fin.custosDiferimentos ?? fin.custosDeDiferimentos ?? fin.diferimentos ?? 0));
              out.wipArranque = wip; out.custosDiferimentos = dif; out.parcelaWip = wip - dif;
              out.ebitdaForecast = safeN(out.forecast || fin.forecastAtual) - Math.abs(safeN(out.closeCosts || out.currentCosts));
              out.ebitdaProjetada = out.ebitdaForecast + out.parcelaWip;
              var _cfg = (state && state.config) || {};
              var _totals = (typeof calcTotalsFromState === 'function') ? calcTotalsFromState(state, project && project.id) : {};
              var _diasTotal = safeN(fin.diasUteisForecast) > 0 ? safeN(fin.diasUteisForecast) : safeN(_cfg.diasUteisMes);
              var _diasDecorridos = (typeof window.ppDiasDecorridosCorrigidos === 'function')
                ? safeN(window.ppDiasDecorridosCorrigidos(_cfg))
                : safeN(_cfg.diasLancados);
              if (_diasTotal > 0 && _diasDecorridos > _diasTotal) _diasDecorridos = _diasTotal;
              out.diasUteisTotal = _diasTotal;
              out.diasUteisDecorridos = _diasDecorridos;

              var _recLiqForecast = safeN(out.receitaLiquidaProjetada);
              var _accumCalculado = accumForecastNetDe(_recLiqForecast, _diasTotal, _diasDecorridos);

              var _taxaFator = safeN(fin.taxaImposto) > 0 ? safeN(fin.taxaImposto) : 1;

              out.taxaLiquidaAplicada = _taxaFator;
              out.accumForecastNet = _accumCalculado;
              out.accumForecastNetLinear = _accumCalculado;
              out.accumForecastNetCalculado = _accumCalculado;
              var _brutoAcum = safeN(out.accumRealGross) || safeN(_totals.produzidoAcumulado);
              out.receitaRealBrutaAcum = _brutoAcum;

              var _realNet = _brutoAcum * _taxaFator;
              var _wipAtivo = (fin.wipDescontoAtivo !== false);
              var _wipDiario = Math.abs(safeN(fin.wipMensalDesconto));
              var _wipDesc = (_wipAtivo && _wipDiario > 0) ? _wipDiario * _diasDecorridos : 0;
              out.wipDescontoDia = _wipDesc;
              out.wipDiario = _wipDiario;
              out.realNetAccumAdj = _realNet - _wipDesc;
              out.wipDescontoAtivo = _wipAtivo;

              out.diferencaRealForecast = out.realNetAccumAdj - safeN(out.accumForecastNet);

              var _metaDiaGerencial = _diasTotal > 0
                ? safeN(out.receitaBrutaForecast) / _diasTotal
                : 0;
              try {
                if (typeof window.ppMetaDiaDoEstado === 'function') {
                  var _fds = window.ppMetaDiaDoEstado(state, project && project.id, out.dailyRealDate);
                  if (_fds !== null && _fds !== undefined && isFinite(_fds)) _metaDiaGerencial = _fds;
                }
              } catch (e) { }
              out.metaDiaProdutividade = _metaDiaGerencial;

              out.diasUteisForecast = safeN(fin.diasUteisForecast);
              out.wipMensalDesconto = safeN(fin.wipMensalDesconto);
              out.comentarioProjRecLiq = fin.comentarioProjRecLiq || '';
              out.comentarioCustosProj = fin.comentarioCustosProj || '';
              out.statusLimiteVerde = fin.statusLimiteVerde !== undefined && fin.statusLimiteVerde !== null && fin.statusLimiteVerde !== '' ? safeN(fin.statusLimiteVerde) : 0;
              out.statusLimiteAmarelo = fin.statusLimiteAmarelo !== undefined && fin.statusLimiteAmarelo !== null && fin.statusLimiteAmarelo !== '' ? safeN(fin.statusLimiteAmarelo) : -5;
              out.receitaLiquidaEbitdaForecast = safeN(fin.receitaLiquidaEbitdaFC);
              var _custosProjEbitda = Math.abs(safeN(out.custosProjetados));
              out.ebitdaForecastCalculado = out.receitaLiquidaEbitdaForecast - _custosProjEbitda;
              out.projRecLiqEstimativa = fin.projRecLiqEstimativa !== undefined && fin.projRecLiqEstimativa !== null && fin.projRecLiqEstimativa !== '' ? safeN(fin.projRecLiqEstimativa) : null;
              out.custosProjetadosEstim = (fin.custosProjetadosEstim !== undefined && fin.custosProjetadosEstim !== null && fin.custosProjetadosEstim !== '') ? Math.abs(safeN(fin.custosProjetadosEstim)) : Math.abs(safeN(out.custosProjetados));
            } catch (e) {
              try {
                console.error("[Painel] Falha ao montar os números do gerencial do contrato "
                  + ((project && project.id) || "?") + ". A tela pode estar incompleta.", e);
              } catch (_) { }
              try { if (out && out.accumForecastNet == null) out.accumForecastNet = 0; } catch (_) { }
            }
            return out;
          };
          buildExecutiveProject.__ppWip = true;
        }
        if (typeof ppUpdateExecutiveFinance === 'function' && !ppUpdateExecutiveFinance.__ppWip) {
          var oldUpdate = ppUpdateExecutiveFinance;
          ppUpdateExecutiveFinance = function (updates) {
            var list = Array.isArray(updates) ? updates : [{ projectId: updates.projectId, payload: updates.payload || updates }];
            var result = oldUpdate.apply(this, arguments);
            try {
              list.forEach(function (item) {
                var projectId = item.projectId, payload = item.payload || {}; var state = loadStoredProjectState(projectId); state.config = normalizeConfigObject(state.config || projectConfig(projectById(projectId))); var fin = Object.assign({}, state.config.financeiroExecutivo || {}); fin._init = true;
                if (payload.wipArranque !== undefined) fin.wipArranque = safeN(payload.wipArranque);
                if (payload.custosDiferimentos !== undefined) fin.custosDiferimentos = Math.abs(safeN(payload.custosDiferimentos));
                state.config.financeiroExecutivo = fin; ppSaveStateRemote(projectId, state, true);
              });
              if (window.ppExecutiveBridge) window.ppExecutiveBridge.updateExecutiveFinance = ppUpdateExecutiveFinance;
              setTimeout(function () { try { ppRefreshExecutiveFrame(); } catch (e) { } }, 180);
            } catch (e) { }
            return result;
          };
          ppUpdateExecutiveFinance.__ppWip = true;
          if (window.ppExecutiveBridge) window.ppExecutiveBridge.updateExecutiveFinance = ppUpdateExecutiveFinance;
        }
      }

      function patchNoPasswordLogin() {
        try { (PROJECTS || []).forEach(function (p) { p.senha = ''; }); } catch (e) { }
      }

      function bootPatch() {
        patchFinanceEditor(); ensureFinanceWipFields(); ensureJsonTools(); patchCardsEvolution(); patchBuildExecutiveProjectWip(); patchNoPasswordLogin();
      }
      if (typeof editorRows === 'function' && !editorRows.__ppJsonWip) { var oldRows = editorRows; editorRows = function () { oldRows.apply(this, arguments); ensureFinanceWipFields(); ensureJsonTools(); }; editorRows.__ppJsonWip = true; }
      if (typeof openEditor === 'function' && !openEditor.__ppJsonWip) { var oldOpen = openEditor; openEditor = function () { oldOpen.apply(this, arguments); ensureFinanceWipFields(); ensureJsonTools(); }; openEditor.__ppJsonWip = true; }
      if (typeof collectEditor === 'function' && !collectEditor.__ppWipCollect) { var oldCE = collectEditor; collectEditor = function () { oldCE.apply(this, arguments); collectWipFinanceFields(); }; collectEditor.__ppWipCollect = true; }
      if (typeof saveLocal === 'function' && !saveLocal.__ppWipCollect) { var oldSL = saveLocal; saveLocal = function () { collectWipFinanceFields(); return oldSL.apply(this, arguments); }; saveLocal.__ppWipCollect = true; }
      if (typeof saveLocalSilent === 'function' && !saveLocalSilent.__ppWipCollect) { var oldSLS = saveLocalSilent; saveLocalSilent = function () { collectWipFinanceFields(); return oldSLS.apply(this, arguments); }; saveLocalSilent.__ppWipCollect = true; }
      bootPatch(); setTimeout(bootPatch, 250); setTimeout(bootPatch, 1000);
    })();
