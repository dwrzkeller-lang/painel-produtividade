    (function () {
      'use strict';
      if (window.__ppProductionPeriodEditor) return;
      window.__ppProductionPeriodEditor = true;

      var BACKUP_KEY = 'pp-producao-periodo-ultimo-backup-v1';
      var selection = { pid: '', month: '', day: '' };

      function el(id) { return document.getElementById(id); }
      function copy(value) { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; } }
      function number(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        var text = String(value == null ? '' : value).trim().replace(/R\$/gi, '').replace(/\s/g, '');
        if (text.indexOf(',') >= 0) text = text.replace(/\./g, '').replace(',', '.');
        text = text.replace(/[^0-9.\-]/g, '');
        var parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      function round(value) { return Math.round((number(value) + Number.EPSILON) * 100) / 100; }
      function pid() { try { return currentProjectId || ''; } catch (e) { return ''; } }
      function projectName() {
        try { var project = projectById(pid()); return project && project.nome ? project.nome : pid(); }
        catch (e) { return pid() || 'Projeto atual'; }
      }
      function dateParts(value) {
        var match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return null;
        var day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
        var date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return { date: date, time: date.getTime(), month: year + '-' + String(month).padStart(2, '0') };
      }
      function monthLabel(month) {
        var match = String(month || '').match(/^(\d{4})-(\d{2})$/);
        return match ? match[2] + '/' + match[1] : month;
      }
      function compareDates(a, b) {
        var pa = dateParts(a), pb = dateParts(b);
        return (pa ? pa.time : 0) - (pb ? pb.time : 0);
      }
      function readBank() {
        try { return typeof getDailyBank === 'function' ? copy(getDailyBank()) : {}; }
        catch (e) { return {}; }
      }
      function writeBank(bank) {
        if (typeof window.setDailyBank === 'function') window.setDailyBank(bank);
        else if (typeof setDailyBank === 'function') setDailyBank(bank);
      }
      function monthKeys(bank, month) {
        return Object.keys(bank || {}).filter(function (key) {
          var parsed = dateParts(key);
          return parsed && parsed.month === month;
        }).sort(compareDates);
      }
      function allMonths(bank) {
        var found = {};
        Object.keys(bank || {}).forEach(function (key) {
          var parsed = dateParts(key);
          if (parsed) found[parsed.month] = true;
        });
        return Object.keys(found).sort().reverse();
      }
      function money(value) {
        try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number(value)); }
        catch (e) { return 'R$ ' + round(value).toFixed(2).replace('.', ','); }
      }
      function businessUntil(key) {
        var parsed = dateParts(key);
        if (!parsed) return 0;
        try {
          if (typeof window.ppDiasUteisAte === 'function') {
            var g = window.ppDiasUteisAte(typeof config !== 'undefined' ? config : null, parsed.date);
            if (isFinite(g)) return g;
          }
        } catch (e) { }
        try { if (typeof countBusinessUntil === 'function') return countBusinessUntil(parsed.date); } catch (e) { }
        var total = 0;
        for (var date = new Date(parsed.date.getFullYear(), parsed.date.getMonth(), 1); date <= parsed.date; date.setDate(date.getDate() + 1)) {
          if (date.getDay() !== 0 && date.getDay() !== 6) total++;
        }
        return total;
      }

      function calculateTargets(metaMes, businessDaysMonth, businessDaysElapsed) {
        var monthTarget = round(metaMes);
        var daysMonth = Math.max(1, number(businessDaysMonth));
        var daysElapsed = Math.max(0, number(businessDaysElapsed));
        var dayTarget = round(monthTarget / daysMonth);
        return {
          metaMes: monthTarget,
          metaDia: dayTarget,
          metaAcumulada: round((monthTarget / daysMonth) * daysElapsed)
        };
      }

      function backup(bank, action) {
        try {
          localStorage.setItem(BACKUP_KEY + '::' + pid(), JSON.stringify({
            savedAt: new Date().toISOString(), action: action || '', bank: copy(bank),
            state: { config: copy(config || {}), equipes: copy(equipes || []), historico: copy(historico || []), teamCards: copy(teamCards || {}), teamCardTheme: copy(teamCardTheme || {}) }
          }));
        } catch (e) { console.warn('[Produção por período] Backup não criado.', e); }
      }

      function rebuildAccumulated(bank, onlyMonths) {
        var allowed = Array.isArray(onlyMonths) && onlyMonths.length ? onlyMonths : null;
        allMonths(bank).forEach(function (month) {
          if (allowed && allowed.indexOf(month) < 0) return;
          var days = monthKeys(bank, month);
          var templates = {};
          days.forEach(function (key) {
            var teams = Array.isArray(bank[key] && bank[key].equipes) ? bank[key].equipes : [];
            teams.forEach(function (team) {
              var name = String(team.equipe || '').trim().toUpperCase();
              if (name) templates[name] = Object.assign({}, templates[name] || {}, copy(team));
            });
          });
          var names = Object.keys(templates).sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { numeric: true }); });
          var accumulated = {};
          var history = [];

          days.forEach(function (key) {
            var snap = copy(bank[key] || {});
            var existing = {};
            (Array.isArray(snap.equipes) ? snap.equipes : []).forEach(function (team) {
              var name = String(team.equipe || '').trim().toUpperCase();
              if (name) existing[name] = team;
            });
            snap.equipes = names.map(function (name) {
              var team = Object.assign({}, templates[name] || {}, existing[name] || {}, { equipe: name });
              team.produzidoDia = round(existing[name] ? existing[name].produzidoDia : 0);
              accumulated[name] = round(number(accumulated[name]) + team.produzidoDia);
              team.produzidoAcumulado = accumulated[name];
              return team;
            });
            var totals = snap.equipes.reduce(function (sum, team) {
              sum.day += number(team.produzidoDia);
              sum.accumulated += number(team.produzidoAcumulado);
              sum.metaDay += number(team.metaDia);
              sum.metaAccumulated += number(team.metaAcumulada);
              return sum;
            }, { day: 0, accumulated: 0, metaDay: 0, metaAccumulated: 0 });
            history.push({ data: key.slice(0, 5), total: round(totals.day) });
            snap.totalProduzidoDia = round(totals.day);
            snap.totalProduzidoAcumulado = round(totals.accumulated);
            snap.totalMetaDia = round(totals.metaDay);
            snap.totalMetaAcumulada = round(totals.metaAccumulated);
            snap.historico = copy(history);
            snap.savedAt = new Date().toISOString();
            snap.projectId = pid();
            snap.config = Object.assign({}, snap.config || {}, { dataReferencia: key, diasLancados: businessUntil(key) });
            bank[key] = snap;
          });
        });
        return bank;
      }

      function applySnapshot(snapshot, key) {
        if (!snapshot) return false;
        try {
          var _comentariosVivos = (config && config.comentariosEquipe) || null;
          config = typeof normalizeConfigObject === 'function' ? normalizeConfigObject(copy(snapshot.config || {})) : copy(snapshot.config || {});
          config.dataReferencia = key;
          if (typeof window.ppMesclarComentarios === 'function') {
            var _comentarios = window.ppMesclarComentarios(_comentariosVivos, config.comentariosEquipe);
            if (Object.keys(_comentarios).length) config.comentariosEquipe = _comentarios;
          }
          equipes = copy(Array.isArray(snapshot.equipes) ? snapshot.equipes : []);
          historico = copy(Array.isArray(snapshot.historico) ? snapshot.historico : []);
          teamCards = copy(snapshot.teamCards || teamCards || {});
          teamCardTheme = copy(snapshot.teamCardTheme || teamCardTheme || {});
          try { localStorage.setItem('painel-produtividade-view-dia-graficos-v1-projetos::' + pid(), key); } catch (e) { }
          try { localStorage.setItem(storageKey(), JSON.stringify({ config: config, equipes: equipes, historico: historico, teamCards: teamCards, teamCardTheme: teamCardTheme })); } catch (e) { }
          try { if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(false); else if (typeof saveLocalSilent === 'function') saveLocalSilent(); } catch (e) { }
          try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
          try {
            if (typeof window.editorRows === 'function') window.editorRows();
            else if (typeof editorRows === 'function') editorRows();
          } catch (e) {
            console.error('[Produção por período] Falha ao atualizar os campos do editor.', e);
            return false;
          }
          return true;
        } catch (e) {
          console.error('[Produção por período] Falha ao aplicar snapshot.', e);
          return false;
        }
      }

      function applyFallback(bank, preferred) {
        var keys = Object.keys(bank || {}).filter(function (key) { return !!dateParts(key); }).sort(compareDates);
        var key = preferred && bank[preferred] ? preferred : keys[keys.length - 1];
        if (key) {
          var parsed = dateParts(key);
          selection.month = parsed ? parsed.month : '';
          selection.day = key;
          applySnapshot(bank[key], key);
          return;
        }
        equipes = [];
        historico = [];
        config = typeof normalizeConfigObject === 'function' ? normalizeConfigObject(config || {}) : (config || {});
        config.dataReferencia = '';
        window.__ppIntentionalClear = true;
        try { if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true); else if (typeof saveLocalSilent === 'function') saveLocalSilent(); }
        catch (e) { }
        finally { window.__ppIntentionalClear = false; }
        try { if (typeof renderAll === 'function') renderAll(); if (typeof editorRows === 'function') editorRows(); } catch (e) { }
      }

      function ensureCard() {
        var aside = document.querySelector('#modalBg .modal-body aside');
        if (!aside) return null;
        var card = el('ppProductionPeriodCard');
        if (!card) {
          card = document.createElement('div');
          card.className = 'editor-card';
          card.id = 'ppProductionPeriodCard';
          card.innerHTML =
            '<h3>PRODUÇÃO POR MÊS E DIA</h3>' +
            '<p class="bank-info">Selecione um período e um dia para carregar, editar, zerar ou excluir a produção. Metas, equipes e dados financeiros são preservados.</p>' +
            '<div class="form-grid"><div class="field"><label>Mês</label><select id="ppProdPeriodMonth" onchange="ppProductionPeriodMonthChanged(this.value)"></select></div>' +
            '<div class="field"><label>Dia</label><select id="ppProdPeriodDay" onchange="ppProductionPeriodDayChanged(this.value)"></select></div></div>' +
            '<p class="bank-info" id="ppProdPeriodInfo">Nenhum fechamento disponível.</p>' +
            '<div class="editor-actions pp-prod-acoes" style="margin-top:8px">' +
            '<button class="btn btn-navy" onclick="ppLoadProductionPeriodDay()">Carregar dia no editor</button>' +
            '<button class="btn btn-green" onclick="ppSaveProductionPeriodDay()">Salvar produção do dia</button>' +
            '<button class="btn btn-orange" onclick="ppClearProductionPeriodDay()">Apagar produção diária</button>' +
            '<button class="btn btn-red" onclick="ppDeleteProductionPeriodDay()">Excluir dia selecionado</button>' +
            '<button class="btn btn-red" onclick="ppDeleteProductionPeriodMonth()">Excluir período selecionado</button>' +
            '<button class="btn btn-white" onclick="ppUndoProductionPeriodDelete()">Desfazer última exclusão</button></div>';
          aside.insertBefore(card, aside.firstChild);
        }
        return card;
      }

      function refresh() {
        var card = ensureCard();
        if (!card) return;
        var currentPid = pid();
        if (selection.pid !== currentPid) selection = { pid: currentPid, month: '', day: '' };
        var bank = readBank();
        var months = allMonths(bank);
        if (!selection.month || months.indexOf(selection.month) < 0) {
          var currentDate = dateParts((config && config.dataReferencia) || '');
          selection.month = currentDate && months.indexOf(currentDate.month) >= 0 ? currentDate.month : (months[0] || '');
        }
        var monthSelect = el('ppProdPeriodMonth');
        var daySelect = el('ppProdPeriodDay');
        if (!monthSelect || !daySelect) return;
        monthSelect.innerHTML = months.length ? months.map(function (month) { return '<option value="' + month + '">' + monthLabel(month) + '</option>'; }).join('') : '<option value="">Nenhum período</option>';
        monthSelect.value = selection.month;
        var days = selection.month ? monthKeys(bank, selection.month).reverse() : [];
        if (!selection.day || days.indexOf(selection.day) < 0) selection.day = days[0] || '';
        daySelect.innerHTML = days.length ? days.map(function (day) { return '<option value="' + day + '">' + day + '</option>'; }).join('') : '<option value="">Nenhum dia</option>';
        daySelect.value = selection.day;
        var info = el('ppProdPeriodInfo');
        var snap = selection.day ? bank[selection.day] : null;
        if (info) info.textContent = snap
          ? projectName() + ' · ' + selection.day + ' · ' + (snap.equipes || []).length + ' equipe(s) · produção do dia ' + money(snap.totalProduzidoDia)
          : 'Nenhum fechamento disponível para o período selecionado.';
        try {
          if (typeof window.aplReinitSelects === 'function') window.aplReinitSelects();
          if (typeof window.aplSyncSelectEl === 'function') {
            window.aplSyncSelectEl(monthSelect);
            window.aplSyncSelectEl(daySelect);
          }
        } catch (e) { }
      }
      window.ppRefreshProductionPeriodEditor = refresh;

      function loadSelectedDay(showInvalidAlert) {
        var bank = readBank(), key = selection.day;
        if (!key || !bank[key]) {
          if (showInvalidAlert) alert('Selecione um dia válido.');
          return false;
        }
        var applied = applySnapshot(bank[key], key);
        refresh();
        return applied;
      }

      window.ppProductionPeriodMonthChanged = function (month) {
        selection.month = month || '';
        selection.day = '';
        refresh();
      };
      window.ppProductionPeriodDayChanged = function (day) {
        selection.day = day || '';
        refresh();
      };
      window.ppLoadProductionPeriodDay = function () {
        loadSelectedDay(true);
      };

      document.addEventListener('input', function (event) {
        var target = event && event.target;
        var match = target && String(target.id || '').match(/^eqMetaMes(\d+)$/);
        if (!match) return;
        var index = Number(match[1]);
        if (!Array.isArray(equipes) || !equipes[index]) return;
        var targets = calculateTargets(target.value, config && config.diasUteisMes, config && config.diasLancados);
        equipes[index] = Object.assign({}, equipes[index], targets);
        var dayInput = el('eqMetaDia' + index);
        var accumulatedInput = el('eqMetaAcum' + index);
        if (dayInput) dayInput.value = targets.metaDia;
        if (accumulatedInput) accumulatedInput.value = targets.metaAcumulada;
        try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
      }, true);

      window.ppSaveProductionPeriodDay = function () {
        var bank = readBank(), key = selection.day;
        if (!key || !bank[key]) { alert('Selecione e carregue um dia antes de salvar.'); return; }
        if (String((config && config.dataReferencia) || '').trim() !== key) {
          alert('O dia selecionado ainda não está carregado na tabela. Clique em “Carregar dia no editor” antes de salvar.');
          return;
        }
        try { if (typeof collectEditor === 'function') collectEditor(); } catch (e) { }
        var edited = {};
        (Array.isArray(equipes) ? equipes : []).forEach(function (team) {
          var name = String(team.equipe || '').trim().toUpperCase();
          if (name) edited[name] = team;
        });
        var businessDaysMonth = Math.max(1, number(config && config.diasUteisMes) || 21);
        var snap = copy(bank[key]);
        snap.equipes = (Array.isArray(snap.equipes) ? snap.equipes : []).map(function (team) {
          var name = String(team.equipe || '').trim().toUpperCase();
          return edited[name] ? Object.assign({}, team, { produzidoDia: round(edited[name].produzidoDia) }) : team;
        });
        bank[key] = snap;
        monthKeys(bank, selection.month).forEach(function (dayKey) {
          var daySnapshot = copy(bank[dayKey] || {});
          var elapsed = businessUntil(dayKey);
          daySnapshot.config = Object.assign({}, daySnapshot.config || {}, {
            diasUteisMes: businessDaysMonth,
            diasLancados: elapsed
          });
          daySnapshot.equipes = (Array.isArray(daySnapshot.equipes) ? daySnapshot.equipes : []).map(function (team) {
            var name = String(team.equipe || '').trim().toUpperCase();
            if (!edited[name]) return team;
            return Object.assign({}, team, calculateTargets(edited[name].metaMes, businessDaysMonth, elapsed));
          });
          bank[dayKey] = daySnapshot;
        });
        bank = rebuildAccumulated(bank, [selection.month]);
        writeBank(bank);
        applyFallback(bank, key);
        refresh();
        alert('Produção de ' + key + ' e metas de ' + monthLabel(selection.month) + ' salvas. Os acumulados foram recalculados e a sincronização com o Firebase foi iniciada.');
      };
      window.ppClearProductionPeriodDay = function () {
        var bank = readBank(), key = selection.day;
        if (!key || !bank[key]) { alert('Selecione um dia válido.'); return; }
        var count = (bank[key].equipes || []).length;
        if (!confirm('Apagar a produção diária de todas as ' + count + ' equipe(s) em ' + key + ' no projeto ' + projectName() + '?\n\nA data, as equipes e as metas serão mantidas.')) return;
        backup(bank, 'apagar produção diária de ' + key);
        bank[key].equipes = (bank[key].equipes || []).map(function (team) { return Object.assign({}, team, { produzidoDia: 0 }); });
        bank = rebuildAccumulated(bank, [selection.month]);
        writeBank(bank);
        applyFallback(bank, key);
        refresh();
        alert('Produção diária apagada e acumulados recalculados. Alteração enviada ao Firebase.');
      };
      window.ppDeleteProductionPeriodDay = function () {
        var bank = readBank(), key = selection.day;
        if (!key || !bank[key]) { alert('Selecione um dia válido.'); return; }
        var typed = prompt('Para excluir completamente ' + key + ' do projeto ' + projectName() + ', digite EXCLUIR:');
        if (String(typed || '').trim().toUpperCase() !== 'EXCLUIR') { if (typed !== null) alert('Confirmação incorreta. Nenhum dado foi apagado.'); return; }
        backup(bank, 'excluir dia ' + key);
        delete bank[key];
        bank = rebuildAccumulated(bank, [selection.month]);
        writeBank(bank);
        selection.day = '';
        applyFallback(bank, null);
        refresh();
        alert('Dia ' + key + ' excluído localmente e no Firebase. Os acumulados posteriores foram recalculados.');
      };
      window.ppDeleteProductionPeriodMonth = function () {
        var bank = readBank(), month = selection.month;
        var keys = month ? monthKeys(bank, month) : [];
        if (!month || !keys.length) { alert('Selecione um período com dados.'); return; }
        var confirmation = 'APAGAR ' + monthLabel(month);
        var typed = prompt('Esta ação excluirá ' + keys.length + ' dia(s) do período ' + monthLabel(month) + ' no projeto ' + projectName() + '.\n\nDigite ' + confirmation + ' para confirmar:');
        if (String(typed || '').trim().toUpperCase() !== confirmation) { if (typed !== null) alert('Confirmação incorreta. Nenhum dado foi apagado.'); return; }
        backup(bank, 'excluir período ' + monthLabel(month));
        keys.forEach(function (key) { delete bank[key]; });
        writeBank(bank);
        selection.month = '';
        selection.day = '';
        applyFallback(bank, null);
        refresh();
        alert('Período ' + monthLabel(month) + ' excluído localmente e no Firebase.');
      };
      window.ppUndoProductionPeriodDelete = function () {
        var raw = null;
        try { raw = localStorage.getItem(BACKUP_KEY + '::' + pid()); } catch (e) { }
        if (!raw) { alert('Não existe exclusão recente para desfazer neste projeto.'); return; }
        var saved;
        try { saved = JSON.parse(raw); } catch (e) { alert('O backup de recuperação está inválido.'); return; }
        if (!saved.bank || !confirm('Restaurar o estado anterior a: ' + (saved.action || 'última exclusão') + '?')) return;
        var bank = copy(saved.bank);
        writeBank(bank);
        applyFallback(bank, null);
        try { localStorage.removeItem(BACKUP_KEY + '::' + pid()); } catch (e) { }
        refresh();
        alert('Dados restaurados localmente e enviados novamente ao Firebase.');
      };

      var oldOpenEditor = window.openEditor;
      if (typeof oldOpenEditor === 'function') {
        window.openEditor = function () {
          var result = oldOpenEditor.apply(this, arguments);
          refresh();
          return result;
        };
        try { openEditor = window.openEditor; } catch (e) { }
      }
      var oldEditorRows = window.editorRows;
      if (typeof oldEditorRows === 'function') {
        window.editorRows = function () {
          var result = oldEditorRows.apply(this, arguments);
          refresh();
          return result;
        };
        try { editorRows = window.editorRows; } catch (e) { }
      }
      setTimeout(refresh, 1200);
    })();
