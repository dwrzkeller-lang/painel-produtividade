    (function () {
      if (window.__ppHistoryFirestore) return;
      window.__ppHistoryFirestore = true;

      var ROOT = 'painel_produtividade';
      var DB_KEY_BASE = 'painel-produtividade-banco-diario-editavel-v3-projetos';
      var LED_KEY_BASE = 'painel-produtividade-csv-producao-ledger-v1-projetos';

      var _unsub = {};
      var _initialHistoryHydrated = {};

      function pad2(n) { return n < 10 ? '0' + n : String(n); }

      function getDb() {
        try {
          return (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length)
            ? firebase.firestore() : null;
        } catch (e) { return null; }
      }

      function isAuthed() {
        try { return !!(firebase && firebase.auth && firebase.auth().currentUser); }
        catch (e) { return false; }
      }

      function podeGravar() {
        try {
          if (!isAuthed()) return false;
          if (typeof window.ppIsReadOnlyRole === 'function' && window.ppIsReadOnlyRole()) return false;
          return true;
        } catch (e) { return false; }
      }

      function safeClone(v) {
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
      }

      function readLocal(key, fallback) {
        try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
        catch (e) { return fallback; }
      }

      function currentPid() {
        try { return (typeof currentProjectId !== 'undefined' && currentProjectId) || ''; }
        catch (e) { return ''; }
      }

      function updatedBy() {
        try {
          return (typeof currentUserLogin !== 'undefined' && currentUserLogin) ||
            (typeof currentUserRole !== 'undefined' && currentUserRole) || 'app';
        } catch (e) { return 'app'; }
      }

      function bankLocalKey(p) {
        return (typeof DAILY_BANK_KEY_BASE !== 'undefined' ? DAILY_BANK_KEY_BASE : DB_KEY_BASE) + '::' + p;
      }

      function ledgerLocalKey(p) {
        return LED_KEY_BASE + '::' + p;
      }

      function toMonth(s) {
        s = String(s || '').trim();
        var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) return m[3] + '-' + m[2];
        m = s.match(/^(\d{4}-\d{2})/);
        if (m) return m[1];
        return '';
      }

      function enxugarDia(dateKey, dia) {
        if (!dia || typeof dia !== 'object') return dia;
        var d = safeClone(dia);
        delete d.teamCards;
        delete d.teamCardTheme;
        if (d.config && typeof d.config === 'object' && d.config.comentariosEquipe &&
            typeof d.config.comentariosEquipe === 'object') {
          var doDia = d.config.comentariosEquipe[dateKey];
          d.config.comentariosEquipe = {};
          if (doDia) d.config.comentariosEquipe[dateKey] = doDia;
        }
        return d;
      }
      function enxugarBanco(bank) {
        var out = {};
        Object.keys(bank || {}).forEach(function (dateKey) { out[dateKey] = enxugarDia(dateKey, bank[dateKey]); });
        return out;
      }
      window.ppEnxugarDiaDoBanco = enxugarDia;

      window.ppMesclarComentarios = function (vivos, doRetrato) {
        var out = (vivos && typeof vivos === 'object') ? safeClone(vivos) : {};
        if (doRetrato && typeof doRetrato === 'object') {
          Object.keys(doRetrato).forEach(function (dia) {
            var eqs = doRetrato[dia];
            if (!eqs || typeof eqs !== 'object') return;
            if (!out[dia] || typeof out[dia] !== 'object') out[dia] = {};
            Object.keys(eqs).forEach(function (eq) {
              if (!Object.prototype.hasOwnProperty.call(out[dia], eq)) out[dia][eq] = safeClone(eqs[eq]);
            });
          });
        }
        return out;
      };

      function avisarFalhaNaNuvem() {
        try { if (typeof window.ppAvisoGravacao === 'function') window.ppAvisoGravacao(false, 'producao diaria'); } catch (e) { }
      }
      function tamanhoEmBytes(obj) {
        var s = JSON.stringify(obj);
        try { return new Blob([s]).size; } catch (e) { return s.length * 2; }
      }
      var LIMITE_MES_BYTES = 1000000;

      function histRef(pid, month) {
        var db = getDb();
        if (!db || !pid || !month) return null;
        return db.collection(ROOT).doc('base')
          .collection('projects').doc(pid)
          .collection('history').doc(month);
      }

      function impRef(pid, month) {
        var db = getDb();
        if (!db || !pid || !month) return null;
        return db.collection(ROOT).doc('base')
          .collection('projects').doc(pid)
          .collection('imports').doc(month);
      }

      function saveBankToFirestore(pid, bank, touchedMonths) {
        if (!pid || !bank || typeof bank !== 'object') return;
        if (!getDb()) return;
        var alheios = Object.keys(bank).filter(function (dateKey) {
          var dia = bank[dateKey];
          var origem = dia && dia.projectId;
          return origem && origem !== pid;
        });
        if (alheios.length) {
          console.warn('[Painel · histórico] Gravação BLOQUEADA em "' + pid + '": ' +
            alheios.length + ' dia(s) pertencem a outro projeto (' +
            (bank[alheios[0]] || {}).projectId + '). Nada foi gravado.');
          return;
        }
        if (!podeGravar()) return;

        var byMonth = {};
        Object.keys(bank).forEach(function (dateKey) {
          var m = toMonth(dateKey);
          if (!m) return;
          if (!byMonth[m]) byMonth[m] = {};
          var dia = enxugarDia(dateKey, bank[dateKey]);
          if (dia && typeof dia === 'object') {
            delete dia.teamCards;
            delete dia.teamCardTheme;
            dia.projectId = pid;
          }
          byMonth[m][dateKey] = dia;
        });

        var months = {};
        if (Array.isArray(touchedMonths)) {
          touchedMonths.forEach(function (month) { if (month) months[month] = true; });
        } else {
          Object.keys(byMonth).forEach(function (month) { months[month] = true; });
        }

        Object.keys(months).forEach(function (month) {
          var ref = histRef(pid, month);
          if (!ref) return;
          var docMes = {
            projectId: pid, month: month,
            days: byMonth[month] || {},
            updatedAt: new Date().toISOString(), updatedBy: updatedBy()
          };
          var tamanho = tamanhoEmBytes(docMes);
          if (tamanho > LIMITE_MES_BYTES) {
            console.error('[Painel · histórico] O mes ' + month + ' de "' + pid + '" ficou com ' +
              Math.round(tamanho / 1024) + ' KB, acima do limite do Firebase (1 MB). Nada foi gravado para este mes.');
            avisarFalhaNaNuvem();
            return;
          }
          ref.set(docMes, { merge: false }).catch(function (e) {
            console.error('[Painel · histórico] A nuvem recusou a producao de ' + month + ' em "' + pid + '":', e);
            avisarFalhaNaNuvem();
          });
        });
      }

      function saveLedgerToFirestore(pid) {
        if (!pid || !getDb()) return;
        if (!podeGravar()) return;
        var ledger = readLocal(ledgerLocalKey(pid), null);
        if (!ledger || !Array.isArray(ledger.imports) || !ledger.imports.length) return;

        var byMonth = {};
        ledger.imports.forEach(function (entry) {
          var m = toMonth(String(entry.importedAt || '').slice(0, 10));
          if (!m) return;
          if (!byMonth[m]) byMonth[m] = [];
          byMonth[m].push(entry);
        });

        Object.keys(byMonth).forEach(function (month) {
          var ref = impRef(pid, month);
          if (!ref) return;
          ref.set({
            projectId: pid, month: month,
            imports: byMonth[month],
            updatedAt: new Date().toISOString(), updatedBy: updatedBy()
          }, { merge: true }).catch(function (e) {
            console.warn('[Painel · histórico] Erro ao gravar ledger:', e);
          });
        });
      }

      function applyRemoteDays(pid, month, days, remoteUpdatedAt) {
        if (!pid || !month || !days || typeof days !== 'object') return;
        try {
          var key = bankLocalKey(pid);
          var bank = readLocal(key, {});
          var localLatest = '';
          Object.keys(bank).forEach(function (dateKey) {
            if (toMonth(dateKey) !== month) return;
            var savedAt = String((bank[dateKey] && bank[dateKey].savedAt) || '');
            if (savedAt > localLatest) localLatest = savedAt;
          });
          if (remoteUpdatedAt && localLatest && localLatest > String(remoteUpdatedAt)) return;
          Object.keys(bank).forEach(function (dateKey) {
            if (toMonth(dateKey) === month) delete bank[dateKey];
          });
          Object.keys(days).forEach(function (dateKey) {
            bank[dateKey] = safeClone(days[dateKey]);
          });
          localStorage.setItem(key, JSON.stringify(enxugarBanco(bank)));
          try { if (typeof updateDailyBankSelect === 'function') updateDailyBankSelect(); } catch (e) { }
          try { if (typeof window.ensureTeamPerformanceDaySelector === 'function') window.ensureTeamPerformanceDaySelector(); } catch (e) { }
          try { if (typeof ppRefreshProductionPeriodEditor === 'function') ppRefreshProductionPeriodEditor(); } catch (e) { }
          try { if (typeof ppRefreshExecutiveFrame === 'function') ppRefreshExecutiveFrame(); } catch (e) { }
        } catch (e) {
          console.warn('[Painel · histórico] Erro ao mesclar histórico remoto:', e);
        }
      }

      function subscribeProjectHistory(pid) {
        if (!pid) return;
        var key = pid + '::*';
        if (_unsub[key] || !isAuthed()) return;
        var db = getDb();
        if (!db) return;
        try {
          var ref = db.collection(ROOT).doc('base')
            .collection('projects').doc(pid).collection('history');
          _unsub[key] = ref.onSnapshot(function (query) {
            try { (window.__PP_HIST_RESPONDEU__ = window.__PP_HIST_RESPONDEU__ || {})[pid] = true; } catch (e) { }
            query.docChanges().forEach(function (change) {
              var month = change.doc.id;
              if (change.type === 'removed') applyRemoteDays(pid, month, {}, new Date().toISOString());
              else {
                var payload = change.doc.data() || {};
                applyRemoteDays(pid, month, payload.days || {}, payload.updatedAt || '');
              }
            });
            if (!_initialHistoryHydrated[pid] && pid === currentPid()) {
              _initialHistoryHydrated[pid] = true;
              setTimeout(function () {
                try {
                  if (pid !== currentPid()) return;
                  if (typeof window.ppReconcilePerformanceDailyBank === 'function') window.ppReconcilePerformanceDailyBank();
                  try { if (typeof window.ensureTeamPerformanceDaySelector === 'function') window.ensureTeamPerformanceDaySelector(); } catch (e) { }
                } catch (e) { console.warn('[Painel · histórico] Falha ao reconciliar legado:', e); }
              }, 0);
            }
          }, function (err) {
            delete _unsub[key];
            var code = (err && err.code) || '';
            var r = (subscribeProjectHistory.__retry = subscribeProjectHistory.__retry || {});
            r[pid] = (r[pid] || 0) + 1;
            if (code === 'unauthenticated' && r[pid] <= 3) {
              setTimeout(function () {
                try { if (isAuthed()) subscribeProjectHistory(pid); } catch (e) { }
              }, r[pid] * 2000);
            }
          });
        } catch (e) {
          console.warn('[Painel · histórico] Erro ao assinar histórico:', e);
        }
      }

      var _origSetDailyBank = typeof setDailyBank === 'function' ? setDailyBank : null;
      window.setDailyBank = function (bank) {
        var pid = currentPid();
        var before = readLocal(bankLocalKey(pid), {});
        var candidates = {};
        Object.keys(before || {}).forEach(function (dateKey) { var m = toMonth(dateKey); if (m) candidates[m] = true; });
        Object.keys(bank || {}).forEach(function (dateKey) { var m = toMonth(dateKey); if (m) candidates[m] = true; });
        function monthSlice(source, month) {
          var slice = {};
          Object.keys(source || {}).sort().forEach(function (dateKey) {
            if (toMonth(dateKey) === month) slice[dateKey] = source[dateKey];
          });
          return slice;
        }
        var touched = Object.keys(candidates).filter(function (month) {
          return JSON.stringify(monthSlice(before, month)) !== JSON.stringify(monthSlice(bank, month));
        });
        var enxuto = enxugarBanco(bank);
        var cloudOk = false;
        try { saveBankToFirestore(pid, enxuto, touched); cloudOk = true; } catch (e) { console.warn('[Painel] Falha ao gravar banco na nuvem:', e); }
        try {
          if (_origSetDailyBank) _origSetDailyBank(enxuto);
        } catch (e) {
          if (ppPruneLocalStorage(pid)) {
            try { if (_origSetDailyBank) _origSetDailyBank(enxuto); }
            catch (e2) { console.warn('[Painel] localStorage cheio; usando somente a nuvem.', e2); }
          }
        }
      };
      function ppPruneLocalStorage(currentPidKeep) {
        var freed = false;
        try {
          var toRemove = [];
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!k) continue;
            if (/backup|broadcast|ledger|imports?-local|::draft|snapshot-cache/i.test(k)) toRemove.push(k);
          }
          toRemove.forEach(function (k) { try { localStorage.removeItem(k); freed = true; } catch (e) { } });
        } catch (e) { }
        return freed;
      }
      window.ppPruneLocalStorage = ppPruneLocalStorage;

      var _origImportCsv = window.importCsvText;
      window.importCsvText = function () {
        var result = _origImportCsv ? _origImportCsv.apply(this, arguments) : undefined;
        try {
          var pid = currentPid();
          if (pid) {
            setTimeout(function () {
              try { saveLedgerToFirestore(pid); } catch (e) { }
            }, 500);
          }
        } catch (e) { }
        return result;
      };
      window.importProductionCsvText = window.importCsvText;

      var _origLoadProject = typeof loadProjectState === 'function' ? loadProjectState : null;
      window.loadProjectState = function (projectId) {
        if (_origLoadProject) _origLoadProject.apply(this, arguments);
        var pid = projectId || currentPid();
        if (isAuthed()) {
          try { subscribeProjectHistory(pid); } catch (e) { }
        }
      };

      var _autoSubPid = null;
      setInterval(function () {
        if (!podeGravar()) return;
        var pid = currentPid();
        if (!pid || pid === _autoSubPid) return;
        _autoSubPid = pid;
        try { subscribeProjectHistory(pid); } catch (e) { }
      }, 2000);

      function subscribeAllProjectsHistory() {
        if (!isAuthed()) return;
        var list = (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
        list.forEach(function (p) {
          if (!p || !p.id) return;
          try { subscribeProjectHistory(p.id); } catch (e) { }
        });
      }

      (function armAllHistorySubscription() {
        var tries = 0;
        var timer = setInterval(function () {
          tries++;
          if (isAuthed()) { subscribeAllProjectsHistory(); }
          if (tries >= 20) clearInterval(timer);
        }, 1500);
      })();

      window.ppHistorySync = {
        subscribeProjectHistory: subscribeProjectHistory,
        subscribeAllProjectsHistory: subscribeAllProjectsHistory,
        saveBankToFirestore: saveBankToFirestore
      };

    })();
