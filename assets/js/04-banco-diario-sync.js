    (function () {
      if (window.__ppBankFirestoreSync) return;
      window.__ppBankFirestoreSync = true;

      var BANK_BASE = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
      function bankStorageKey(pid) { return BANK_BASE + '::' + pid; }
      function readBankLocal(pid) {
        try { return JSON.parse(localStorage.getItem(bankStorageKey(pid)) || 'null') || {}; } catch (e) { return {}; }
      }

      function refreshBankSelectors() {
        [250, 700, 1800, 4000].forEach(function (delay) {
          setTimeout(function () {
            try { if (typeof window.ensureTeamPerformanceDaySelector === 'function') window.ensureTeamPerformanceDaySelector(); } catch (e) { }
            try { if (typeof updateDailyBankSelect === 'function') updateDailyBankSelect(); } catch (e) { }
          }, delay);
        });
      }

      if (typeof ppApplyRemoteProject === 'function') {
        var _origApply = ppApplyRemoteProject;
        ppApplyRemoteProject = function (projectId, remote) {
          _origApply(projectId, remote);
          try {
            if (projectId !== currentProjectId) return;
            var vmKey = 'painel-produtividade-view-dia-graficos-v1-projetos::' + projectId;
            var savedMode = null;
            try { savedMode = localStorage.getItem(vmKey); } catch (e) { }
            if (false && !savedMode) {
              var localBank = readBankLocal(projectId);
              var dateKeys = Object.keys(localBank).filter(function (k) {
                return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(k));
              });
              dateKeys.sort(function (a, b) {
                var pa = a.split('/'), pb = b.split('/');
                return new Date(+pb[2], +pb[1] - 1, +pb[0]) - new Date(+pa[2], +pa[1] - 1, +pa[0]);
              });
              if (dateKeys.length > 0) {
                var latestKey = dateKeys[0];
                try { localStorage.setItem(vmKey, latestKey); } catch (e) { }
                setTimeout(function () {
                  try {
                    if (typeof ppSetDashboardViewDay === 'function') ppSetDashboardViewDay(latestKey);
                    else if (typeof renderAll === 'function') renderAll();
                  } catch (e) { }
                  refreshBankSelectors();
                }, 250);
                return;
              }
            }
            refreshBankSelectors();
          } catch (e) { }
        };
      }

    })();
