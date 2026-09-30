    (function () {
      function toN(v) { try { return (typeof n === 'function') ? n(v) : Number(v || 0); } catch (e) { var x = Number(v || 0); return Number.isFinite(x) ? x : 0; } }
      function r2(v) { v = toN(v); return Math.round((v + Number.EPSILON) * 100) / 100; }
      function c(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; } }
      function html(v) { try { return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); } catch (e) { return String(v ?? ''); } }
      function moneyFmt(v) { try { return (typeof money === 'function') ? money(v) : Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } catch (e) { return 'R$ ' + r2(v); } }
      function getProject() { try { return projectById(currentProjectId); } catch (e) { return { id: currentProjectId || 'projeto', nome: currentProjectId || 'Projeto' }; } }
      function stateKey(projectId) { return STORAGE_KEY_BASE + '::' + projectId; }
      function bankKey(projectId) { return DAILY_BANK_KEY_BASE + '::' + projectId; }
      function safeFilename(s) { return String(s || 'projeto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'projeto'; }
      function todayBR() { return new Date().toLocaleDateString('pt-BR'); }
      function currentDayKey() { try { return (typeof dailyKey === 'function' ? dailyKey() : '') || (config && config.dataReferencia) || todayBR(); } catch (e) { return todayBR(); } }
      function normalizeDateForFile(s) { return String(s || '').replace(/\D+/g, '-').replace(/^-+|-+$/g, '') || new Date().toISOString().slice(0, 10); }
      function readJsonKey(k, fallback) { try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } }
      function writeJsonKey(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
      function getStateFromGlobals() {
        return {
          config: (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(c(config || {})) : c(config || {}),
          equipes: Array.isArray(equipes) ? c(equipes) : [],
          historico: Array.isArray(historico) ? c(historico) : [],
          teamCards: c(teamCards || {}),
          teamCardTheme: c(teamCardTheme || {}),
          lastUpdatedAt: new Date().toISOString(),
          projectId: currentProjectId
        };
      }
      function calcTotals(state) {
        if (typeof calcTotalsFromState === 'function') return calcTotalsFromState(state);
        var rows = Array.isArray(state && state.equipes) ? state.equipes : [];
        return rows.reduce(function (acc, d) {
          acc.metaMes += toN(d.metaMes); acc.metaDia += toN(d.metaDia); acc.metaAcumulada += toN(d.metaAcumulada); acc.produzidoDia += toN(d.produzidoDia); acc.produzidoAcumulado += toN(d.produzidoAcumulado); return acc;
        }, { metaMes: 0, metaDia: 0, metaAcumulada: 0, produzidoDia: 0, produzidoAcumulado: 0 });
      }
      function projectIdFromPayload(payload) {
        var pid = payload && (payload.projectId || payload.projetoId || (payload.state && payload.state.projectId));
        if (pid && typeof projectById === 'function') {
          try { var p = projectById(pid); if (p && p.id === pid) return pid; } catch (e) { }
        }
        var name = String((payload && (payload.projectName || payload.projeto || payload.nomeProjeto)) || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (name && typeof PROJECTS !== 'undefined') {
          var found = PROJECTS.find(function (p) { return String(p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === name || String(p.id || '').toLowerCase() === name; });
          if (found) return found.id;
        }
        return pid || '';
      }
      function normalizeImportedState(projectId, payload) {
        var source = (payload && (payload.state || payload.dados || payload.projectState)) || payload || {};
        var base = (typeof defaultProjectState === 'function') ? defaultProjectState(projectId) : { config: {}, equipes: [], historico: [], teamCards: {}, teamCardTheme: {} };
        var state = {
          config: (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(c(source.config || base.config || {})) : c(source.config || base.config || {}),
          equipes: Array.isArray(source.equipes) ? c(source.equipes) : [],
          historico: Array.isArray(source.historico) ? c(source.historico) : [],
          teamCards: c(source.teamCards || {}),
          teamCardTheme: c(source.teamCardTheme || base.teamCardTheme || {}),
          lastUpdatedAt: payload.exportedAt || source.lastUpdatedAt || new Date().toISOString(),
          ppDataScope: source.ppDataScope || 'manual-project-import',
          ppManualProject: projectId !== 'contrato-alfa'
        };
        state.config.financeiroExecutivo = Object.assign({}, (state.config.financeiroExecutivo || {}));
        state.config.financeiroExecutivo._init = true;
        state.config.financeiroExecutivo.checkAtualizado = true;
        state.config.financeiroExecutivo.dataHoraAtualizacao = payload.exportedAt || state.lastUpdatedAt || new Date().toISOString();
        state.projectId = projectId;
        return state;
      }
      function writeImportedDailyBank(projectId, payload, state) {
        try {
          var key = payload.dataFechamento || payload.dataReferencia || (state.config && state.config.dataReferencia) || todayBR();
          var bank = readJsonKey(bankKey(projectId), {});
          var totals = calcTotals(state);
          bank[key] = Object.assign({}, payload.dailySnapshot || {}, {
            importedAt: new Date().toISOString(),
            savedAt: payload.exportedAt || new Date().toISOString(),
            title: (state.config && state.config.titulo) || '',
            projectId: projectId,
            totalProduzidoDia: totals.produzidoDia,
            totalProduzidoAcumulado: totals.produzidoAcumulado,
            totalMetaDia: totals.metaDia,
            totalMetaAcumulada: totals.metaAcumulada,
            config: c(state.config),
            equipes: c(state.equipes),
            historico: c(state.historico),
            teamCards: c(state.teamCards),
            teamCardTheme: c(state.teamCardTheme)
          });
          writeJsonKey(bankKey(projectId), bank);
        } catch (e) { console.warn('Banco diário importado não foi gravado.', e); }
      }
      function updateCheckRegistry(projectId, state) {
        try {
          if (typeof readProjectCheckRegistry === 'function' && typeof writeProjectCheckRegistry === 'function') {
            var reg = readProjectCheckRegistry();
            reg[projectId] = { checked: true, updatedAt: (state.config && state.config.financeiroExecutivo && state.config.financeiroExecutivo.dataHoraAtualizacao) || new Date().toISOString(), projectId: projectId };
            writeProjectCheckRegistry(reg);
          }
        } catch (e) { }
      }
      function saveImportedState(projectId, state) {
        updateCheckRegistry(projectId, state);
        try {
          if (typeof ppSaveStateRemote === 'function') ppSaveStateRemote(projectId, state, true);
          else writeJsonKey(stateKey(projectId), state);
        } catch (e) { writeJsonKey(stateKey(projectId), state); }
        try { if (typeof ppRefreshExecutiveFrame === 'function') ppRefreshExecutiveFrame(); } catch (e) { }
      }
      function downloadText(filename, content, type) {
        var blob = new Blob([content], { type: type || 'application/json;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) { } }, 200);
      }
      function buildSummary(state) {
        var totals = calcTotals(state);
        var desvioDia = toN(totals.produzidoDia) - toN(totals.metaDia);
        var desvioAcum = toN(totals.produzidoAcumulado) - toN(totals.metaAcumulada);
        var metaMes = toN(totals.metaMes);
        var status = desvioAcum >= 0 ? 'FAVORÁVEL' : 'DESFAVORÁVEL';
        return {
          data: (state.config && state.config.dataReferencia) || currentDayKey(),
          qtdEquipes: Array.isArray(state.equipes) ? state.equipes.length : 0,
          metaDia: r2(totals.metaDia), produzidoDia: r2(totals.produzidoDia), desvioDia: r2(desvioDia), desvioDiaPct: totals.metaDia ? r2((desvioDia / totals.metaDia) * 100) : 0,
          metaAcumulada: r2(totals.metaAcumulada), produzidoAcumulado: r2(totals.produzidoAcumulado), desvioAcumulado: r2(desvioAcum), desvioAcumuladoPct: totals.metaAcumulada ? r2((desvioAcum / totals.metaAcumulada) * 100) : 0,
          metaMes: r2(metaMes), realizadoMetaMesPct: metaMes ? r2((totals.produzidoAcumulado / metaMes) * 100) : 0,
          status: status
        };
      }
      window.ppBuildConsolidadoDiarioProjeto = function () {
        try { if (document.getElementById('modalBg') && document.getElementById('modalBg').classList.contains('open') && typeof collectEditor === 'function') collectEditor(); } catch (e) { }
        try { if (typeof collectWipFinanceFields === 'function') collectWipFinanceFields(); } catch (e) { }
        var p = getProject();
        var dataInput = document.getElementById('ppConsolidadoData');
        if (dataInput && dataInput.value) {
          try { config.dataReferencia = dataInput.value.trim(); } catch (e) { }
        }
        var state = getStateFromGlobals();
        var now = new Date().toISOString();
        state.lastUpdatedAt = now;
        state.config.financeiroExecutivo = Object.assign({}, state.config.financeiroExecutivo || {}, { _init: true, checkAtualizado: true, dataHoraAtualizacao: now });
        state.ppDataScope = currentProjectId === 'contrato-alfa' ? 'principal-atual' : 'manual-project-import';
        state.ppManualProject = currentProjectId !== 'contrato-alfa';
        var summary = buildSummary(state);
        var totals = calcTotals(state);
        var dailySnap = {
          savedAt: now,
          title: state.config.titulo || '',
          totalProduzidoDia: totals.produzidoDia,
          totalProduzidoAcumulado: totals.produzidoAcumulado,
          totalMetaDia: totals.metaDia,
          totalMetaAcumulada: totals.metaAcumulada,
          config: c(state.config), equipes: c(state.equipes), historico: c(state.historico), teamCards: c(state.teamCards), teamCardTheme: c(state.teamCardTheme)
        };
        return {
          tipo: 'pp-consolidado-diario-projeto',
          version: '2026-06-29-consolidado-diario-v1',
          exportedAt: now,
          projectId: currentProjectId,
          projectName: (p && p.nome) || currentProjectId,
          dataFechamento: summary.data || currentDayKey(),
          resumoDiario: summary,
          financeiro: c(state.config.financeiroExecutivo || {}),
          totais: totals,
          dailySnapshot: dailySnap,
          state: state
        };
      };
      window.ppExportConsolidadoDiarioProjeto = function () {
        try {
          var payload = window.ppBuildConsolidadoDiarioProjeto();
          var projectId = payload.projectId;
          var state = payload.state;
          writeImportedDailyBank(projectId, payload, state);
          saveImportedState(projectId, state);
          if (projectId === currentProjectId) {
            try { setState(state); renderAll(); if (typeof editorRows === 'function') editorRows(); } catch (e) { }
          }
          var file = 'FECHAMENTO_DIARIO_' + safeFilename(payload.projectName || projectId) + '_' + normalizeDateForFile(payload.dataFechamento) + '.json';
          downloadText(file, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
          alert('Arquivo de fechamento diário gerado para ' + (payload.projectName || projectId) + '. Envie esse único JSON para a consolidação gerencial.');
        } catch (e) { console.error(e); alert('Não foi possível gerar o fechamento diário do projeto.'); }
      };
      window.ppImportConsolidadoDiarioProjetoText = function (text) {
        try {
          var payload = JSON.parse(text);
          var pid = projectIdFromPayload(payload);
          if (!pid || (typeof PROJECTS !== 'undefined' && !PROJECTS.some(function (p) { return p.id === pid; }))) { alert('Arquivo sem projeto válido. Exporte novamente pelo botão Fechamento diário do projeto.'); return; }
          if (payload.tipo && payload.tipo !== 'pp-consolidado-diario-projeto' && !payload.state) { alert('Este JSON não parece ser o fechamento diário de um projeto.'); return; }
          var state = normalizeImportedState(pid, payload);
          writeImportedDailyBank(pid, payload, state);
          saveImportedState(pid, state);
          if (pid === currentProjectId) {
            setState(state);
            try { renderAll(); if (typeof editorRows === 'function') editorRows(); if (typeof updateDailyBankSelect === 'function') updateDailyBankSelect(payload.dataFechamento || null); } catch (e) { }
          }
          var p = (typeof projectById === 'function') ? projectById(pid) : { nome: pid };
          alert('Fechamento importado para ' + ((p && p.nome) || pid) + '. Ao abrir/atualizar o Acompanhamento Gerencial, este projeto será considerado na consolidação final.');
        } catch (e) { console.error(e); alert('Não foi possível importar o arquivo. Verifique se o JSON é o fechamento diário do projeto.'); }
      };
      window.ppImportConsolidadoDiarioProjetoFile = function (event) {
        var file = event && event.target && event.target.files && event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () { window.ppImportConsolidadoDiarioProjetoText(reader.result); };
        reader.onerror = function () { alert('Não foi possível ler o arquivo.'); };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
      };
      window.ppAtualizarConsolidadoGerencial = function () {
        try { if (typeof ppRefreshExecutiveFrame === 'function') ppRefreshExecutiveFrame(); } catch (e) { }
        try { if (typeof reloadExecutivePanel === 'function' && document.body.classList.contains('executive-mode')) reloadExecutivePanel(); } catch (e) { }
        alert('Acompanhamento Gerencial atualizado com os arquivos/projetos disponíveis neste navegador.');
      };
      function syncConsolidadoCard() {
        var dataInput = document.getElementById('ppConsolidadoData');
        if (dataInput && !dataInput.value) dataInput.value = (config && config.dataReferencia) || currentDayKey();
        var projInput = document.getElementById('ppConsolidadoProjeto');
        if (projInput) { var p = getProject(); projInput.value = (p && p.nome) || currentProjectId; }
        var info = document.getElementById('ppConsolidadoInfo');
        if (info) {
          try { var summary = buildSummary(getStateFromGlobals()); info.innerHTML = '<b>Resumo do arquivo:</b> ' + html(summary.data) + ' · Prod. dia ' + html(moneyFmt(summary.produzidoDia)) + ' · Acum. ' + html(moneyFmt(summary.produzidoAcumulado)) + ' · Desvio acum. ' + html(moneyFmt(summary.desvioAcumulado)) + ' (' + html(String(summary.desvioAcumuladoPct).replace('.', ',')) + '%)'; } catch (e) { }
        }
      }
      function ensureConsolidadoDiarioEditorCard() {
        return;
      }
      function wirePatch() { ensureConsolidadoDiarioEditorCard(); }
      if (typeof editorRows === 'function' && !editorRows.__ppConsolidadoDiario) {
        var oldRows = editorRows;
        editorRows = function () { oldRows.apply(this, arguments); ensureConsolidadoDiarioEditorCard(); };
        editorRows.__ppConsolidadoDiario = true;
      }
      if (typeof openEditor === 'function' && !openEditor.__ppConsolidadoDiario) {
        var oldOpen = openEditor;
        openEditor = function () { oldOpen.apply(this, arguments); ensureConsolidadoDiarioEditorCard(); syncConsolidadoCard(); };
        openEditor.__ppConsolidadoDiario = true;
      }
      if (typeof collectEditor === 'function' && !collectEditor.__ppConsolidadoDiario) {
        var oldCollect = collectEditor;
        collectEditor = function () { oldCollect.apply(this, arguments); var inp = document.getElementById('ppConsolidadoData'); if (inp && inp.value) config.dataReferencia = inp.value.trim(); syncConsolidadoCard(); };
        collectEditor.__ppConsolidadoDiario = true;
      }
      setTimeout(wirePatch, 250);
      setTimeout(wirePatch, 1000);
    })();
