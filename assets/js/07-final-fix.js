    (function () {
      var MAIN_ID = "contrato-alfa";
      var BLANK_RESET_KEY = "pp.reset.outros.projetos.blank.v20260629.final";
      var COPYRIGHT_TXT = "© 2026 Painel de Produtividade · Todos os direitos reservados.";

      function cloneSafe(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; } }
      function stateKey(pid) { return STORAGE_KEY_BASE + "::" + pid; }
      function parseDateBR(s) {
        s = String(s || "").trim();
        var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
        if (!m) return null;
        var d = Number(m[1]), mo = Number(m[2]), y = Number(m[3] || "2026");
        if (y < 100) y += 2000;
        var dt = new Date(y, mo - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
      function blankFinanceFinal() {
        return { _init: true, budgetAno: 0, forecastAtual: 0, projecaoProducao: 0, ytd: 0, ytg: 0, backlog: 0, qm: 0, custosAtuais: 0, custosFechamento: 0, avancoFisicoPlanejado: 0, avancoFisicoReal: 0, checkAtualizado: false, dataHoraAtualizacao: "", observacaoExecutiva: "" };
      }
      function forceBlankOtherProjectsOnce() {
        return;
      }

      function ensureFooterFinal() {
        try {
          document.querySelectorAll(".pp-global-rights,.login-rights").forEach(function (el) { el.style.display = "none"; });
          var footer = document.getElementById("ppFinalFooter");
          if (!footer) {
            footer = document.createElement("div");
            footer.id = "ppFinalFooter";
            footer.className = "pp-final-footer";
            footer.textContent = COPYRIGHT_TXT;
            document.body.appendChild(footer);
          }
          var shellButtons = document.querySelectorAll(".exec-shell-actions button");
          shellButtons.forEach(function (btn) { if (/Trocar acesso/i.test(btn.textContent || "")) btn.textContent = "Início"; });
        } catch (e) { }
      }

      function patchExecutiveFrame() {
        try {
          var frame = document.getElementById("executiveFrame");
          var doc = frame && frame.contentDocument;
          if (!doc) return;
          var fixed = doc.getElementById("execRightsFooter");
          if (fixed) fixed.remove();
          doc.querySelectorAll("div").forEach(function (div) {
            var txt = (div.textContent || "").trim();
            var st = String(div.getAttribute("style") || "");
            if (txt.indexOf("© 2026 Painel de Produtividade") >= 0 && /position\s*:\s*fixed/i.test(st)) div.remove();
          });
          doc.body.style.paddingBottom = "";
          var excelBtn = Array.from(doc.querySelectorAll("button")).find(function (b) { return /Excel/i.test(b.textContent || "") || /exportExcel/i.test(b.getAttribute("onclick") || ""); });
          if (excelBtn) {
            excelBtn.textContent = "Início";
            excelBtn.className = excelBtn.className || "btn btn-orange";
            excelBtn.onclick = function () { parent.logoutApp(); };
            excelBtn.removeAttribute("onclick");
          }
          var footer = doc.querySelector(".footer-note");
          if (footer) {
            footer.textContent = COPYRIGHT_TXT;
            footer.style.position = "static";
            footer.style.display = "block";
            footer.style.textAlign = "right";
            footer.style.margin = "8px 0 0";
          }
        } catch (e) { }
      }

      var oldEnsureExecutiveRights = typeof ensureExecutiveRights === "function" ? ensureExecutiveRights : null;
      window.ensureExecutiveRights = function () { patchExecutiveFrame(); };
      if (typeof ppRefreshExecutiveFrame === "function") {
        var oldRefreshFinal = ppRefreshExecutiveFrame;
        ppRefreshExecutiveFrame = function () {
          try { oldRefreshFinal(); } catch (e) { }
          setTimeout(patchExecutiveFrame, 80);
          setTimeout(patchExecutiveFrame, 240);
          ensureFooterFinal();
        };
      }
      if (typeof openExecutivePanel === "function") {
        var oldOpenExecFinal = openExecutivePanel;
        openExecutivePanel = function () {
          oldOpenExecFinal();
          ensureFooterFinal();
          setTimeout(patchExecutiveFrame, 150);
          setTimeout(patchExecutiveFrame, 420);
        };
      }
      if (typeof reloadExecutivePanel === "function") {
        var oldReloadExecFinal = reloadExecutivePanel;
        reloadExecutivePanel = function () {
          oldReloadExecFinal();
          setTimeout(patchExecutiveFrame, 150);
          setTimeout(patchExecutiveFrame, 420);
        };
      }

      var routeMapFinal = {
        "inicio": null,
        "home": null,
        "login": null,
        "gerencial": EXECUTIVE_PANEL.id,
        "ceo": EXECUTIVE_PANEL.id,
        "executivo": EXECUTIVE_PANEL.id,
        "acompanhamento-gerencial-consolidado": EXECUTIVE_PANEL.id,
        "alfa": "contrato-alfa",
        "contrato-alfa": "contrato-alfa",
        "beta": "contrato-beta",
        "contrato-beta": "contrato-beta",
        "gama": "contrato-gama",
        "contrato-gama": "contrato-gama",
        "delta": "contrato-delta",
        "contrato-delta": "contrato-delta"
      };
      ppRouteTarget = function () {
        try {
          var qs = new URLSearchParams(location.search);
          var raw = qs.get("painel") || qs.get("projeto") || qs.get("page") || qs.get("p") || "";
          if (!raw && location.hash) raw = location.hash.replace(/^#/, "");
          if (!raw) raw = String(location.pathname.split("/").pop() || "").replace(/\.html$/, "");
          raw = String(raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
          return Object.prototype.hasOwnProperty.call(routeMapFinal, raw) ? routeMapFinal[raw] : null;
        } catch (e) { return null; }
      };
      window.PP_URLS = {
        inicio: "?painel=inicio",
        gerencial: "?painel=gerencial",
        alfa: "?painel=contrato-alfa",
        beta: "?painel=contrato-beta",
        gama: "?painel=contrato-gama",
        delta: "?painel=contrato-delta"
      };

      function buildStateNow() {
        return { config: normalizeConfigObject(config), equipes: cloneSafe(equipes || []), historico: cloneSafe(historico || []), teamCards: cloneSafe(teamCards || {}), teamCardTheme: cloneSafe(teamCardTheme || TEAM_CARD_THEME_ORIGINAL) };
      }
      function persistAuto(immediate) {
        try {
          if (document.getElementById("modalBg") && document.getElementById("modalBg").classList.contains("open")) collectEditor();
          if (document.getElementById("teamCardPage") && document.getElementById("teamCardPage").classList.contains("open")) collectTeamCardEditor();
          if (typeof syncCurrentProjectCheckToRegistry === "function") syncCurrentProjectCheckToRegistry();
          if (typeof saveDaySnapshot === "function") saveDaySnapshot(false);
          if (typeof ppSaveStateRemote === "function") ppSaveStateRemote(currentProjectId, buildStateNow(), !!immediate);
          else localStorage.setItem(stateKey(currentProjectId), JSON.stringify(buildStateNow()));
          try { localStorage.setItem("pp.project.broadcast.final.v4", JSON.stringify({ projectId: currentProjectId, at: Date.now(), state: buildStateNow() })); } catch (e) { }
          try { ppRefreshExecutiveFrame(); } catch (e) { }
        } catch (e) { console.warn("Auto salvamento ignorado.", e); }
      }
      var oldSaveSilentFinal = typeof saveLocalSilent === "function" ? saveLocalSilent : null;
      saveLocalSilent = function () {
        try { if (oldSaveSilentFinal) oldSaveSilentFinal(); } catch (e) { }
        persistAuto(false);
      };
      var oldSaveLocalFinal = typeof saveLocal === "function" ? saveLocal : null;
      saveLocal = function () {
        try {
          collectEditor();
          if (document.getElementById("teamCardPage") && document.getElementById("teamCardPage").classList.contains("open")) collectTeamCardEditor();
          persistAuto(true);
          renderAll();
          if (document.getElementById("modalBg") && document.getElementById("modalBg").classList.contains("open")) editorRows();
          alert("Dados salvos automaticamente no projeto e no Acompanhamento Gerencial.");
        } catch (e) { if (oldSaveLocalFinal) oldSaveLocalFinal(); }
      };
      function wrapAndPersist(fnName, immediate) {
        var old = window[fnName];
        if (typeof old !== "function") return;
        window[fnName] = function () {
          var out = old.apply(this, arguments);
          setTimeout(function () { persistAuto(!!immediate); }, 40);
          return out;
        };
      }
      ["applyEditor"].forEach(function (name) { wrapAndPersist(name, true); });

      function ensureProductionCsvButtons() {
        try {
          var modal = document.getElementById("modalBg");
          if (!modal) return;
          if (!document.getElementById("productionCsvFile")) {
            var input = document.createElement("input");
            input.type = "file";
            input.id = "productionCsvFile";
            input.accept = ".csv,text/csv";
            input.style.display = "none";
            input.setAttribute("onchange", "importProductionCsvFile(event)");
            modal.appendChild(input);
          }
          var cards = Array.from(modal.querySelectorAll(".editor-card"));
          var csvCard = cards.find(function (c) { return /CSV/i.test((c.querySelector("h3") || {}).textContent || ""); });
          if (csvCard && !document.getElementById("productionCsvButtons")) {
            var div = document.createElement("div");
            div.id = "productionCsvButtons";
            div.className = "editor-actions";
            div.style.marginTop = "8px";
            div.innerHTML = '<button class="btn btn-white" onclick="downloadProductionCsvTemplate()">Modelo CSV Produção</button><button class="btn btn-navy" onclick="triggerImportProductionCsv()">Importar Produção CSV</button>';
            csvCard.appendChild(div);
          }
        } catch (e) { }
      }
      var oldOpenEditorFinal = typeof openEditor === "function" ? openEditor : null;
      openEditor = function () {
        if (oldOpenEditorFinal) oldOpenEditorFinal();
        ensureProductionCsvButtons();
        ensureFooterFinal();
      };
      var oldEditorRowsFinal = typeof editorRows === "function" ? editorRows : null;
      editorRows = function () {
        if (oldEditorRowsFinal) oldEditorRowsFinal();
        ensureProductionCsvButtons();
      };

      function updateStartButtons() {
        try {
          document.querySelectorAll(".exec-shell-actions button,.top-actions button").forEach(function (btn) {
            if (/Excel/i.test(btn.textContent || "") || /exportExcel/i.test(btn.getAttribute("onclick") || "")) {
              btn.textContent = "Início";
              btn.onclick = function () { parent && parent.logoutApp ? parent.logoutApp() : logoutApp(); };
              btn.removeAttribute("onclick");
            }
            if (/Trocar acesso/i.test(btn.textContent || "")) btn.textContent = "Início";
          });
        } catch (e) { }
      }

      ensureFooterFinal();
      updateStartButtons();
      setInterval(function () {
        if (document.body.classList.contains('app-locked')) return;
        ensureFooterFinal(); patchExecutiveFrame(); updateStartButtons();
      }, 6000);
      setTimeout(function () {
        try {
          if (currentProjectId === MAIN_ID && !document.body.classList.contains("app-locked")) { setState(loadStoredProjectState(MAIN_ID)); renderAll(); }
          initLoginScreen();
          ensureFooterFinal();
          patchExecutiveFrame();
          if (typeof ppRefreshExecutiveFrame === "function") ppRefreshExecutiveFrame();
        } catch (e) { }
      }, 180);
    })();
