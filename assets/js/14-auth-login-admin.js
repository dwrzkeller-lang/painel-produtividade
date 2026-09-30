    (function () {
      'use strict';

      var USERS_COLLECTION = 'users';
      var ROLES_EXEC = ['admin', 'ceo', 'diretor', 'gerente'];
      var _currentFbUser = null;
      var _currentUserData = null;

      function db() { return window.firebase && firebase.firestore ? firebase.firestore() : null; }
      function auth() { return window.firebase && firebase.auth ? firebase.auth() : null; }
      function isExecRole(r) { return ROLES_EXEC.indexOf(r) >= 0; }
      function el(id) { return document.getElementById(id); }

      var PP_READONLY_ROLES = ['ceo', 'diretor', 'gerente'];
      window.ppIsReadOnlyRole = function () {
        try {
          if (window.currentUserSomenteLeitura === true) return true;
          var r = window.currentUserRole || '';
          return PP_READONLY_ROLES.indexOf(r) >= 0;
        } catch (e) { return false; }
      };
      window.ppBlockIfReadOnly = function () {
        return window.ppIsReadOnlyRole();
      };
      function ppGuardEditFn(name) {
        var orig = window[name];
        if (typeof orig !== 'function' || orig.__ppGuarded) return;
        var wrapped = function () {
          if (window.ppIsReadOnlyRole()) { return window.ppBlockIfReadOnly(); }
          return orig.apply(this, arguments);
        };
        wrapped.__ppGuarded = true;
        window[name] = wrapped;
      }
      window.ppApplyRoleUI = function (role) {
        role = role || window.currentUserRole || '';
        var readonly = (PP_READONLY_ROLES.indexOf(role) >= 0) || (window.currentUserSomenteLeitura === true);
        try { document.body.classList.toggle('pp-readonly', readonly); } catch (e) { }
        if (readonly && !document.getElementById('ppReadonlyStyles')) {
          var st = document.createElement('style');
          st.id = 'ppReadonlyStyles';
          st.textContent =
            'body.pp-readonly [data-edit-action],' +
            'body.pp-readonly .pp-edit-only{display:none !important}';
          document.head.appendChild(st);
        }
        ['openEditor', 'openFinanceEditor', 'saveLocal', 'saveLocalSilent',
          'applyEditor', 'addTeam', 'addHistoryFromFields', 'addHistory',
          'financeEditorAddMovimento', 'saveFinanceEditor', 'financeEditorDeleteMovimento',
          'triggerImportProductionCsv', 'triggerImportCsv', 'importProductionCsvFile',
          'ppSaveProductionPeriodDay', 'ppClearProductionPeriodDay',
          'ppDeleteProductionPeriodDay', 'ppDeleteProductionPeriodMonth',
          'ppUndoProductionPeriodDelete', 'ppLoadProductionPeriodDay'
        ].forEach(function (fn) { if (readonly) ppGuardEditFn(fn); });
        try { ppTagEditButtons(); } catch (e) { }
      };
      function ppTagEditButtons() {
        var editSignatures = ['openEditor', 'openFinanceEditor', 'saveLocal', 'applyEditor',
          'addTeam', 'addHistoryFromFields', 'financeEditorAddMovimento', 'saveFinanceEditor',
          'financeEditorDeleteMovimento', 'triggerImportProductionCsv', 'triggerImportCsv',
          'ppSaveProductionPeriodDay', 'ppClearProductionPeriodDay',
          'ppDeleteProductionPeriodDay', 'ppDeleteProductionPeriodMonth',
          'ppUndoProductionPeriodDelete', 'ppLoadProductionPeriodDay'];
        var nodes = document.querySelectorAll('button[onclick],a[onclick]');
        Array.prototype.forEach.call(nodes, function (b) {
          var oc = b.getAttribute('onclick') || '';
          for (var i = 0; i < editSignatures.length; i++) {
            if (oc.indexOf(editSignatures[i]) >= 0) { b.setAttribute('data-edit-action', '1'); break; }
          }
        });
      }
      window.ppTagEditButtons = ppTagEditButtons;
      window.ppMarcarBotoesEdicao = function () {
        try { if (window.ppIsReadOnlyRole()) ppTagEditButtons(); } catch (e) { }
      };
      window.ppMarcarBotoesEdicao();

      function loadUserData(uid, cb) {
        var fs = db();
        if (!fs) { cb(null); return; }
        fs.collection(USERS_COLLECTION).doc(uid).get()
          .then(function (snap) {
            if (!snap.exists) { cb(null); return; }
            var data = snap.data();
            if (data.ativo === false) { cb(null, 'desativado'); return; }
            cb(data);
          })
          .catch(function () { cb(null); });
      }

      function routeAfterAuth(user, userData) {
        var role = (userData && userData.role) || 'controller';
        var projectIds = (userData && Array.isArray(userData.projectIds)) ? userData.projectIds : [];

        window.currentUserLogin = user.email;
        window.currentUserRole = role;
        window.currentUserNome = (userData && userData.nome) || user.email || '';
        try { currentUserRole = role; currentUserLogin = user.email; } catch (e) { }
        window.currentUserVerExecutivo = !!(userData && userData.verExecutivo === true);
        window.currentUserSomenteLeitura = !!(userData && userData.somenteLeitura === true);
        window.currentUserProjectIds = (role === 'admin' || isExecRole(role)) ? null : projectIds;

        var pill = el('currentProjectPill');
        if (pill) pill.textContent = (userData && userData.nome ? userData.nome : user.email) + ' · ' + role;

        var adminBtn = el('adminEntryBtn');
        if (adminBtn) adminBtn.style.display = (role === 'admin') ? 'block' : 'none';

        document.body.classList.remove('app-locked');

        setTimeout(function () {
          try { if (typeof ppSubscribeAllProjects === 'function') ppSubscribeAllProjects(); } catch (e) { }
          try { if (typeof ppPresenceStart === 'function') ppPresenceStart(); } catch (e) { }
          try { if (window.ppHistorySync && window.ppHistorySync.subscribeAllProjectsHistory) window.ppHistorySync.subscribeAllProjectsHistory(); } catch (e) { }
        }, 500);

        var execBtn = el('execProjetosBtn');
        if (execBtn) execBtn.style.display = 'inline-flex';

        try { ppApplyRoleUI(role); } catch (e) { }

        var _isFreshLogin = !!window.__ppFreshLogin;
        window.__ppFreshLogin = false;
        if (!_isFreshLogin) {
          var _nav = (typeof window.ppReadNavState === 'function') ? window.ppReadNavState() : {};
          var _savedRoute = _nav && _nav.route;
          var _rotaAdmin = (_savedRoute === '__admin__');
          var _allowed = _rotaAdmin
            ? (role === 'admin')
            : ((role === 'admin' || isExecRole(role))
              ? true
              : (_savedRoute === '__executive__' || (Array.isArray(projectIds) && projectIds.indexOf(_savedRoute) >= 0)));
          if (_savedRoute && _allowed && typeof window._pickProject === 'function') {
            var _cardScreen = _nav && _nav.cardScreen;
            var _cardTeam = _nav && _nav.cardTeam;
            var _restoringCard = (_cardScreen === 'teamCard' || _cardScreen === 'allTeamCards');

            if (_restoringCard) {
              try { document.documentElement.style.overflow = 'hidden'; } catch (e) { }
              window.__ppRestoringCardScreen = true;
            }

            window._pickProject(_savedRoute);

            if (_restoringCard) {
              setTimeout(function () {
                try {
                  if (_cardScreen === 'teamCard') {
                    try { if (typeof selectedCardTeam !== 'undefined' && _cardTeam) selectedCardTeam = _cardTeam; } catch (e) { }
                    if (typeof openTeamCard === 'function') openTeamCard();
                  } else {
                    if (typeof openAllTeamCards === 'function') openAllTeamCards();
                  }
                } catch (e) { }
                try { document.documentElement.style.overflow = ''; } catch (e) { }
                window.__ppRestoringCardScreen = false;
                try { if (typeof window.ppHideLoading === 'function') window.ppHideLoading(); } catch (e) { }
              }, 1200);
            }
            return;
          }
        }

        if (role === 'admin') {
          var allIds = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map(function (p) { return p.id; });
          showProjectPicker(userData, allIds, true);
        } else if (isExecRole(role)) {
          var execAllIds = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map(function (p) { return p.id; });
          showProjectPicker(userData, execAllIds, true);
        } else if (projectIds.length >= 1) {
          showProjectPicker(userData, projectIds, true);
        } else {
          showProjectPicker(userData, [], true);
        }
      }

      var _pickerCurrentId = null;
      var _pickerItems = [];

      function tileBtn(pid, label, sub, extraClass) {
        var cls = 'project-tile' + (extraClass ? ' ' + extraClass : '');
        return '<button type="button" class="' + cls + '" onclick="pickerAbrir(\'' + pid + '\')" data-pid="' + pid + '">'
          + '<b>' + label + '</b>'
          + '</button>';
      }

      window.pickerAbrir = function (pid) {
        try { pickerSelectTile(pid); } catch (e) { }
        try { window._pickProject(pid); } catch (e) { }
      };

      function showProjectPicker(userData, projectIds, includeExec) {
        var labelEl = el('pickerUserLabel');
        var roleMap = { admin: 'Administrador', ceo: 'CEO', diretor: 'Diretor', gerente: 'Gerente', coordenador: 'Coordenador', controller: 'Controller' };
        if (labelEl) {
          var _nome = (userData.nome || userData.email || '').toString();
          var _cargo = (roleMap[userData.role] || userData.role || '').toString();
          labelEl.textContent = 'Olá, ' + _nome + (_cargo ? ' - ' + _cargo : '') + '.';
        }
        var listEl = el('pickerProjectList');
        if (!listEl) return;
        _pickerItems = [];
        var tiles = [];

        if (includeExec) {
          _pickerItems.push({ id: '__executive__', label: 'Acompanhamento Gerencial', sub: 'Visão executiva' });
          tiles.push(tileBtn('__executive__', 'Acompanhamento Gerencial', 'Visão executiva', 'executivo'));
        }

        var _prj = typeof PROJECTS !== 'undefined' ? PROJECTS : [];
        projectIds.forEach(function (pid) {
          var proj = _prj.find(function (p) { return p.id === pid; });
          var nome = proj ? proj.nome : pid;
          _pickerItems.push({ id: pid, label: nome, sub: 'Painel operacional' });
          tiles.push(tileBtn(pid, nome, 'Painel operacional', ''));
        });

        listEl.innerHTML = tiles.join('');

        var sel = el('pickerSelect');
        if (sel) {
          sel.innerHTML = _pickerItems.map(function (item) {
            return '<option value="' + item.id + '">' + item.label + '</option>';
          }).join('');
        }

        if (_pickerItems.length > 0) {
          pickerSelectTile(_pickerItems[0].id);
        }

        var bg = el('projectPickerBg');
        if (bg) bg.style.display = 'flex';
      }

      window.ppShowPickerForCurrentUser = function () {
        var ud = _currentUserData;
        if (!ud) return false;
        var role = ud.role || 'controller';
        var allIds = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map(function (p) { return p.id; });
        var projIds = Array.isArray(ud.projectIds) ? ud.projectIds : [];
        if (role === 'admin' || (typeof isExecRole === 'function' && isExecRole(role))) {
          showProjectPicker(ud, allIds, true);
        } else if (projIds.length >= 1) {
          showProjectPicker(ud, projIds, true);
        } else {
          showProjectPicker(ud, [], true);
        }
        return true;
      };

      window.pickerSelectTile = function (id) {
        _pickerCurrentId = id;
        var listEl = el('pickerProjectList');
        if (listEl) {
          listEl.querySelectorAll('button[data-pid]').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-pid') === id);
          });
        }
        var sel = el('pickerSelect');
        if (sel) {
          sel.value = id;
          if (typeof aplSyncSelectEl === 'function') aplSyncSelectEl(sel);
        }
        pickerUpdateRight(id);
      };

      window.pickerSelectChange = function () {
        var sel = el('pickerSelect');
        if (!sel) return;
        pickerSelectTile(sel.value);
      };

      function pickerUpdateRight(id) {
        var titleEl = el('pickerDetailTitle');
        var subEl = el('pickerDetailSub');
        var btnEl = el('pickerOpenBtn');
        var info = { title: 'Selecione um painel', sub: '', btn: 'Abrir painel' };
        if (id === '__admin__') {
          info = { title: 'Administração', sub: 'Gerencie usuários, perfis e acessos ao sistema.', btn: 'Abrir Administração' };
        } else if (id === '__executive__') {
          info = { title: 'Acompanhamento Gerencial', sub: '', btn: 'Abrir Acompanhamento Gerencial' };
        } else {
          var proj = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).find(function (p) { return p.id === id; });
          var nome = proj ? proj.nome : id;
          info = { title: nome, sub: 'Painel operacional do contrato.', btn: 'Abrir Painel' };
        }
        if (titleEl) titleEl.textContent = info.title;
        if (subEl) subEl.textContent = info.sub;
        if (btnEl) btnEl.textContent = info.btn;
      }

      window.pickerOpenSelected = function () {
        var id = _pickerCurrentId;
        if (!id) {
          var sel = el('pickerSelect');
          if (sel) id = sel.value;
        }
        if (id) window._pickProject(id);
      };

      window.ppCloseTeamCardScreens = function () {
        try {
          var _tcPage = el('teamCardPage');
          if (_tcPage) {
            _tcPage.classList.remove('open');
            _tcPage.dataset.projectId = '';
          }
          var _atcPage = el('allTeamCardsPage');
          if (_atcPage) _atcPage.classList.remove('open');
          try { if (typeof selectedCardTeam !== 'undefined') selectedCardTeam = ''; } catch (e) { }
          try { if (typeof window.ppSaveNavState === 'function') window.ppSaveNavState({ cardScreen: '', cardTeam: '' }); } catch (e) { }
        } catch (e) { }
      };

      window.ppSaveNavState = function (patch) {
        try {
          var cur = {};
          try { cur = JSON.parse(localStorage.getItem('pp_nav_state') || '{}') || {}; } catch (e) { cur = {}; }
          var next = Object.assign({}, cur, patch || {});
          localStorage.setItem('pp_nav_state', JSON.stringify(next));
        } catch (e) { }
      };
      window.ppReadNavState = function () {
        try { return JSON.parse(localStorage.getItem('pp_nav_state') || '{}') || {}; } catch (e) { return {}; }
      };
      window.ppSaveCardScreenState = function (screen, team) {
        window.ppSaveNavState({ cardScreen: screen || '', cardTeam: team || '' });
      };

      window._pickProject = function (projectId) {
        var bg = el('projectPickerBg');
        if (bg) bg.style.display = 'none';

        if (projectId !== '__admin__') {
          try { localStorage.setItem('pp_last_route', projectId); } catch (e) { }
          window.ppSaveNavState({ route: projectId, cardScreen: '', cardTeam: '' });
        }

        if (projectId === '__admin__') {
          window.ppCloseTeamCardScreens();
          if (typeof openAdminPanel === 'function') openAdminPanel();
          return;
        }

        if (projectId === '__executive__') {
          window.ppCloseTeamCardScreens();

          try {
            if (typeof window.ppShowExecLoading === 'function') window.ppShowExecLoading();
            else if (typeof window.ppShowLoading === 'function') window.ppShowLoading('Acompanhamento Gerencial', 'Carregando dados da nuvem…');
          } catch (e) { }

          document.body.classList.add('executive-mode');
          if (typeof ppSubscribeAllProjects === 'function') ppSubscribeAllProjects();
          if (typeof openExecutivePanel === 'function') openExecutivePanel();
          return;
        }

        document.body.classList.remove('executive-mode');

        window.ppCloseTeamCardScreens();

        window.currentProjectId = projectId;
        try {
          var _projNome = (typeof projectById === 'function' && projectById(projectId)) ? projectById(projectId).nome : projectId;
          if (typeof window.ppShowLoading === 'function') window.ppShowLoading(_projNome, 'Carregando dados do projeto…');
        } catch (e) { }
        if (typeof loadProjectState === 'function') loadProjectState(projectId);
        if (typeof ppSubscribeProject === 'function') ppSubscribeProject(projectId);
        if (typeof bindEditorRealtime === 'function') bindEditorRealtime();
        if (typeof bindTeamCardRealtime === 'function') bindTeamCardRealtime();
        if (typeof renderAll === 'function') renderAll();
        (function ppWaitProjectOpen() {
          var pid = projectId, start = Date.now(), MAXMS = 5000;
          var BANKBASE = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
          function ready() {
            try {
              if (window.currentProjectId !== pid) return true;
              var cache = window.__PP_REMOTE_PROJECT_CACHE__ || {};
              var docOk = !!cache[pid];
              return docOk || (Date.now() - start) >= 400;
            } catch (e) { return true; }
          }
          (function tick() {
            if (ready() || (Date.now() - start) >= MAXMS) {
              try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
              try { if (typeof window.ppHideLoading === 'function') window.ppHideLoading(); } catch (e) { }
              return;
            }
            setTimeout(tick, 150);
          })();
        })();
        (function ppAutoRecentOnOpen() {
          var pid = projectId;
          var VIEW_BASE = 'painel-produtividade-view-dia-graficos-v1-projetos';
          try { window._ppUserPickedDay = false; } catch (e) { }
          var tries = [300, 900, 1800, 3000];
          tries.forEach(function (delay) {
            setTimeout(function () {
              try {
                if (window.currentProjectId !== pid) return;
                if (window._ppUserPickedDay) return;
                if (typeof window.ppResolveMostRecentDayKey !== 'function') return;
                var dayKey = window.ppResolveMostRecentDayKey();
                if (!dayKey) return;
                try { localStorage.setItem(VIEW_BASE + '::' + pid, dayKey); } catch (e) { }
                if (typeof window.ppSetDashboardViewDay === 'function') window.ppSetDashboardViewDay(dayKey);
                if (typeof window.ensureTeamPerformanceDaySelector === 'function') window.ensureTeamPerformanceDaySelector();
              } catch (e) { }
            }, delay);
          });
        })();
        var pill = el('currentProjectPill');
        if (pill && _currentUserData) pill.textContent = (_currentUserData.nome || window.currentUserLogin) + ' · ' + projectId;
      };

      window.voltarAoPicker = function () {
        try { if (typeof window.ppHideLoading === 'function') window.ppHideLoading(); } catch (e) { }
        if (!_currentFbUser || !_currentUserData) { logoutApp(); return; }
        try { localStorage.removeItem('pp_last_route'); } catch (e) { }
        try { localStorage.removeItem('pp_nav_state'); } catch (e) { }
        window.ppCloseTeamCardScreens();
        document.body.classList.remove('executive-mode');
        var exFrame = el('executiveFrame');
        if (exFrame && exFrame.src && exFrame.src.indexOf('about:blank') === -1) { exFrame.onload = null; exFrame.src = 'about:blank'; }
        window.ppShowPickerForCurrentUser();
      };

      window.loginApp = function (event) {
        if (event) event.preventDefault();
        var authInst = auth();
        if (!authInst) { alert('Firebase Auth não inicializado. Verifique o firebase-config.js.'); return false; }
        var emailVal = String((el('loginUser') && el('loginUser').value) || '').trim();
        var passVal = String((el('loginPass') && el('loginPass').value) || '').trim();
        var errEl = el('loginError');
        var btnEl = el('loginSubmitBtn');
        if (!emailVal || !passVal) {
          if (errEl) errEl.textContent = 'Preencha e-mail e senha.';
          return false;
        }
        if (errEl) errEl.textContent = '';
        if (btnEl && btnEl.getAttribute('data-ocupado') === '1') return false;
        if (typeof window.ppBotaoEntrarOcupado === 'function') {
          window.ppBotaoEntrarOcupado(true, 'Entrando');
        } else if (btnEl) {
          btnEl.disabled = true; btnEl.textContent = 'Entrando...';
        }
        window.__ppFreshLogin = true;
        authInst.signInWithEmailAndPassword(emailVal, passVal)
          .then(function () {
            if (typeof window.ppBotaoEntrarOcupado === 'function') {
              window.ppBotaoEntrarOcupado(true, 'Abrindo painel');
            }
            try { localStorage.setItem('pp_session_ts', Date.now()); } catch (e) { }
          })
          .catch(function (err) {
            if (typeof window.ppBotaoEntrarOcupado === 'function') {
              window.ppBotaoEntrarOcupado(false);
            } else if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Entrar'; }
            var msg = 'E-mail ou senha inválidos.';
            if (err.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Aguarde alguns minutos.';
            if (err.code === 'auth/user-disabled') msg = 'Usuário desativado. Contate o administrador.';
            if (err.code === 'auth/network-request-failed') msg = 'Sem conexão com a internet. Verifique a rede e tente de novo.';
            if (err.code === 'auth/internal-error' || err.code === 'auth/invalid-api-key') {
              msg = 'Falha no servidor de acesso. Tente de novo em instantes.';
            }
            if (errEl) errEl.textContent = msg;
          });
        return false;
      };

      (function () {
        var _orig = typeof window.logoutApp === 'function' ? window.logoutApp : null;
        window.logoutApp = function () {
          if (_orig) _orig();
          _currentFbUser = null;
          _currentUserData = null;
          try { localStorage.removeItem('pp_nav_state'); } catch (e) { }
          try { localStorage.removeItem('pp_last_route'); } catch (e) { }
          try { localStorage.removeItem('pp_session_ts'); } catch (e) { }

          try {
            var _apagar = [];
            for (var _i = 0; _i < localStorage.length; _i++) {
              var _k = localStorage.key(_i);
              if (!_k) continue;
              if (_k.indexOf('painel-produtividade-') === 0 ||
                _k.indexOf('pp.project.broadcast') === 0 ||
                _k.indexOf('pp.executive.') === 0) _apagar.push(_k);
            }
            _apagar.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { } });
            try { if (window.ppMemoriaDoNavegador) window.ppMemoriaDoNavegador.limpar(); } catch (e) { }
          } catch (e) { }
          try { window.__PP_REMOTE_PROJECT_CACHE__ = {}; } catch (e) { }
          try { window.__PP_NUVEM_RESPONDEU__ = {}; window.__PP_HIST_RESPONDEU__ = {}; } catch (e) { }
          try {
            window.currentUserRole = 'locked';
            window.currentUserProjectIds = undefined;
            window.currentUserSomenteLeitura = false;
            window.currentUserLogin = '';
            window.currentUserNome = '';
          } catch (e) { }

          var a = auth();
          if (a) a.signOut().catch(function () { });
        };
      })();

      (function () {
        var IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
        var idleTimer = null;
        function resetIdleTimer() {
          clearTimeout(idleTimer);
          if (document.body.classList.contains('app-locked')) return;
          idleTimer = setTimeout(function () {
            if (!document.body.classList.contains('app-locked') && typeof window.logoutApp === 'function') {
              window.logoutApp();
            }
          }, IDLE_TIMEOUT_MS);
        }
        ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (evt) {
          document.addEventListener(evt, resetIdleTimer, { passive: true });
        });
        resetIdleTimer();
      })();

      var SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

      function hideSplash() {
        var s = el('authSplash');
        if (!s || s.style.display === 'none') return;
        s.classList.add('splash-hiding');
        document.body.classList.remove('auth-loading');
        setTimeout(function () { s.style.display = 'none'; }, 280);
      }

      function startAuthObserver() {
        var authInst = auth();
        if (!authInst) {
          console.warn('Painel: Firebase Auth indisponível. Verifique firebase-config.js.');
          try { hideSplash(); } catch (e) { }
          try {
            var _er = el('loginError');
            if (_er) _er.textContent = 'Sem conexão com o servidor de acesso. Verifique a internet e recarregue a página.';
          } catch (e) { }
          return;
        }
        authInst.onAuthStateChanged(function (user) {
          _currentFbUser = user;

          if (!user) {
            _currentUserData = null;
            document.body.classList.add('app-locked');
            document.body.classList.remove('executive-mode');
            var exFrame = el('executiveFrame');
            if (exFrame && exFrame.src && exFrame.src.indexOf('about:blank') === -1) { exFrame.onload = null; exFrame.src = 'about:blank'; }
            hideSplash();
            var bg1 = el('projectPickerBg'); if (bg1) bg1.style.display = 'none';
            var bg2 = el('adminPanelBg'); if (bg2) bg2.style.display = 'none';
            var adminBtn = el('adminEntryBtn'); if (adminBtn) adminBtn.style.display = 'none';
            var execProjBtn = el('execProjetosBtn'); if (execProjBtn) execProjBtn.style.display = 'none';
            return;
          }

          var savedTs = 0;
          try { savedTs = parseInt(localStorage.getItem('pp_session_ts'), 10) || 0; } catch (e) { }
          if (savedTs && (Date.now() - savedTs) > SESSION_DURATION_MS) {
            try { localStorage.removeItem('pp_session_ts'); } catch (e) { }
            try { localStorage.removeItem('pp_last_route'); } catch (e) { }
            try { localStorage.removeItem('pp_nav_state'); } catch (e) { }
            hideSplash();
            authInst.signOut();
            return;
          }
          try { localStorage.setItem('pp_session_ts', Date.now()); } catch (e) { }

          loadUserData(user.uid, function (userData, motivo) {
            _currentUserData = userData;
            if (!userData) {
              var msg = motivo === 'desativado'
                ? 'Usuário desativado. Contate o administrador.'
                : 'Perfil não encontrado. Contate o administrador.';
              var errEl = el('loginError');
              if (errEl) errEl.textContent = msg;
              document.body.classList.add('app-locked');
              hideSplash();
              authInst.signOut();
              return;
            }
            hideSplash();
            routeAfterAuth(user, userData);
          });
        });
      }

      window.openAdminPanel = function () {
        var _papel = String((window.currentUserRole || '')).toLowerCase();
        if (_papel !== 'admin') {
          alert('Apenas o administrador tem acesso a esta area.');
          return;
        }
        var seletor = el('projectPickerBg'); if (seletor) seletor.style.display = 'none';
        var bg = el('adminPanelBg'); if (bg) bg.style.display = 'flex';
        document.body.classList.add('adm-aberta');
        adminLoadUsers();
        adminRenderProjectCheckboxes();
        showAdminTab('visao');
      };
      window.closeAdminPanel = function () {
        var bg = el('adminPanelBg'); if (bg) bg.style.display = 'none';
        document.body.classList.remove('adm-aberta');
        try { if (typeof window.adminLimparCentral === 'function') window.adminLimparCentral(); } catch (e) { }
        try { if (typeof adminStopOnlineWatch === 'function') adminStopOnlineWatch(); } catch (e) { }
        if (_currentFbUser && _currentUserData && _currentUserData.role === 'admin') {
          window.ppShowPickerForCurrentUser();
        }
      };
      var ABAS_ADMIN = { visao: 'Visao', users: 'Users', create: 'Create', contratos: 'Contratos', online: 'Online', log: 'Log', acessos: 'Acessos' };
      window.showAdminTab = function (tab) {
        if (!ABAS_ADMIN[tab]) tab = 'visao';
        Object.keys(ABAS_ADMIN).forEach(function (k) {
          var secao = el('adminTab' + ABAS_ADMIN[k]); if (secao) secao.style.display = k === tab ? 'block' : 'none';
          var botao = el('adminTabBtn' + ABAS_ADMIN[k]);
          if (botao) { botao.classList.toggle('adm-ativo', k === tab); botao.setAttribute('aria-current', k === tab ? 'page' : 'false'); }
        });
        var conteudo = document.querySelector('#adminPanelBg .adm-conteudo'); if (conteudo) conteudo.scrollTop = 0;
        if (tab !== 'online') { try { if (typeof adminStopOnlineWatch === 'function') adminStopOnlineWatch(); } catch (e) { } }
        if (tab === 'visao' && typeof window.adminRenderVisaoGeral === 'function') window.adminRenderVisaoGeral();
        if (tab === 'contratos' && typeof window.adminRenderContratos === 'function') window.adminRenderContratos();
        if (tab === 'acessos') { try { if (typeof adminRenderAcessos === 'function') adminRenderAcessos(); } catch (e) { } }
        if (tab === 'create') adminRenderProjectCheckboxes();
        if (tab === 'log' && typeof window.adminRenderEditLog === 'function') window.adminRenderEditLog();
        if (tab === 'online' && typeof window.adminStartOnlineWatch === 'function') window.adminStartOnlineWatch();
      };

      window.adminToggleProjects = function () {
        var role = el('newUserRole') && el('newUserRole').value;
        var comProjetos = (role === 'controller' || role === 'coordenador' || role === 'gerente');
        var wrap = el('newUserProjectsWrap');
        if (wrap) wrap.style.display = comProjetos ? 'block' : 'none';
        var verExecWrap = el('newUserVerExecWrap');
        if (verExecWrap) verExecWrap.style.display = comProjetos ? 'block' : 'none';
        var roWrap = el('newUserReadonlyWrap');
        if (roWrap) roWrap.style.display = (role === 'admin' || comProjetos) ? 'block' : 'none';
      };

      function adminRenderProjectCheckboxes() {
        var cont = el('newUserProjects'); if (!cont) return;
        cont.innerHTML = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map(function (p) {
          return '<label style="display:inline-flex;align-items:center;gap:6px;background:#E7F0F9;border:1px solid #BFD6EC;border-radius:10px;padding:6px 10px;cursor:pointer;font-size:11px;font-weight:850;color:#161B24">'
            + '<input type="checkbox" name="newProjCheck" value="' + p.id + '" style="width:auto"> ' + p.nome
            + '</label>';
        }).join('');
        adminToggleProjects();
      }

      var ROTULO_PERFIL = { admin: 'Administrador', ceo: 'CEO / Presidente', diretor: 'Diretor', gerente: 'Gerente', coordenador: 'Coordenador', controller: 'Controller' };
      var COR_PERFIL = { admin: ['#161B24', '#DCE8F4'], ceo: ['#7C2D12', '#FFEDD5'], diretor: ['#185A92', '#E7F0F9'], gerente: ['#1F6FB2', '#E7F0F9'], coordenador: ['#6D28D9', '#F5F3FF'], controller: ['#1E8A4C', '#E2F3E8'] };
      var _admUsuarios = [];
      var _admFiltroPerfil = 'todos';

      function admIniciais(nome, email) {
        var partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
        if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return String(email || '?').slice(0, 2).toUpperCase();
      }
      function admHaQuanto(ms) {
        ms = Number(ms) || 0;
        if (!ms) return 'sem registro';
        var min = Math.round((Date.now() - ms) / 60000);
        if (min < 2) return 'agora há pouco';
        if (min < 60) return 'há ' + min + ' min';
        var h = Math.round(min / 60);
        if (h < 24) return 'há ' + h + ' h';
        var d = Math.round(h / 24);
        return d === 1 ? 'ontem' : 'há ' + d + ' dias';
      }
      window.ppAdmHaQuanto = admHaQuanto;

      function adminDesenharChips() {
        var box = el('admUserChips'); if (!box) return;
        var cont = { todos: _admUsuarios.length, inativos: 0 };
        _admUsuarios.forEach(function (u) {
          if (u.ativo === false) cont.inativos++;
          cont[u.role] = (cont[u.role] || 0) + 1;
        });
        var opcoes = [['todos', 'Todos']].concat(Object.keys(ROTULO_PERFIL).filter(function (r) { return cont[r]; }).map(function (r) { return [r, ROTULO_PERFIL[r]]; }));
        if (cont.inativos) opcoes.push(['inativos', 'Inativos']);
        if (!opcoes.some(function (o) { return o[0] === _admFiltroPerfil; })) _admFiltroPerfil = 'todos';
        box.innerHTML = opcoes.map(function (o) {
          return '<button type="button" class="adm-chip' + (o[0] === _admFiltroPerfil ? ' adm-ativo' : '') + '" onclick="adminFiltrarPerfil(\'' + o[0] + '\')">'
            + escapeHtml(o[1]) + ' <span class="adm-suave">' + (cont[o[0]] || 0) + '</span></button>';
        }).join('');
      }
      window.adminFiltrarPerfil = function (perfil) {
        _admFiltroPerfil = perfil || 'todos';
        adminDesenharChips();
        adminDesenharUsuarios();
      };
      window.adminFiltrarUsuarios = function () { adminDesenharUsuarios(); };

      function adminDesenharUsuarios() {
        var listEl = el('adminUserList'); if (!listEl) return;
        var termo = String((el('admUserBusca') && el('admUserBusca').value) || '').trim().toLowerCase();
        var lista = _admUsuarios.filter(function (u) {
          if (_admFiltroPerfil === 'inativos' && u.ativo !== false) return false;
          if (_admFiltroPerfil !== 'todos' && _admFiltroPerfil !== 'inativos' && u.role !== _admFiltroPerfil) return false;
          if (termo && (String(u.nome || '') + ' ' + String(u.email || '')).toLowerCase().indexOf(termo) < 0) return false;
          return true;
        });
        var conta = el('admUserConta'); if (conta) conta.textContent = lista.length + ' de ' + _admUsuarios.length + ' usuário(s)';
        if (!_admUsuarios.length) { listEl.innerHTML = '<p class="adm-vazio">Nenhum usuário cadastrado ainda.</p>'; return; }
        if (!lista.length) { listEl.innerHTML = '<p class="adm-vazio">Nenhum usuário para a busca ou o filtro escolhido.</p>'; return; }
        var projetos = (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
        var linhas = lista.map(function (d) {
          var uid = d.__uid;
          var ativo = d.ativo !== false;
          var cor = COR_PERFIL[d.role] || ['#3F4752', '#F2F3F5'];
          var contratos = Array.isArray(d.projectIds) && d.projectIds.length
            ? d.projectIds.map(function (pid) {
              var p = projetos.find(function (x) { return x.id === pid; });
              return '<span class="adm-contrato-chip">' + escapeHtml(p ? p.nome : pid) + '</span>';
            }).join('')
            : '<span class="adm-suave">' + (d.role === 'admin' || isExecRole(d.role) ? 'todos (leitura' + (d.role === 'admin' ? ' e edição' : '') + ')' : 'nenhum') + '</span>';
          var safeEmail = escapeAttr(d.email || '');
          var status = ativo
            ? '<span class="adm-pilula adm-pilula-verde">ativo</span>'
            : '<span class="adm-pilula" style="color:#B3321F;background:#FCE7E3;border-color:#F5C4BA">inativo</span>';
          return '<tr' + (ativo ? '' : ' class="adm-inativo"') + '>'
            + '<td><div class="adm-pessoa"><span class="adm-avatar" style="background:' + cor[0] + '">' + escapeHtml(admIniciais(d.nome, d.email)) + '</span>'
            + '<div class="adm-pessoa-texto"><b>' + escapeHtml(d.nome || '-') + '</b><small>' + escapeHtml(d.email || '-') + '</small></div></div></td>'
            + '<td><span class="adm-selo-perfil" style="color:' + cor[0] + ';background:' + cor[1] + '">' + escapeHtml(ROTULO_PERFIL[d.role] || d.role || '-') + '</span></td>'
            + '<td style="max-width:260px">' + contratos + '</td>'
            + '<td class="adm-suave" style="white-space:nowrap">' + escapeHtml(admHaQuanto(d.ultimoAcessoMs)) + '</td>'
            + '<td>' + status + '</td>'
            + '<td class="adm-acoes">'
            + '<button class="adm-acao adm-acao-forte" onclick="adminEditUser(\'' + uid + '\')">Editar perfil e status</button>'
            + '<button class="adm-acao" onclick="adminResetPassword(\'' + safeEmail + '\')">Reset senha</button>'
            + '<button class="adm-acao adm-acao-perigo" onclick="adminDeleteUser(\'' + uid + '\',\'' + safeEmail + '\')">Excluir</button>'
            + '</td></tr>';
        }).join('');
        listEl.innerHTML = '<table class="adm-tabela adm-tabela-usuarios" style="min-width:740px"><thead><tr>'
          + '<th>Usuário</th><th>Perfil</th><th>Contratos</th><th>Último acesso</th><th>Status</th><th>Ações</th>'
          + '</tr></thead><tbody>' + linhas + '</tbody></table>';
      }

      function adminLoadUsers() {
        var fs = db();
        var listEl = el('adminUserList');
        if (!listEl) return;
        if (!fs) { listEl.innerHTML = '<p class="adm-vazio" style="color:#D0402B">Firebase não configurado.</p>'; return; }
        listEl.innerHTML = '<p class="adm-vazio">Carregando...</p>';
        fs.collection(USERS_COLLECTION).get()
          .then(function (snap) {
            _admUsuarios = snap.docs.map(function (doc) { var d = doc.data() || {}; d.__uid = doc.id; return d; })
              .sort(function (a, b) {
                if ((a.ativo !== false) !== (b.ativo !== false)) return a.ativo !== false ? -1 : 1;
                return String(a.nome || a.email || '').localeCompare(String(b.nome || b.email || ''), 'pt-BR');
              });
            window.__ppAdmUsuarios = _admUsuarios;
            adminDesenharChips();
            adminDesenharUsuarios();
          })
          .catch(function (e) { listEl.innerHTML = '<p class="adm-vazio" style="color:#D0402B">Erro: ' + escapeHtml(e.message) + '</p>'; });
      }
      window.adminRefreshUsers = adminLoadUsers;

      window.adminCreateUser = function () {
        var nome = (el('newUserName') && el('newUserName').value.trim()) || '';
        var email = (el('newUserEmail') && el('newUserEmail').value.trim()) || '';
        var pass = (el('newUserPass') && el('newUserPass').value.trim()) || '';
        var role = (el('newUserRole') && el('newUserRole').value) || 'controller';
        var msgEl = el('adminCreateMsg');
        var checks = document.querySelectorAll('input[name="newProjCheck"]:checked');
        var projectIds = Array.prototype.map.call(checks, function (c) { return c.value; });

        if (!nome || !email || !pass) {
          if (msgEl) { msgEl.textContent = 'Preencha nome, e-mail e senha.'; msgEl.style.color = '#D0402B'; } return;
        }
        if (pass.length < 6) {
          if (msgEl) { msgEl.textContent = 'Senha mínima: 6 caracteres.'; msgEl.style.color = '#D0402B'; } return;
        }
        if (msgEl) { msgEl.textContent = 'Criando usuário...'; msgEl.style.color = '#67707C'; }

        var cfg = window.PP_FIREBASE_CONFIG;
        var secondApp;
        try { secondApp = firebase.app('pp-secondary'); }
        catch (e) { secondApp = firebase.initializeApp(cfg, 'pp-secondary'); }

        secondApp.auth().createUserWithEmailAndPassword(email, pass)
          .then(function (cred) {
            var uid = cred.user.uid;
            return secondApp.auth().signOut().then(function () {
              var fs = db(); if (!fs) throw new Error('Firestore indisponível');
              return fs.collection(USERS_COLLECTION).doc(uid).set({
                nome: nome, email: email, role: role, projectIds: projectIds, ativo: true,
                verExecutivo: !!(el('newUserVerExec') && el('newUserVerExec').checked),
                somenteLeitura: !!(el('newUserReadonly') && el('newUserReadonly').checked),
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                criadoPor: _currentFbUser ? _currentFbUser.uid : 'admin'
              });
            });
          })
          .then(function () {
            if (msgEl) { msgEl.textContent = '✓ Usuário criado com sucesso!'; msgEl.style.color = '#1E8A4C'; }
            ['newUserName', 'newUserEmail', 'newUserPass'].forEach(function (id) { if (el(id)) el(id).value = ''; });
            document.querySelectorAll('input[name="newProjCheck"]').forEach(function (c) { c.checked = false; });
            setTimeout(function () { adminLoadUsers(); showAdminTab('users'); }, 900);
          })
          .catch(function (err) {
            var msg = err.message || 'Erro ao criar usuário.';
            if (err.code === 'auth/email-already-in-use') msg = 'E-mail já cadastrado.';
            if (err.code === 'auth/invalid-email') msg = 'E-mail inválido.';
            if (msgEl) { msgEl.textContent = msg; msgEl.style.color = '#D0402B'; }
          });
      };

      window.adminResetPassword = function (email) {
        if (!email) { alert('E-mail não disponível.'); return; }
        var authInst = auth(); if (!authInst) return;
        authInst.sendPasswordResetEmail(email)
          .then(function () { alert('E-mail de redefinição enviado para ' + email); })
          .catch(function (e) { alert('Erro: ' + e.message); });
      };

      window.adminEditUser = function (uid) {
        var fs = db(); if (!fs) return;
        fs.collection(USERS_COLLECTION).doc(uid).get().then(function (doc) {
          if (!doc.exists) { alert('Usuário não encontrado.'); return; }
          var d = doc.data();
          var panel = el('editUserBg'); if (!panel) return;
          panel.dataset.uid = uid;
          var fld = function (id) { return panel.querySelector('#' + id); };
          fld('editNome').value = d.nome || '';
          fld('editEmail').value = d.email || '';
          fld('editRole').value = d.role || 'controller';
          fld('editStatus').value = (d.ativo === false) ? 'inativo' : 'ativo';
          if (fld('editVerExec')) fld('editVerExec').checked = (d.verExecutivo === true);
          if (fld('editReadonly')) fld('editReadonly').checked = (d.somenteLeitura === true);
          var _erole = fld('editRole').value;
          var _vew = fld('editVerExecWrap'); if (_vew) _vew.style.display = (_erole === 'controller' || _erole === 'gerente') ? 'block' : 'none';
          var _row = fld('editReadonlyWrap'); if (_row) _row.style.display = (_erole === 'admin' || _erole === 'controller' || _erole === 'gerente') ? 'block' : 'none';
          if (typeof window.aplReinitSelects === 'function') window.aplReinitSelects();
          if (typeof window.aplSyncSelectEl === 'function') {
            window.aplSyncSelectEl(fld('editRole'));
            window.aplSyncSelectEl(fld('editStatus'));
          }
          var wrap = fld('editProjChecks');
          if (wrap) {
            var sel = Array.isArray(d.projectIds) ? d.projectIds : [];
            wrap.innerHTML = (typeof PROJECTS !== 'undefined' ? PROJECTS : []).map(function (p) {
              var chk = sel.indexOf(p.id) > -1 ? 'checked' : '';
              return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px;color:#3F4752;cursor:pointer">'
                + '<input type="checkbox" name="editProjCheck" value="' + p.id + '" ' + chk + ' style="accent-color:#161B24">'
                + p.nome + '</label>';
            }).join('');
          }
          var showProjs = ['gerente', 'controller', 'coordenador'].indexOf(fld('editRole').value) > -1;
          var projArea = fld('editProjArea');
          if (projArea) projArea.style.display = showProjs ? 'block' : 'none';
          panel.style.display = 'flex';
          setTimeout(function () {
            if (typeof window.aplReinitSelects === 'function') window.aplReinitSelects();
            if (typeof window.aplSyncSelectEl === 'function') {
              window.aplSyncSelectEl(fld('editRole'));
              window.aplSyncSelectEl(fld('editStatus'));
            }
          }, 60);
          var msgEl = fld('editMsg');
          if (msgEl) msgEl.textContent = '';
        }).catch(function (e) { alert('Erro: ' + e.message); });
      };

      window.editToggleProjects = function (sel) {
        var showProjs = ['gerente', 'controller', 'coordenador'].indexOf(sel.value) > -1;
        var projArea = document.getElementById('editProjArea');
        if (projArea) projArea.style.display = showProjs ? 'block' : 'none';
        var roleNow = (sel && sel.value) ? sel.value : 'controller';
        var vew = document.getElementById('editVerExecWrap');
        if (vew) vew.style.display = (roleNow === 'controller' || roleNow === 'gerente') ? 'block' : 'none';
        var row = document.getElementById('editReadonlyWrap');
        if (row) row.style.display = (roleNow === 'admin' || roleNow === 'controller' || roleNow === 'gerente') ? 'block' : 'none';
      };

      window.closeEditUser = function () {
        var panel = el('editUserBg'); if (panel) panel.style.display = 'none';
      };

      window.adminSaveUser = function () {
        var panel = el('editUserBg'); if (!panel) return;
        var uid = panel.dataset.uid; if (!uid) { alert('UID não encontrado.'); return; }
        var fld = function (id) { return panel.querySelector('#' + id); };
        var nome = (fld('editNome').value || '').trim();
        var role = fld('editRole').value;
        var ativo = fld('editStatus').value !== 'inativo';
        var projs = [];
        panel.querySelectorAll('input[name="editProjCheck"]:checked').forEach(function (c) { projs.push(c.value); });
        if (!nome) { alert('Informe o nome.'); return; }
        var msgEl = fld('editMsg');
        if (msgEl) { msgEl.textContent = 'Salvando...'; msgEl.style.color = '#67707C'; }
        var fs = db(); if (!fs) return;
        var data = { nome: nome, role: role, ativo: ativo };
        if (['gerente', 'controller', 'coordenador'].indexOf(role) > -1) { data.projectIds = projs; }
        else { data.projectIds = []; }
        data.verExecutivo = !!(fld('editVerExec') && fld('editVerExec').checked);
        data.somenteLeitura = !!(fld('editReadonly') && fld('editReadonly').checked);
        fs.collection(USERS_COLLECTION).doc(uid).update(data)
          .then(function () {
            if (msgEl) { msgEl.textContent = 'Salvo com sucesso!'; msgEl.style.color = '#1E8A4C'; }
            setTimeout(function () { window.closeEditUser(); adminLoadUsers(); }, 900);
          })
          .catch(function (e) {
            if (msgEl) { msgEl.textContent = 'Erro: ' + e.message; msgEl.style.color = '#D0402B'; }
          });
      };

      window.adminDeleteUser = function (uid, email) {
        try {
          var me = (window.firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : null;
          if (me && uid === me) { alert('Você não pode excluir o seu próprio usuário.'); return; }
        } catch (e) { }
        if (!confirm('Excluir PERMANENTEMENTE o usuário ' + (email || '') + '?\n\nO registro sai da lista e o login deixa de funcionar. A conta de e-mail permanece no Firebase (Console) mas fica sem acesso.')) return;
        if (!confirm('Confirmação final: excluir ' + (email || '') + ' definitivamente?')) return;
        var fs = db(); if (!fs) { alert('Firebase não configurado.'); return; }
        fs.collection(USERS_COLLECTION).doc(uid).delete()
          .then(function () { try { adminLoadUsers(); } catch (e) { } alert('Usuário excluído.'); })
          .catch(function (e) { alert('Erro ao excluir: ' + (e && e.message ? e.message : e)); });
      };

      window.adminToggleUserStatus = function (uid, email, currentlyActive) {
        var acao = currentlyActive ? 'desativar' : 'reativar';
        if (!confirm('Confirmar: ' + acao + ' usuário ' + email + '?')) return;
        var fs = db(); if (!fs) return;
        fs.collection(USERS_COLLECTION).doc(uid).update({ ativo: !currentlyActive })
          .then(function () { adminLoadUsers(); })
          .catch(function (e) { alert('Erro: ' + e.message); });
      };

      window.ppAutoOpenRoute = function () { };

      function init() {
        if (typeof ppInitFirebase === 'function') ppInitFirebase();
        startAuthObserver();
      }

      if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
      else { setTimeout(init, 0); }
    })();
