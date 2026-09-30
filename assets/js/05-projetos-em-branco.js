    (function () {
      var MAIN_ID = "contrato-alfa";
      var RESET_KEY = "pp.reset.projetos.em.branco.v6";
      var MANUAL_SCOPE = "manual-controller-project-v6";
      var BLANK_SCOPE = "blank-controller-project-v6";
      var MAIN_SCOPE = "principal-consolidado-v6";
      var remoteCache = window.__PP_REMOTE_PROJECT_CACHE__ = window.__PP_REMOTE_PROJECT_CACHE__ || {};

      function deepClone(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; } }
      function readRawProject(projectId) {
        var m = remoteCache[projectId];
        return (m && m.config) ? m : null;
      }
      function blankFinance() {
        return {
          _init: true,
          budgetAno: 0,
          forecastAtual: 0,
          projecaoProducao: 0,
          ytd: 0,
          ytg: 0,
          backlog: 0,
          qm: 0,
          custosAtuais: 0,
          custosFechamento: 0,
          avancoFisicoPlanejado: 0,
          avancoFisicoReal: 0,
          checkAtualizado: false,
          dataHoraAtualizacao: "",
          observacaoExecutiva: ""
        };
      }
      function blankProjectState(projectId) {
        var project = projectById(projectId);
        var cfg = normalizeConfigObject(projectConfig(project));
        cfg.diasLancados = 0;
        cfg.dataReferencia = "";
        cfg.financeiroExecutivo = blankFinance();
        return {
          config: cfg,
          equipes: [],
          historico: [],
          teamCards: {},
          teamCardTheme: deepClone(TEAM_CARD_THEME_ORIGINAL),
          lastUpdatedAt: "",
          ppDataScope: BLANK_SCOPE,
          ppManualProject: false
        };
      }
      function hasRecoverableProjectData(raw) {
        if (!raw || typeof raw !== 'object') return false;
        if (Array.isArray(raw.equipes) && raw.equipes.length) return true;
        if (Array.isArray(raw.historico) && raw.historico.length) return true;
        if (raw.teamCards && Object.keys(raw.teamCards).length) return true;
        var cfg = raw.config || {};
        var fin = cfg.financeiroExecutivo || {};
        if (Array.isArray(fin.movimentos) && fin.movimentos.length) return true;
        var financeKeys = ['budgetAno', 'forecastAtual', 'projecaoProducao', 'receitaLiquidaAtual', 'custosAtuais', 'custosFechamento', 'receitaBrutaForecast', 'receitaLiquidaProjetada', 'custosProjetados', 'ebitdaForecastMeta', 'wipArranque', 'custosDiferimentos', 'faturamentoProjetado', 'valorFatBi', 'diaLimiteFaturamento'];
        return financeKeys.some(function (key) { return Number(fin[key]) !== 0 && Number.isFinite(Number(fin[key])); });
      }
      function normalizeBlankAware(projectId, raw) {
        if (projectId !== MAIN_ID) {
          if (!raw || (!raw.ppManualProject && raw.ppDataScope !== MANUAL_SCOPE && raw.ppDataScope !== BLANK_SCOPE && !hasRecoverableProjectData(raw))) {
            return blankProjectState(projectId);
          }
        }
        var base = raw || (projectId === MAIN_ID ? (typeof defaultProjectState === 'function' ? defaultProjectState(projectId) : null) : blankProjectState(projectId));
        var cfg = normalizeConfigObject(base && base.config ? base.config : projectConfig(projectById(projectId)));
        if (projectId !== MAIN_ID && (!base || base.ppDataScope === BLANK_SCOPE)) cfg.financeiroExecutivo = Object.assign(blankFinance(), (cfg.financeiroExecutivo || {}));
        var state = {
          config: cfg,
          equipes: Array.isArray(base && base.equipes) ? deepClone(base.equipes) : [],
          historico: Array.isArray(base && base.historico) ? deepClone(base.historico) : [],
          teamCards: (base && base.teamCards) ? deepClone(base.teamCards) : {},
          teamCardTheme: normalizeTeamCardTheme((base && base.teamCardTheme) || TEAM_CARD_THEME_ORIGINAL),
          lastUpdatedAt: (base && (base.lastUpdatedAt || base.updatedAt)) || "",
          ppDataScope: (base && base.ppDataScope) || (projectId === MAIN_ID ? MAIN_SCOPE : (hasRecoverableProjectData(base) ? MANUAL_SCOPE : BLANK_SCOPE)),
          ppManualProject: projectId !== MAIN_ID && (!!(base && base.ppManualProject) || hasRecoverableProjectData(base))
        };
        if (projectId !== MAIN_ID && state.ppDataScope === BLANK_SCOPE) {
          state.equipes = [];
          state.historico = [];
          state.teamCards = {};
          state.config.financeiroExecutivo = blankFinance();
        }
        return state;
      }

      var previousDefaultProjectState = defaultProjectState;
      defaultProjectState = function (projectId) {
        projectId = projectId || currentProjectId;
        return projectId === MAIN_ID ? previousDefaultProjectState(projectId) : blankProjectState(projectId);
      };

      var previousLoadStoredProjectState = loadStoredProjectState;
      loadStoredProjectState = function (projectId) {
        projectId = projectId || currentProjectId;
        if (projectId === MAIN_ID) return previousLoadStoredProjectState(projectId);
        var raw = remoteCache[projectId] || readRawProject(projectId) || null;
        return normalizeBlankAware(projectId, raw);
      };
      ppReadStoredProjectState = function (projectId) {
        var raw = readRawProject(projectId);
        if (projectId !== MAIN_ID && raw && !raw.ppManualProject && raw.ppDataScope !== BLANK_SCOPE && raw.ppDataScope !== MANUAL_SCOPE) return null;
        return raw;
      };

      var previousCleanStateForSave = ppCleanStateForSave;
      ppCleanStateForSave = function (state) {
        var payload = previousCleanStateForSave(state);
        var pid = (state && state.projectId) || currentProjectId;
        payload.ppDataScope = pid === MAIN_ID ? MAIN_SCOPE : MANUAL_SCOPE;
        payload.ppManualProject = pid !== MAIN_ID;
        if (pid !== MAIN_ID) {
          payload.config = normalizeConfigObject(payload.config || projectConfig(projectById(pid)));
          payload.teamCards = payload.teamCards || {};
          payload.historico = Array.isArray(payload.historico) ? payload.historico : [];
          payload.equipes = Array.isArray(payload.equipes) ? payload.equipes : [];
        }
        return payload;
      };

      function forceBlankOtherProjectsOnce() {
        return;
      }

      function downloadCsvTemplate() {
        var rows = [csvHeaders(), ["NOME-EQUIPE", "0,00", "0,00", "0,00", "0,00", "0,00"]];
        var csv = rows.map(function (row) { return row.map(csvEscape).join(";"); }).join("\r\n");
        var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "modelo-importacao-equipes-pp.csv";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 250);
      }
      window.downloadCsvTemplate = downloadCsvTemplate;

      function ensureEditorQuickCard() {
        var modal = document.getElementById("modalBg");
        if (!modal) return;
        var title = modal.querySelector(".modal-head > div");
        if (title) {
          title.innerHTML = "Editor do Projeto <small>Equipes, metas e produção do mês. Importe a planilha ou edite aqui e clique em Aplicar.</small>";
        }
        var aside = modal.querySelector(".modal-body aside");
        if (!aside || document.getElementById("ppEditorQuickCard")) return;
        var card = document.createElement("div");
        card.className = "editor-card";
        card.id = "ppEditorQuickCard";
        card.innerHTML = '<h3>Atalhos do editor</h3>' +
          '<div class="editor-actions" style="grid-template-columns:1fr 1fr">' +
          '<button class="btn btn-orange" onclick="openEditor()">Editor do Projeto</button>' +
          '<button class="btn btn-white" onclick="downloadCsvTemplate()">Baixar modelo CSV</button>' +
          '<button class="btn btn-navy" onclick="triggerImportCsv()">Importar CSV</button>' +
          '</div>';
        aside.insertBefore(card, aside.firstChild);
        var projectBtn = card.querySelector("button.btn-orange");
        if (projectBtn) projectBtn.textContent = currentProjectId === MAIN_ID ? "Editor do Projeto" : "Editor do Projeto";
      }

      var previousOpenEditor = openEditor;
      openEditor = function () {
        previousOpenEditor();
        ensureEditorQuickCard();
        updateActionLabels();
      };

      function updateActionLabels() {
        try {
          document.querySelectorAll(".actions button").forEach(function (btn) {
            var onclick = btn.getAttribute("onclick") || "";
            if (onclick.indexOf("openEditor") >= 0) btn.textContent = currentProjectId === MAIN_ID ? "Editor do Projeto" : "Editor do Projeto";
          });
          var pill = document.getElementById("currentProjectPill");
          if (pill && !document.body.classList.contains("executive-mode")) pill.textContent = projectById(currentProjectId).nome;
        } catch (e) { }
      }
      var previousRenderAll = renderAll;
      renderAll = function () {
        previousRenderAll();
        updateActionLabels();
      };

      var previousOpenTeamCard = openTeamCard;
      openTeamCard = function () {
        try { applyTeamCardThemePreset('padrao'); } catch (e) { }
        previousOpenTeamCard();
        try {
          var panel = document.querySelector('.tc-color-panel');
          if (panel) panel.style.display = 'none';
          var title = Array.from(document.querySelectorAll('.tc-section-title')).find(function (el) { return /cores do layout/i.test(el.textContent || ''); });
          if (title) title.style.display = 'none';
        } catch (e) { }
      };

      var previousLoginApp = loginApp;
      loginApp = function (event) {
        var ret = previousLoginApp(event);
        updateActionLabels();
        return ret;
      };
      var previousLoadProjectState = loadProjectState;
      loadProjectState = function (projectId) {
        previousLoadProjectState(projectId);
        updateActionLabels();
      };

      function patchEditorImportExportLabels() {
        try {
          document.querySelectorAll('.editor-card h3').forEach(function (h) {
            if (/Importar \/ exportar CSV/i.test(h.textContent || '')) h.textContent = 'CSV rápido do projeto';
          });
          document.querySelectorAll('.editor-actions button').forEach(function (btn) {
            var onclick = btn.getAttribute('onclick') || '';
            if (onclick === 'exportCsv()') btn.textContent = 'Exportar CSV';
            if (onclick === 'triggerImportCsv()') btn.textContent = 'Importar CSV';
          });
        } catch (e) { }
      }
      var previousEditorRows = editorRows;
      editorRows = function () { previousEditorRows(); patchEditorImportExportLabels(); };

      updateActionLabels();
      if (currentProjectId && currentProjectId !== MAIN_ID && !document.body.classList.contains('app-locked')) {
        setState(loadStoredProjectState(currentProjectId));
        renderAll();
      }
      try { ppRefreshExecutiveFrame(); } catch (e) { }
    })();
