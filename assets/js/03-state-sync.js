    (function () {
      var COPYRIGHT_TXT = "© 2026 Painel de Produtividade · Todos os direitos reservados.";
      var BROADCAST_KEY = "pp.project.broadcast.final.v4";
      var remoteCache = window.__PP_REMOTE_PROJECT_CACHE__ = window.__PP_REMOTE_PROJECT_CACHE__ || {};

      function safeClone(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; } }
      function hasValue(v) { return Math.abs(Number(v || 0)) > 0.00001; }
      function totalsHasData(t) { return !!(hasValue(t.metaMes) || hasValue(t.metaDia) || hasValue(t.metaAcumulada) || hasValue(t.produzidoDia) || hasValue(t.produzidoAcumulado)); }
      function financeHasData(fin) { return !!(hasValue(fin && fin.budgetAno) || hasValue(fin && fin.forecastAtual) || hasValue(fin && fin.projecaoProducao) || hasValue(fin && fin.receitaLiquidaAtual) || hasValue(fin && fin.custosAtuais) || hasValue(fin && fin.custosFechamento) || hasValue(fin && fin.receitaBrutaForecast) || hasValue(fin && fin.receitaLiquidaProjetada) || hasValue(fin && fin.custosProjetados) || hasValue(fin && fin.ebitdaForecastMeta) || hasValue(fin && fin.wipArranque) || hasValue(fin && fin.custosDiferimentos) || hasValue(fin && fin.faturamentoProjetado) || hasValue(fin && fin.valorFatBi) || hasValue(fin && fin.diaLimiteFaturamento)); }
      function autoProjection(totals, cfg) {
        var produced = n(totals.produzidoAcumulado);
        var business = Math.max(n(cfg && cfg.diasUteisMes), 0);
        var worked = Math.max(n((typeof window.ppDiasDecorridosCorrigidos === 'function' && cfg)
          ? window.ppDiasDecorridosCorrigidos(cfg) : (cfg && cfg.diasLancados)), 0);
        if (!business) return produced;
        var remaining = Math.max(business - worked, 0);
        var avg = worked > 0 ? produced / worked : n(totals.produzidoDia);
        return round2(produced + remaining * Math.max(avg, 0));
      }
      function ensureFinance(projectId, state, forceCheck) {
        state = state || defaultProjectState(projectId);
        state.config = normalizeConfigObject(state.config || projectConfig(projectById(projectId)));
        state.equipes = Array.isArray(state.equipes) ? state.equipes : [];
        state.historico = Array.isArray(state.historico) ? state.historico : [];
        state.teamCards = state.teamCards || {};
        state.teamCardTheme = state.teamCardTheme || TEAM_CARD_THEME_ORIGINAL;
        var totals = calcTotalsFromState(state, projectId);
        var fin = Object.assign({}, state.config.financeiroExecutivo || {});
        fin._init = true;
        var op = totalsHasData(totals);
        var projection = autoProjection(totals, state.config);
        if (op) {
          fin.ytd = n(totals.produzidoAcumulado);
          if (!hasValue(fin.forecastAtual)) fin.forecastAtual = n(totals.metaMes);
          if (!hasValue(fin.budgetAno)) fin.budgetAno = n(fin.forecastAtual) || n(totals.metaMes);
          if (!hasValue(fin.projecaoProducao)) fin.projecaoProducao = projection;
          fin.ytg = Math.max(n(fin.projecaoProducao || projection) - n(totals.produzidoAcumulado), 0);
          fin.backlog = Math.max((n(fin.forecastAtual) || n(totals.metaMes)) - n(totals.produzidoAcumulado), 0);
          if (forceCheck) {
            fin.checkAtualizado = true;
            fin.dataHoraAtualizacao = new Date().toISOString();
          }
        }
        state.config.financeiroExecutivo = fin;
        if (forceCheck || !state.lastUpdatedAt) state.lastUpdatedAt = state.lastUpdatedAt || fin.dataHoraAtualizacao || "";
        return state;
      }
      function normalizeLoadedProjectState(projectId, raw) {
        var base = raw && raw.config ? raw : defaultProjectState(projectId);
        var state = {
          projectId: projectId,
          config: normalizeConfigObject(safeClone(base.config || projectConfig(projectById(projectId)))),
          equipes: safeClone(base.equipes || []),
          historico: safeClone(base.historico || []),
          teamCards: safeClone(base.teamCards || {}),
          teamCardTheme: safeClone(base.teamCardTheme || TEAM_CARD_THEME_ORIGINAL),
          lastUpdatedAt: base.lastUpdatedAt || base.updatedAt || (base.config && base.config.financeiroExecutivo && base.config.financeiroExecutivo.dataHoraAtualizacao) || "",
          ppDataScope: base.ppDataScope || "",
          ppManualProject: !!base.ppManualProject,
          ppSeedRef: base.ppSeedRef || ""
        };
        return ensureFinance(projectId, state, false);
      }
      function readLocalState(projectId) {
        var m = remoteCache[projectId];
        return (m && m.config && Array.isArray(m.equipes)) ? m : null;
      }
      function writeLocalState(projectId, state) {
      }
      function broadcastProject(projectId, state) {
        try { localStorage.setItem(BROADCAST_KEY, JSON.stringify({ projectId: projectId, at: Date.now(), state: state })); } catch (e) { }
      }

      loadStoredProjectState = function (projectId) {
        projectId = projectId || currentProjectId;
        var raw = remoteCache[projectId] || readLocalState(projectId) || defaultProjectState(projectId);
        return normalizeLoadedProjectState(projectId, raw);
      };
      ppCleanStateForSave = function (state) {
        var base = state || { config: config, equipes: equipes, historico: historico, teamCards: teamCards, teamCardTheme: teamCardTheme };
        var projectId = (base && base.projectId) || currentProjectId;
        var clean = normalizeLoadedProjectState(projectId, base);
        try {
          if (typeof projectById === 'function' && typeof projectConfig === 'function') {
            var _ident = projectConfig(projectById(projectId));
            if (_ident && clean.config) {
              clean.config.titulo = _ident.titulo;
              clean.config.clienteContrato = _ident.clienteContrato;
              clean.config.identificacaoContrato = _ident.identificacaoContrato;
            }
          }
        } catch (e) { }
        clean.lastUpdatedAt = new Date().toISOString();
        clean = ensureFinance(projectId, clean, true);
        try {
          if (clean && clean.teamCards && typeof clean.teamCards === "object") {
            clean.teamCards = JSON.parse(JSON.stringify(clean.teamCards));
            Object.keys(clean.teamCards).forEach(function (eq) {
              if (clean.teamCards[eq]) clean.teamCards[eq].fotos = [];
            });
          }
        } catch (e) { }
        return clean;
      };
      ppSaveStateLocal = function (projectId, state) {
        var payload = ppCleanStateForSave(Object.assign({}, state || ppCurrentState(), { projectId: projectId }));
        remoteCache[projectId] = safeClone(payload);
        writeLocalState(projectId, payload);
        broadcastProject(projectId, payload);
        return payload;
      };
      function ppShouldBlockRemoteSave(projectId, payload, prevEquipesCount) {
        try {
          var locked = document.body.classList.contains('app-locked')
            || currentUserRole === 'locked'
            || !currentUserLogin;
          if (locked) return true;
        } catch (e) { }
        return false;
      }
      function ppNuvemJaRespondeu(projectId) {
        try { return !!(window.__PP_NUVEM_RESPONDEU__ || {})[projectId]; }
        catch (e) { return false; }
      }

      function ppPrevEquipes(projectId) {
        try {
          if (remoteCache[projectId] && Array.isArray(remoteCache[projectId].equipes) && remoteCache[projectId].equipes.length) {
            return remoteCache[projectId].equipes;
          }
          var _pl = readLocalState(projectId);
          if (_pl && Array.isArray(_pl.equipes) && _pl.equipes.length) return _pl.equipes;
        } catch (e) { }
        return null;
      }
      function ppPrevMovimentos(projectId) {
        try {
          var fontes = [remoteCache[projectId], readLocalState(projectId)];
          for (var i = 0; i < fontes.length; i++) {
            var st = fontes[i];
            var mv = st && st.config && st.config.financeiroExecutivo && st.config.financeiroExecutivo.movimentos;
            if (Array.isArray(mv) && mv.length) return mv;
          }
        } catch (e) { }
        return null;
      }

      function ppMesclarMovimentos(novos, anteriores, exclusao) {
        var lista = Array.isArray(novos) ? novos.slice() : [];
        if (!Array.isArray(anteriores) || !anteriores.length) return lista;
        var chave = function (m) { return String(Number(m && m.ano)) + '-' + String(Number(m && m.mes)); };
        var presentes = {};
        lista.forEach(function (m) { presentes[chave(m)] = true; });
        var alvoExclusao = exclusao ? (String(Number(exclusao.ano)) + '-' + String(Number(exclusao.mes))) : null;
        anteriores.forEach(function (m) {
          var k = chave(m);
          if (presentes[k]) return;
          if (alvoExclusao && k === alvoExclusao) return;
          lista.push(m);
        });
        return lista;
      }

      function avisarGravacao(ok, motivo) {
        try {
          if (!window.__ppSaveExplicito) return;
          window.__ppSaveExplicito = false;
          if (typeof window.ppAvisoGravacao === 'function') window.ppAvisoGravacao(ok, motivo);
        } catch (e) { }
      }

      ppSaveStateRemote = function (projectId, state, immediate) {
        var _prevRemoteEquipes = (remoteCache[projectId] && Array.isArray(remoteCache[projectId].equipes)) ? remoteCache[projectId].equipes.length : 0;
        var _prevLocalEquipes = 0;
        try { var _pl = readLocalState(projectId); _prevLocalEquipes = (_pl && Array.isArray(_pl.equipes)) ? _pl.equipes.length : 0; } catch (e) { }
        var payload = ppSaveStateLocal(projectId, state);
        ppRefreshExecutiveFrame();
        var doc = ppProjectDoc(projectId);
        if (!doc) {
          avisarGravacao(false, 'a conexao com a nuvem nao esta configurada neste navegador');
          return Promise.resolve(payload);
        }
        if (ppShouldBlockRemoteSave(projectId, payload, _prevRemoteEquipes || _prevLocalEquipes)) {
          console.warn('Painel: gravacao remota bloqueada (estado travado/sem login) para', projectId);
          avisarGravacao(false, 'sua sessao nao esta autenticada. Entre de novo e salve outra vez');
          return Promise.resolve(payload);
        }
        var intentionalClear = !!window.__ppIntentionalClear;
        var payloadVazio = !Array.isArray(payload.equipes) || payload.equipes.length === 0;
        try {
          var _finPay = payload && payload.config && payload.config.financeiroExecutivo;
          if (_finPay) {
            var _prevMovs = ppPrevMovimentos(projectId);
            if (_prevMovs && _prevMovs.length) {
              var _antes = Array.isArray(_finPay.movimentos) ? _finPay.movimentos.length : 0;
              _finPay.movimentos = ppMesclarMovimentos(
                _finPay.movimentos, _prevMovs, window.__ppExclusaoMovimento || null);
              if (_finPay.movimentos.length > _antes) {
                console.warn('Painel: ' + (_finPay.movimentos.length - _antes) +
                  ' movimento(s) preservado(s) no save de ' + projectId +
                  ' (a gravacao nao os trazia).');
              }
            }
          }
        } catch (e) { }

        if (!intentionalClear && payloadVazio) {
          var prevEq = ppPrevEquipes(projectId);
          if (prevEq && prevEq.length) {
            payload.equipes = clone(prevEq);
            console.warn('Painel: equipes preservadas no save (payload vinha vazio) para', projectId);
          } else if (ppNuvemJaRespondeu(projectId)) {
          } else {
            avisarGravacao(false, 'este contrato ainda nao terminou de carregar da nuvem. Espere os numeros aparecerem e salve de novo');
            return Promise.resolve(payload);
          }
        }
        var saveNow = function () {
          return doc.set(Object.assign({}, payload, { projectId: projectId, updatedBy: currentUserLogin || currentUserRole || "html", syncVersion: "2026-06-29-final-v4" }), { merge: true })
            .then(function () {
              try { ppLogEdit(projectId); } catch (e) { }
              avisarGravacao(true, '');
            })
            .catch(function (e) {
              console.warn("Falha ao salvar no Firestore", e);
              avisarGravacao(false, 'a nuvem recusou a gravacao (' + ((e && e.code) || (e && e.message) || 'erro desconhecido') + ')');
            });
        };
        if (immediate) return saveNow().then(function () { return payload; });
        clearTimeout(PP_FIREBASE_STATE.saveTimer);
        PP_FIREBASE_STATE.saveTimer = setTimeout(saveNow, 500);
        return Promise.resolve(payload);
      };
      ppApplyRemoteProject = function (projectId, remote) {
        if (!remote) return;
        var clean = normalizeLoadedProjectState(projectId, remote);
        remoteCache[projectId] = safeClone(clean);
        try {
          var editing = document.getElementById("modalBg") && document.getElementById("modalBg").classList.contains("open");
          var cardOpen = document.getElementById("teamCardPage") && document.getElementById("teamCardPage").classList.contains("open");
          if (projectId === currentProjectId && !editing && !cardOpen && !document.body.classList.contains("app-locked") && !document.body.classList.contains("executive-mode")) {
            setState(clean);
            if (typeof window.ppRenderAllDebounced === 'function') window.ppRenderAllDebounced();
            else renderAll();
          }
        } catch (e) { }
        ppRefreshExecutiveFrame();
      };
      ppSubscribeProject = function (projectId) {
        try { if (!(window.firebase && firebase.auth && firebase.auth().currentUser)) return; } catch (e) { return; }
        var doc = ppProjectDoc(projectId);
        if (!doc) return;
        try { if (typeof ppSubscribeTeamPhotos === "function") ppSubscribeTeamPhotos(projectId); } catch (e) { }
        if (PP_FIREBASE_STATE.unsub.some(function (x) { return x && x.projectId === projectId; })) return;
        var unsub = doc.onSnapshot(function (snap) {
          try { (window.__PP_NUVEM_RESPONDEU__ = window.__PP_NUVEM_RESPONDEU__ || {})[projectId] = true; } catch (e) { }
          if (!snap.exists) return;
          ppApplyRemoteProject(projectId, snap.data());
        }, function (err) {
          var code = (err && err.code) || '';
          try {
            var i = PP_FIREBASE_STATE.unsub.findIndex(function (x) { return x && x.projectId === projectId; });
            if (i >= 0) { try { PP_FIREBASE_STATE.unsub[i](); } catch (e) { } PP_FIREBASE_STATE.unsub.splice(i, 1); }
          } catch (e) { }
          var tentativas = (unsub.__ppRetry = (unsub.__ppRetry || 0) + 1);
          if (code === 'unauthenticated' && tentativas <= 3) {
            setTimeout(function () {
              try {
                var au = window.firebase && firebase.auth && firebase.auth().currentUser;
                if (au) ppSubscribeProject(projectId);
              } catch (e) { }
            }, tentativas * 2000);
          }
        });
        unsub.projectId = projectId;
        PP_FIREBASE_STATE.unsub.push(unsub);
      };
      ppSubscribeAllProjects = function () { PROJECTS.forEach(function (p) { ppSubscribeProject(p.id); }); };
      ppPersistCurrentProject = function (immediate) {
        try { syncCurrentProjectCheckToRegistry(); } catch (e) { }
        return ppSaveStateRemote(currentProjectId, ppCurrentState(), !!immediate);
      };

      function ppBaseCol(name) {
        try {
          if (!ppInitFirebase()) return null;
          return PP_FIREBASE_STATE.db.collection(PP_FIRESTORE_ROOT).doc('base').collection(name);
        } catch (e) { return null; }
      }
      function ppProjectNome(projectId) {
        try { var p = (typeof projectById === 'function') ? projectById(projectId) : null; return (p && p.nome) || projectId; }
        catch (e) { return projectId; }
      }
      var _ppLogLast = {};
      window.ppLogEdit = function (projectId) {
        try {
          if (!currentUserLogin) return;
          var col = ppBaseCol('editLog'); if (!col) return;
          var key = projectId + '::' + currentUserLogin;
          var now = Date.now();
          if (_ppLogLast[key] && (now - _ppLogLast[key]) < 20000) return;
          _ppLogLast[key] = now;
          col.add({
            projectId: projectId,
            projectName: ppProjectNome(projectId),
            user: currentUserLogin,
            role: currentUserRole || '',
            at: new Date().toISOString(),
            atMs: now
          }).catch(function () { });
        } catch (e) { }
      };
      window.adminRenderEditLog = function () {
        var box = document.getElementById('adminEditLogList'); if (!box) return;
        var col = ppBaseCol('editLog');
        if (!col) { box.innerHTML = '<p style="color:#99A1AC;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Firebase indisponível.</p>'; return; }
        box.innerHTML = '<p style="color:#67707C;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Carregando...</p>';
        col.orderBy('atMs', 'desc').limit(200).get().then(function (snap) {
          var rows = [];
          snap.forEach(function (d) {
            var e = d.data() || {};
            var quando = e.at ? (typeof formatDateTimeBR === 'function' ? formatDateTimeBR(e.at) : e.at) : '-';
            rows.push('<tr>'
              + '<td style="padding:6px 8px">' + ppEscHtml(e.projectName || e.projectId || '-') + '</td>'
              + '<td style="padding:6px 8px">' + ppEscHtml(e.user || '-') + '</td>'
              + '<td style="padding:6px 8px;color:#67707C">' + ppEscHtml(e.role || '') + '</td>'
              + '<td style="padding:6px 8px;white-space:nowrap">' + ppEscHtml(quando) + '</td>'
              + '</tr>');
          });
          if (!rows.length) { box.innerHTML = '<p style="color:#99A1AC;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Nenhuma edição registrada ainda.</p>'; return; }
          box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-weight:700">'
            + '<thead><tr style="background:#F2F3F5;color:#3F4752;text-align:left">'
            + '<th style="padding:7px 8px">Projeto</th><th style="padding:7px 8px">Usuário</th><th style="padding:7px 8px">Perfil</th><th style="padding:7px 8px">Data / hora</th>'
            + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
        }).catch(function (e) {
          box.innerHTML = '<p style="color:#D0402B;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Falha ao carregar o log (permissão/rede).</p>';
        });
      };
      function ppEscHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

      var _ppPresenceTimer = null;
      window.ppPresenceBeat = function () {
        try {
          var authU = (window.firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
          if (!authU || !currentUserLogin) return;
          var col = ppBaseCol('presence'); if (!col) return;
          col.doc(authU.uid).set({
            user: currentUserLogin,
            role: currentUserRole || '',
            projectId: currentProjectId || '',
            projectName: currentProjectId ? ppProjectNome(currentProjectId) : '',
            at: new Date().toISOString(),
            atMs: Date.now()
          }, { merge: true }).catch(function () { });
        } catch (e) { }
      };
      window.ppPresenceStart = function () {
        try {
          if (_ppPresenceTimer) return;
          ppPresenceBeat();
          _ppPresenceTimer = setInterval(ppPresenceBeat, 30000);
          window.addEventListener('beforeunload', function () { try { var authU = firebase.auth().currentUser; var col = ppBaseCol('presence'); if (authU && col) col.doc(authU.uid).delete(); } catch (e) { } });
        } catch (e) { }
      };
      var _ppOnlineUnsub = null, _ppOnlineRerender = null;
      window.adminStartOnlineWatch = function () {
        var box = document.getElementById('adminOnlineList');
        var countEl = document.getElementById('adminOnlineCount');
        if (!box) return;
        var col = ppBaseCol('presence');
        if (!col) { box.innerHTML = '<p style="color:#99A1AC;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Firebase indisponível.</p>'; return; }
        function render(docs) {
          var agora = Date.now();
          var vivos = docs.filter(function (d) { return (agora - (d.atMs || 0)) <= 90000; })
            .sort(function (a, b) { return (b.atMs || 0) - (a.atMs || 0); });
          if (countEl) countEl.textContent = vivos.length + (vivos.length === 1 ? ' online' : ' online');
          if (!vivos.length) { box.innerHTML = '<p style="color:#99A1AC;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Ninguém online no momento.</p>'; return; }
          box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-weight:700">'
            + '<thead><tr style="background:#F2F3F5;color:#3F4752;text-align:left"><th style="padding:7px 8px">Usuário</th><th style="padding:7px 8px">Perfil</th><th style="padding:7px 8px">Onde está</th><th style="padding:7px 8px">Visto há</th></tr></thead><tbody>'
            + vivos.map(function (d) {
              var secs = Math.max(0, Math.round((agora - (d.atMs || 0)) / 1000));
              var visto = secs < 60 ? (secs + 's') : (Math.round(secs / 60) + 'min');
              var onde = d.projectName || (d.projectId ? d.projectId : 'Acompanhamento Gerencial / seletor');
              return '<tr><td style="padding:6px 8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1E8A4C;margin-right:6px"></span>' + ppEscHtml(d.user || '-') + '</td>'
                + '<td style="padding:6px 8px;color:#67707C">' + ppEscHtml(d.role || '') + '</td>'
                + '<td style="padding:6px 8px">' + ppEscHtml(onde) + '</td>'
                + '<td style="padding:6px 8px;white-space:nowrap;color:#67707C">' + ppEscHtml(visto) + '</td></tr>';
            }).join('') + '</tbody></table>';
        }
        if (_ppOnlineUnsub) { try { _ppOnlineUnsub(); } catch (e) { } _ppOnlineUnsub = null; }
        if (_ppOnlineRerender) { clearInterval(_ppOnlineRerender); _ppOnlineRerender = null; }
        box.innerHTML = '<p style="color:#67707C;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Carregando...</p>';
        var ultimos = [];
        _ppOnlineUnsub = col.onSnapshot(function (snap) {
          ultimos = []; snap.forEach(function (d) { ultimos.push(d.data() || {}); });
          render(ultimos);
        }, function () { box.innerHTML = '<p style="color:#D0402B;font-size:12px;font-weight:800;text-align:center;padding:16px 0">Falha ao carregar (permissão/rede).</p>'; });
        _ppOnlineRerender = setInterval(function () { if (document.getElementById('adminTabOnline') && document.getElementById('adminTabOnline').style.display !== 'none') render(ultimos); }, 15000);
      };
      window.adminStopOnlineWatch = function () {
        try { if (_ppOnlineUnsub) { _ppOnlineUnsub(); _ppOnlineUnsub = null; } if (_ppOnlineRerender) { clearInterval(_ppOnlineRerender); _ppOnlineRerender = null; } } catch (e) { }
      };

      function bankLatestMonth(projectId) {
        try {
          var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          var raw = localStorage.getItem(base + '::' + projectId);
          if (!raw) return null;
          var bank = JSON.parse(raw);
          if (!bank || typeof bank !== 'object') return null;
          var keys = semDiasFuturos(Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); }));
          if (!keys.length) return null;
          keys.sort(function (a, b) {
            var pa = a.split('/'), pb = b.split('/');
            return new Date(+pa[2], +pa[1] - 1, +pa[0]) - new Date(+pb[2], +pb[1] - 1, +pb[0]);
          });
          var p = keys[keys.length - 1].split('/');
          return { ano: +p[2], mes: +p[1] };
        } catch (e) { return null; }
      }

      function chaveNoFuturo(chave) {
        try {
          var p = String(chave).split("/");
          var d = new Date(+p[2], +p[1] - 1, +p[0]);
          var hoje = new Date();
          hoje.setHours(23, 59, 59, 999);
          return d.getTime() > hoje.getTime();
        } catch (e) { return false; }
      }

      function semDiasFuturos(chaves) {
        try {
          var limpas = chaves.filter(function (k) { return !chaveNoFuturo(k); });
          return limpas.length ? limpas : chaves;
        } catch (e) { return chaves; }
      }

      function bankGrossAccum(projectId) {
        try {
          var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          var raw = localStorage.getItem(base + '::' + projectId);
          if (!raw) return 0;
          var bank = JSON.parse(raw);
          if (!bank || typeof bank !== 'object') return 0;
          var keys = semDiasFuturos(Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); }));
          if (!keys.length) return 0;
          var sel = window.ppSelectedFinanceMonth;
          if (sel) {
            var keysSel = keys.filter(function (k) {
              var p = k.split('/');
              return (+p[1]) === sel.mes && (+p[2]) === sel.ano;
            });
            if (!keysSel.length) return 0;
            keys = keysSel;
          }
          keys.sort(function (a, b) {
            var pa = a.split('/'), pb = b.split('/');
            var da = new Date(+pa[2], +pa[1] - 1, +pa[0]).getTime();
            var db2 = new Date(+pb[2], +pb[1] - 1, +pb[0]).getTime();
            return da - db2;
          });
          var lastDay = bank[keys[keys.length - 1]];
          return n(lastDay && lastDay.totalProduzidoAcumulado) || 0;
        } catch (e) { return 0; }
      }

      function bankDayGross(projectId) {
        try {
          var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          var raw = localStorage.getItem(base + '::' + projectId);
          if (!raw) return 0;
          var bank = JSON.parse(raw);
          if (!bank || typeof bank !== 'object') return 0;
          var keys = semDiasFuturos(Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); }));
          if (!keys.length) return 0;
          var sel = window.ppSelectedFinanceMonth;
          if (sel) {
            keys = keys.filter(function (k) {
              var p = k.split('/');
              return (+p[1]) === sel.mes && (+p[2]) === sel.ano;
            });
            if (!keys.length) return 0;
          }
          keys.sort(function (a, b) {
            var pa = a.split('/'), pb = b.split('/');
            var da = new Date(+pa[2], +pa[1] - 1, +pa[0]).getTime();
            var db2 = new Date(+pb[2], +pb[1] - 1, +pb[0]).getTime();
            return da - db2;
          });
          var lastDay = bank[keys[keys.length - 1]];
          return n(lastDay && lastDay.totalProduzidoDia) || 0;
        } catch (e) { return 0; }
      }

      function bankDayDate(projectId) {
        try {
          var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          var raw = localStorage.getItem(base + '::' + projectId);
          if (!raw) return '';
          var bank = JSON.parse(raw);
          if (!bank || typeof bank !== 'object') return '';
          var keys = semDiasFuturos(Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); }));
          if (!keys.length) return '';
          var sel = window.ppSelectedFinanceMonth;
          if (sel) {
            keys = keys.filter(function (k) {
              var p = k.split('/');
              return (+p[1]) === sel.mes && (+p[2]) === sel.ano;
            });
            if (!keys.length) return '';
          }
          keys.sort(function (a, b) {
            var pa = a.split('/'), pb = b.split('/');
            return new Date(+pa[2], +pa[1] - 1, +pa[0]) - new Date(+pb[2], +pb[1] - 1, +pb[0]);
          });
          return keys[keys.length - 1] || '';
        } catch (e) { return ''; }
      }

      function bankDaysCount(projectId) {
        try {
          var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          var raw = localStorage.getItem(base + '::' + projectId);
          if (!raw) return 0;
          var bank = JSON.parse(raw);
          if (!bank || typeof bank !== 'object') return 0;
          var keys = semDiasFuturos(Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); }));
          var sel = window.ppSelectedFinanceMonth;
          if (sel) {
            keys = keys.filter(function (k) {
              var p = k.split('/');
              return (+p[1]) === sel.mes && (+p[2]) === sel.ano;
            });
          }
          return keys.length;
        } catch (e) { return 0; }
      }
      window.bankDaysCount = bankDaysCount;

      buildExecutiveProject = function (project) {
        var state = loadStoredProjectState(project.id);
        var cfg = normalizeConfigObject(state.config || {});
        var totals = calcTotalsFromState(state, project.id);
        var _projetandoMes = !!window.__ppProjectingFinanceMonth && !!window.ppSelectedFinanceMonth;
        var grossAccum, dailyGross;
        if (_projetandoMes) {
          grossAccum = bankGrossAccum(project.id);
          dailyGross = bankDayGross(project.id);
        } else {
          grossAccum = n(totals.produzidoAcumulado) || bankGrossAccum(project.id);
          dailyGross = n(totals.produzidoDia) || bankDayGross(project.id);
        }
        var prodAcum = _projetandoMes ? grossAccum : n(totals.produzidoAcumulado);
        var prodDia  = _projetandoMes ? dailyGross : n(totals.produzidoDia);
        var dailyDate = bankDayDate(project.id);
        var op = totalsHasData(totals) || grossAccum > 0;
        var fin = Object.assign({}, defaultFinanceForProject(project.id), cfg.financeiroExecutivo || {});
        var _selMes = window.ppSelectedFinanceMonth;
        if (_selMes) {
          var _movs = Array.isArray(fin.movimentos) ? fin.movimentos : [];
          var _movMes = _movs.filter(function (m) {
            return Number(m.ano) === Number(_selMes.ano) && Number(m.mes) === Number(_selMes.mes);
          })[0];
          if (_movMes) {
            var _dinheiroDoMes = [
              'budgetAno', 'forecastAtual', 'projecaoProducao', 'receitaLiquidaAtual',
              'custosAtuais', 'custosFechamento', 'receitaBrutaForecast',
              'receitaLiquidaProjetada', 'custosProjetados', 'custosProjetadosEstim',
              'ebitdaForecastMeta', 'receitaLiquidaEbitdaFC', 'projRecLiqEstimativa',
              'wipArranque', 'custosDiferimentos', 'faturamentoProjetado', 'valorFatBi'
            ];
            var _base = Object.assign({}, fin);
            _dinheiroDoMes.forEach(function (k) {
              if (Object.prototype.hasOwnProperty.call(_movMes, k)) return;
              _base[k] = 0;
            });
            fin = Object.assign(_base, _movMes, { movimentos: _movs, _init: true, __ppFinanceMonthProjected: true });
          } else if (!_movs.length) {
            var _mesProd = bankLatestMonth(project.id);
            var _ehMesProd = _mesProd && Number(_mesProd.ano) === Number(_selMes.ano) && Number(_mesProd.mes) === Number(_selMes.mes);
            if (!_ehMesProd) {
              fin = Object.assign({}, defaultFinanceForProject(project.id), { movimentos: _movs, _init: true, __ppFinanceMonthProjected: true });
            } else {
              fin = Object.assign({}, fin, { _init: true, __ppFinanceMonthProjected: true });
            }
          } else {
            fin = Object.assign({}, defaultFinanceForProject(project.id), { movimentos: _movs, _init: true, __ppFinanceMonthProjected: true });
          }
        }
        var meta = executiveProjectMeta(project.id) || {};
        var financeMonthProjected = !!fin.__ppFinanceMonthProjected;
        var finData = financeHasData(fin);
        if (!op && !finData) return ppZeroExecutiveProject(project);
        var forecast = (fin.forecastAtual != null && fin._init) ? n(fin.forecastAtual) : (n(fin.forecastAtual) || n(totals.metaMes));
        var budget = (fin.budgetAno != null && fin._init) ? n(fin.budgetAno) : (n(fin.budgetAno) || forecast || n(totals.metaMes));
        var projection = financeMonthProjected ? n(fin.projecaoProducao) : (n(fin.projecaoProducao) || autoProjection(totals, cfg) || prodAcum);
        var descontoLiquido = Math.max(0, Math.min(1, n(cfg.descontoLiquido || 0)));
        var receitaLiquidaManual = fin.receitaLiquidaAtual !== undefined && fin.receitaLiquidaAtual !== null && fin.receitaLiquidaAtual !== '';
        var ytd = receitaLiquidaManual
          ? n(fin.receitaLiquidaAtual)
          : prodAcum * (1 - descontoLiquido);
        var ytg = Math.max(projection - ytd, 0);
        var backlog = Math.max(forecast - ytd, 0);
        var currentCostsAbs = Math.abs(n(fin.custosAtuais));
        var closeCostsAbs = financeMonthProjected ? Math.abs(n(fin.custosFechamento)) : Math.abs(n(fin.custosFechamento) || currentCostsAbs);
        var last = financeMonthProjected ? (fin.dataHoraAtualizacao || "") : (state.lastUpdatedAt || fin.dataHoraAtualizacao || "");
        var acumStatus = execStatusFromDiff(prodAcum, n(totals.metaAcumulada));
        var dayStatus = execStatusFromDiff(prodDia, n(totals.metaDia));
        var actualStatus = ytd || currentCostsAbs ? execStatusFromMargin(ytd, currentCostsAbs) : "yellow";
        var closeStatus = projection || closeCostsAbs ? execStatusFromMargin(projection, closeCostsAbs) : "yellow";
        return {
          id: project.id,
          name: meta.name || project.nome,
          short: project.nome,
          region: meta.region || "BR",
          contract: meta.contract || project.nome,
          manager: meta.manager || "Gerência do contrato",
          budgetAno: budget,
          forecast: forecast,
          receitaBrutaForecast: n(fin.receitaBrutaForecast),
          qm: n(fin.qm),
          accumForecast: n(totals.metaAcumulada),
          accumRealGross: grossAccum,
          accumReal: grossAccum * (1 - Math.max(0, Math.min(1, n(cfg.descontoLiquido || 0)))),
          dailyRealBruto: dailyGross,
          dailyRealDate: dailyDate,
          taxaImposto: (n(fin.taxaImposto) > 0 ? n(fin.taxaImposto)
            : (n(cfg.taxaLiquida) > 0 ? n(cfg.taxaLiquida)
              : (1 - Math.max(0, Math.min(1, n(cfg.descontoLiquido || 0)))))),
          dailyForecast: n(totals.metaDia),
          dailyReal: prodDia,
          currentRevenue: ytd,
          currentCosts: -currentCostsAbs,
          closeRevenue: projection,
          closeCosts: -closeCostsAbs,
          physicalPlan: n(fin.avancoFisicoPlanejado),
          physicalReal: n(fin.avancoFisicoReal),
          ytdEbitda: ytd - currentCostsAbs,
          ytg: ytg,
          backlog: backlog,
          checkUpdated: !!(fin.checkAtualizado || last || op),
          movementCheckUpdated: !!fin.checkAtualizado,
          lastUpdatedAt: last,
          lastUpdateLabel: last ? formatDateTimeBR(last) : (op ? "Dados salvos" : "Sem dados"),
          acumStatus: acumStatus,
          dayStatus: dayStatus,
          actualStatus: actualStatus,
          closeStatus: closeStatus,
          risk: !op && !finData ? "Sem dados" : (closeStatus === "red" ? "Crítico" : (acumStatus === "red" ? "Atenção" : "Baixo")),
          note: op ? "Atualizado automaticamente pelo painel operacional salvo." : "Aguardando alimentação do painel operacional.",
          receitaLiquidaProjetada: n(fin.receitaLiquidaProjetada),
          custosProjetados: n(fin.custosProjetados),
          ebitdaForecastMeta: n(fin.ebitdaForecastMeta),
          faturamentoProjetado: n(fin.faturamentoProjetado),
          valorFatBi: n(fin.valorFatBi),
          diaLimiteFaturamento: Math.max(0, Math.min(31, Math.round(n(fin.diaLimiteFaturamento))))
        };
      };
      buildExecutiveDb = function () {
        var _EXECP = (typeof ppAllowedExecProjects === 'function') ? ppAllowedExecProjects() : PROJECTS;
        var projects = _EXECP.map(buildExecutiveProject);
        var activeStates = _EXECP.map(function (p) { return { p: p, s: loadStoredProjectState(p.id) }; });
        var refs = activeStates.map(function (x) { return x.s && x.s.config && x.s.config.dataReferencia; }).filter(Boolean);
        var newestDate = projects.map(function (p) { return p.lastUpdatedAt ? new Date(p.lastUpdatedAt) : null; }).filter(function (d) { return d && !Number.isNaN(d.getTime()); }).sort(function (a, b) { return b - a; })[0];
        var dayBase = activeStates.reduce(function (acc, x) {
          var totals = calcTotalsFromState(x.s, x.p && x.p.id);
          if (totalsHasData(totals) || x.p.id === PP_MAIN_PROJECT_ID) {
            acc.business = Math.max(acc.business, n(x.s.config && x.s.config.diasUteisMes));
            acc.worked = Math.max(acc.worked, n((typeof window.ppDiasDecorridosCorrigidos === 'function' && x.s.config)
              ? window.ppDiasDecorridosCorrigidos(x.s.config) : (x.s.config && x.s.config.diasLancados)));
          }
          return acc;
        }, { business: 0, worked: 0 });
        var business = n(dayBase.business || 21);
        var worked = n(dayBase.worked || 0);
        var remaining = Math.max(business - worked, 0);
        return {
          version: "4.0-online-final",
          company: "Empresa Demonstração",
          dashboardTitle: "ACOMPANHAMENTO GERENCIAL",
          dataReference: newestDate ? formatDateTimeBR(newestDate) : (refs[0] || new Date().toLocaleDateString("pt-BR")),
          period: "Acompanhamento operacional",
          days: { business: business, worked: worked, remaining: remaining },
          targets: { minimumMargin: .08, attentionMargin: .03 },
          projects: projects,
          teamCardsOverview: buildExecutiveTeamCards().filter(function (card) { return projects.some(function (p) { return p.id === card.projectId && (n(p.accumReal) || n(p.dailyReal) || n(p.forecast) || n(p.budgetAno)); }); }),
          ebitdaHistory: { months: [], real: [], target: [] },
          costHistory: { labels: projects.map(function (p) { return p.short; }), budget: projects.map(function (p) { return n(p.budgetAno) * .88; }), real: projects.map(function (p) { return Math.abs(n(p.currentCosts)); }) },
          integration: { source: ppFirebaseConfigured() ? "Firestore em tempo real" : "localStorage neste navegador", description: "Gerencial é somente leitura operacional: produção, acumulado, metas, dias, gráficos e checks vêm dos projetos; edição gerencial limitada a Budget, Forecast, QM e Projeção." }
        };
      };
      window.ppExecutiveBridge = {
        getExecutiveDb: function () { return safeClone(buildExecutiveDb()); },
        updateExecutiveFinance: function (updates) { return ppUpdateExecutiveFinance(updates); },
        onExecutiveRefresh: function (fn) { if (typeof fn === "function") PP_FIREBASE_STATE.refreshCallbacks.push(fn); },
        getAllowedProjectIds: function () { return window.currentUserProjectIds !== undefined ? window.currentUserProjectIds : null; }
      };

      ppUpdateExecutiveFinance = function (updates) {
        var list = Array.isArray(updates) ? updates : [{ projectId: updates.projectId, payload: updates.payload || updates }];
        list.forEach(function (item) {
          var projectId = item.projectId;
          var payload = item.payload || {};
          var state = loadStoredProjectState(projectId);
          state.config = normalizeConfigObject(state.config || projectConfig(projectById(projectId)));
          var fin = Object.assign({}, state.config.financeiroExecutivo || {});
          fin._init = true;
          fin.budgetAno = n(payload.budgetAno);
          fin.forecastAtual = n(payload.forecastAtual);
          fin.qm = n(payload.qm);
          fin.projecaoProducao = n(payload.projecaoProducao);
          var totals = calcTotalsFromState(state, projectId);
          fin.ytd = n(totals.produzidoAcumulado);
          fin.ytg = Math.max(n(fin.projecaoProducao) - n(totals.produzidoAcumulado), 0);
          fin.backlog = Math.max(n(fin.forecastAtual) - n(totals.produzidoAcumulado), 0);
          fin.checkAtualizado = true;
          fin.dataHoraAtualizacao = new Date().toISOString();
          state.config.financeiroExecutivo = fin;
          ppSaveStateRemote(projectId, state, true);
        });
        setTimeout(ppRefreshExecutiveFrame, 100);
      };

      saveLocalSilent = function () { try { ppPersistCurrentProject(false); } catch (e) { writeLocalState(currentProjectId, ppCleanStateForSave(ppCurrentState())); } };
      saveLocal = function () {
        collectEditor();
        if (document.getElementById("teamCardPage") && document.getElementById("teamCardPage").classList.contains("open")) collectTeamCardEditor();
        saveDaySnapshot(false);
        ppPersistCurrentProject(true);
        renderAll();
        editorRows();
        alert(ppFirebaseConfigured() ? "Dados salvos no Acompanhamento Gerencial." : "Dados salvos neste navegador. Para atualizar todos os usuários, preencha o firebase-config.js e publique no Firebase.");
      };
      applyEditor = function (close) {
        if (close === undefined) close = true;
        window.__ppSaveExplicito = true;
        collectEditor();
        if (document.getElementById("teamCardPage") && document.getElementById("teamCardPage").classList.contains("open")) collectTeamCardEditor();
        ppPersistCurrentProject(true);
        renderAll();
        editorRows();
        if (close) closeEditor();
      };
      markProjectUpdatedNow = function () {
        if (document.getElementById("modalBg") && document.getElementById("modalBg").classList.contains("open")) collectEditor();
        config = normalizeConfigObject(config);
        config.financeiroExecutivo = Object.assign({}, config.financeiroExecutivo || {}, { _init: true, checkAtualizado: true, dataHoraAtualizacao: new Date().toISOString() });
        syncCurrentProjectCheckToRegistry();
        setFinanceEditorFields();
        ppPersistCurrentProject(true);
        renderAll();
        alert("Atualização registrada para " + projectById(currentProjectId).nome + ".");
      };

      loadProjectState = function (projectId) {
        currentProjectId = projectId || currentProjectId;
        try { ppSubscribeProject(currentProjectId); } catch (e) { }
        var state = loadStoredProjectState(currentProjectId);
        setState(state);
        try { mergeProjectFinanceDefaults(currentProjectId); } catch (e) { }
      };

      function ensureRights() {
        var r = document.querySelector(".pp-global-rights");
        if (r) r.textContent = COPYRIGHT_TXT;
      }
      function ensureExecutiveRights() {
        try {
          var frame = document.getElementById("executiveFrame");
          var doc = frame && frame.contentDocument;
          if (!doc) return;
          if (!doc.getElementById("execRightsFooter")) {
            var div = doc.createElement("div");
            div.id = "execRightsFooter";
            div.textContent = COPYRIGHT_TXT;
            div.style.cssText = "position:static;text-align:right;color:#67707C;font:800 10px Segoe UI,Arial,sans-serif;pointer-events:none;margin:8px 0 0;";
            doc.body.appendChild(div);
            doc.body.style.paddingBottom = "14px";
          }
        } catch (e) { }
      }
      ppRefreshExecutiveFrame = function () {
        try {
          var frame = document.getElementById("executiveFrame");
          if (frame && frame.contentWindow && frame.contentWindow.refreshDbFromParent) { frame.contentWindow.refreshDbFromParent(); }
          ensureExecutiveRights();
          PP_FIREBASE_STATE.refreshCallbacks.forEach(function (fn) { try { fn(); } catch (e) { } });
        } catch (e) { }
      };
      window.ppShowLoading = function (subtitulo, legenda) {
        var ov = document.getElementById('execLoadingOverlay');
        if (!ov) {
          ov = document.createElement('div');
          ov.id = 'execLoadingOverlay';
          ov.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:#151B26;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;transition:opacity .25s ease;');
          ov.innerHTML =
            '<div class="splash-brand"><span class="sp-ap">Painel</span><span class="sp-plus">de Produtividade</span><span class="sp-qt" id="execLoadingSub"></span></div>' +
            '<div class="splash-dots"><span></span><span></span><span></span></div>' +
            '<div id="execLoadingMsg" style="color:rgba(255,255,255,.7);font:700 12px Segoe UI,Arial,sans-serif;">Carregando dados da nuvem…</div>';
          document.body.appendChild(ov);
        }
        try { var sub = document.getElementById('execLoadingSub'); if (sub) sub.textContent = subtitulo || 'Gerencial'; } catch (e) { }
        try { var msg = document.getElementById('execLoadingMsg'); if (msg) msg.textContent = legenda || 'Carregando dados da nuvem…'; } catch (e) { }
        ov.style.display = 'flex';
        ov.style.opacity = '1';
        ov.style.pointerEvents = 'auto';
        try { document.documentElement.dataset.ppLoadingScrollLock = '1'; document.documentElement.style.overflow = 'hidden'; } catch (e) { }
        try { ov.dataset.shownAt = String(Date.now()); } catch (e) { }
      };
      window.PP_LOADING_MIN_MS = 0;
      window.ppShowExecLoading = function () { window.ppShowLoading('Acompanhamento Gerencial', 'Carregando dados da nuvem…'); };
      window.ppHideExecLoading = function () { window.ppHideLoading(); };
      function ppWaitProjectsLoaded(maxMs) {
        var start = Date.now();
        var list = (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
        function ready() {
          try {
            if (!list.length) return true;
            var docs = window.__PP_NUVEM_RESPONDEU__ || {};
            var hist = window.__PP_HIST_RESPONDEU__ || {};
            return list.every(function (p) { return p && p.id && docs[p.id] && hist[p.id]; });
          } catch (e) { return true; }
        }
        return new Promise(function (resolve) {
          (function tick() {
            if (ready()) { resolve(); return; }
            if ((Date.now() - start) >= maxMs) {
              try {
                var d = window.__PP_NUVEM_RESPONDEU__ || {}, h = window.__PP_HIST_RESPONDEU__ || {};
                var faltam = list.filter(function (p) { return p && p.id && !(d[p.id] && h[p.id]); })
                  .map(function (p) { return p.id; });
                if (faltam.length) console.warn('[Painel] Revelando o gerencial sem resposta da nuvem para: ' + faltam.join(', ') + '. Estes contratos podem aparecer zerados.');
              } catch (e) { }
              resolve(); return;
            }
            setTimeout(tick, 150);
          })();
        });
      }

      openExecutivePanel = function () {
        document.body.classList.add("executive-mode");
        try { window.ppShowExecLoading(); } catch (e) { }
        ppSubscribeAllProjects();
        try { if (window.ppHistorySync && window.ppHistorySync.subscribeAllProjectsHistory) window.ppHistorySync.subscribeAllProjectsHistory(); } catch (e) { }
        var frame = document.getElementById("executiveFrame");
        if (frame) {
          frame.onload = function () { setTimeout(function () { ppRefreshExecutiveFrame(); ensureExecutiveRights(); }, 80); };
          frame.src = "./consolidado.html";
          setTimeout(function () { ppRefreshExecutiveFrame(); ensureExecutiveRights(); }, 280);
        }
        ensureRights();
        ppWaitProjectsLoaded(12000).then(function () {
          try { ppRefreshExecutiveFrame(); } catch (e) { }
          setTimeout(function () {
            try { ppRefreshExecutiveFrame(); } catch (e) { }
            try { window.ppHideExecLoading(); } catch (e) { }
          }, 250);
        });
      };
      reloadExecutivePanel = function () { ppRefreshExecutiveFrame(); setTimeout(ppRefreshExecutiveFrame, 120); };

      loginApp = function (event) {
        if (event) event.preventDefault();
        var targetId = currentLoginTargetId || EXECUTIVE_PANEL.id;
        var error = document.getElementById("loginError");
        if (isExecutiveTarget(targetId)) {
          currentUserLogin = "gerencial";
          currentUserRole = "executivo";
          document.body.classList.remove("app-locked");
          document.body.classList.add("executive-mode");
          openExecutivePanel();
          return false;
        }
        var project = projectById(targetId);
        var user = String(document.getElementById("loginUser") && document.getElementById("loginUser").value || "").trim().toLowerCase();
        var pass = String(document.getElementById("loginPass") && document.getElementById("loginPass").value || "").trim();
        if (!(user === project.login && pass === project.senha)) {
          if (error) error.textContent = "Usuário ou senha inválidos para o projeto selecionado.";
          return false;
        }
        currentUserLogin = user;
        currentUserRole = "controller";
        currentLoginTargetId = project.id;
        document.body.classList.remove("app-locked");
        document.body.classList.remove("executive-mode");
        ppSubscribeProject(project.id);
        loadProjectState(project.id);
        var frame = document.getElementById("executiveFrame"); if (frame) { frame.onload = null; frame.src = "about:blank"; }
        bindEditorRealtime();
        bindTeamCardRealtime();
        renderAll();
        if (error) error.textContent = "";
        var passInput = document.getElementById("loginPass"); if (passInput) passInput.value = "";
        return false;
      };
      ppAutoOpenRoute = function () {
        var target = ppRouteTarget && ppRouteTarget();
        if (!target) return;
        if (isExecutiveTarget(target)) setTimeout(function () { loginApp(); }, 80);
        else {
          document.body.classList.add("app-locked");
          document.body.classList.remove("executive-mode");
        }
      };

      var ppExecutiveStorageDebounceTimer = null;
      window.addEventListener("storage", function (event) {
        if (!event.key) return;
        if (event.key.indexOf(STORAGE_KEY_BASE + "::") === 0 || event.key === BROADCAST_KEY) {
          clearTimeout(ppExecutiveStorageDebounceTimer);
          ppExecutiveStorageDebounceTimer = setTimeout(function () {
            try {
              if (event.key === BROADCAST_KEY && event.newValue) {
                var msg = JSON.parse(event.newValue);
                if (msg && msg.projectId && msg.state && Array.isArray(msg.state.equipes)) remoteCache[msg.projectId] = msg.state;
              }
              if (document.body.classList.contains("executive-mode")) ppRefreshExecutiveFrame();
            } catch (e) {
              console.warn("Atualização executiva ignorada por JSON inválido.", e);
            }
          }, 160);
        }
      });

      ensureRights();
      ppInitFirebase();
      ppSubscribeAllProjects();
      initLoginScreen();
      setTimeout(function () { ensureRights(); }, 120);
    })();
