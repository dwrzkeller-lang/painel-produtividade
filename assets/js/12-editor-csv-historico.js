    (function () {
      if (window.__ppEditorCsvHistoricoPatch) return;
      window.__ppEditorCsvHistoricoPatch = true;

      var CSV_LEDGER_KEY_BASE = 'painel-produtividade-csv-producao-ledger-v1-projetos';
      var VIEW_MODE_KEY_BASE = 'painel-produtividade-view-dia-graficos-v1-projetos';
      var selectedViewMode = null;
      var applyingView = false;

      function toN(v) {
        try { return (typeof n === 'function') ? n(v) : Number(v || 0); }
        catch (e) { var x = Number(v || 0); return Number.isFinite(x) ? x : 0; }
      }
      function r2(v) { v = toN(v); return Math.round((v + Number.EPSILON) * 100) / 100; }
      function c(obj) { try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; } }
      function esc(v) { try { return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); } catch (e) { return String(v ?? ''); } }
      function moneyFmt(v) { try { return (typeof money === 'function') ? money(v) : Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } catch (e) { return 'R$ ' + r2(v); } }
      function dailyBankStorageKey(projectId) { return (typeof DAILY_BANK_KEY_BASE !== 'undefined' ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos') + '::' + (projectId || currentProjectId); }
      function stateStorageKey(projectId) { return (typeof STORAGE_KEY_BASE !== 'undefined' ? STORAGE_KEY_BASE : 'painel-produtividade-produtividade-editavel-v8-projetos') + '::' + (projectId || currentProjectId); }
      function csvLedgerKey(projectId) { return CSV_LEDGER_KEY_BASE + '::' + (projectId || currentProjectId); }
      function viewKey(projectId) { return VIEW_MODE_KEY_BASE + '::' + (projectId || currentProjectId); }
      function readJson(k, fallback) { try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } }
      function writeJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
      function currentProjectName() { try { var p = projectById(currentProjectId); return (p && p.nome) || currentProjectId || 'Projeto'; } catch (e) { return currentProjectId || 'Projeto'; } }
      function safeFilename(s) { return String(s || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 90) || 'arquivo'; }
      function norm(s) { try { return normalizeHeader(s); } catch (e) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim(); } }
      function parseMoney(v) { try { return (typeof parseMoneyInput === 'function') ? parseMoneyInput(v) : Number(String(v || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0; } catch (e) { return 0; } }
      function parseRows(text) { try { return (typeof parseCsv === 'function') ? parseCsv(text) : []; } catch (e) { return []; } }
      function fmtDateKey(date) {
        if (!date || Number.isNaN(date.getTime())) return '';
        var dd = String(date.getDate()).padStart(2, '0');
        var mm = String(date.getMonth() + 1).padStart(2, '0');
        var yy = date.getFullYear();
        return dd + '/' + mm + '/' + yy;
      }
      function shortDate(key) {
        var p = parseDateFlexible(key);
        return p ? String(p.day).padStart(2, '0') + '/' + String(p.month).padStart(2, '0') : String(key || '').slice(0, 5);
      }
      function parseDateFlexible(value) {
        var s = String(value || '').trim();
        if (!s) return null;
        var y0 = new Date().getFullYear();
        try {
          var ref = String((config && config.dataReferencia) || '');
          var rm = ref.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
          if (rm) y0 = rm[3].length === 2 ? 2000 + Number(rm[3]) : Number(rm[3]);
        } catch (e) { }
        var m = s.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
        if (m) {
          var day = Number(m[1]), month = Number(m[2]), year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : y0;
          var d = new Date(year, month - 1, day);
          if (d && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return { date: d, key: fmtDateKey(d), short: String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0'), year: year, month: month, day: day, ym: String(month).padStart(2, '0') + '/' + year, time: d.getTime() };
        }
        var iso = s.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
        if (iso) {
          var year2 = Number(iso[1]), month2 = Number(iso[2]), day2 = Number(iso[3]);
          var d2 = new Date(year2, month2 - 1, day2);
          if (d2 && d2.getFullYear() === year2 && d2.getMonth() === month2 - 1 && d2.getDate() === day2) return { date: d2, key: fmtDateKey(d2), short: String(day2).padStart(2, '0') + '/' + String(month2).padStart(2, '0'), year: year2, month: month2, day: day2, ym: String(month2).padStart(2, '0') + '/' + year2, time: d2.getTime() };
        }
        return null;
      }
      function dateSort(a, b) {
        var pa = parseDateFlexible(a), pb = parseDateFlexible(b);
        var ta = pa ? pa.time : Date.parse(a || '') || 0;
        var tb = pb ? pb.time : Date.parse(b || '') || 0;
        return ta - tb;
      }
      function findCol(headers, candidates) {
        var h = headers.map(norm);
        for (var i = 0; i < candidates.length; i++) {
          var c0 = norm(candidates[i]);
          var idx = h.indexOf(c0);
          if (idx >= 0) return idx;
        }
        for (var j = 0; j < candidates.length; j++) {
          var c = norm(candidates[j]);
          var idx2 = h.findIndex(function (x) { return x.indexOf(c) >= 0 || c.indexOf(x) >= 0; });
          if (idx2 >= 0) return idx2;
        }
        return -1;
      }
      function resolveProductionColumns(header) {
        return {
          equipe: findCol(header, ['equipe', 'cod equipe', 'codigo equipe', 'prefixo', 'turma', 'time', 'equipe executora', 'equipe responsavel']),
          data: findCol(header, ['data', 'data execucao', 'data execução', 'data servico', 'data serviço', 'data producao', 'data produção', 'data referencia', 'data ref', 'dia']),
          valor: findCol(header, ['valor', 'valor bruto', 'valorbruto', 'produção', 'producao', 'prod dia', 'produzido', 'produzido dia', 'receita', 'faturamento', 'total', 'valor servico', 'valor serviço', 'valor faturado', 'valor liquido', 'valor líquido']),
          metaMes: findCol(header, ['meta mês', 'meta mes', 'metames', 'meta mensal']),
          metaDia: findCol(header, ['meta dia', 'metadia', 'meta diária', 'meta diaria']),
          metaAcum: findCol(header, ['meta acum', 'meta acumulada', 'metaacumulada']),
          servico: findCol(header, ['servico', 'serviço', 'atividade', 'descricao', 'descrição', 'tipo'])
        };
      }
      function looksLikeProductionCsv(matrix) {
        if (!matrix || matrix.length < 2) return false;
        var h = matrix[0].map(norm).join('|');
        return /(data|dia)/.test(h) && /(equipe|turma|prefixo|time)/.test(h) && /(valor|producao|produzido|receita|faturamento|total)/.test(h);
      }
      function getCurrentState() {
        return { config: c(config || {}), equipes: Array.isArray(equipes) ? c(equipes) : [], historico: Array.isArray(historico) ? c(historico) : [], teamCards: c(window.teamCards || teamCards || {}), teamCardTheme: c(window.teamCardTheme || teamCardTheme || {}) };
      }
      function calcTotalsFromTeams(rows) {
        return (rows || []).reduce(function (a, d) {
          a.metaMes += toN(d.metaMes); a.metaDia += toN(d.metaDia); a.metaAcumulada += toN(d.metaAcumulada); a.produzidoDia += toN(d.produzidoDia); a.produzidoAcumulado += toN(d.produzidoAcumulado); return a;
        }, { metaMes: 0, metaDia: 0, metaAcumulada: 0, produzidoDia: 0, produzidoAcumulado: 0 });
      }
      function businessUntil(dateObj) {
        try { if (typeof countBusinessUntil === 'function') return countBusinessUntil(dateObj); } catch (e) { }
        if (!dateObj) return toN(config && config.diasLancados) || 1;
        var count = 0;
        for (var d = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1); d <= dateObj; d.setDate(d.getDate() + 1)) {
          var day = d.getDay(); if (day !== 0 && day !== 6) count++;
        }
        return Math.max(1, count);
      }
      function businessMonth(dateObj) {
        try { if (typeof countBusinessInMonth === 'function') return countBusinessInMonth(dateObj); } catch (e) { }
        if (!dateObj) return toN(config && config.diasUteisMes) || 21;
        var count = 0;
        var last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
        for (var i = 1; i <= last; i++) { var d = new Date(dateObj.getFullYear(), dateObj.getMonth(), i); var day = d.getDay(); if (day !== 0 && day !== 6) count++; }
        return Math.max(1, count);
      }
      function buildProductionImportState(records, sourceFile) {
        var cfg = c(config || {});
        var existingMap = {};
        (Array.isArray(equipes) ? equipes : []).forEach(function (t) { existingMap[String(t.equipe || '').trim()] = c(t); });
        var byTeamDate = {};
        var totalsByDate = {};
        var metaFromCsv = {};
        records.forEach(function (r) {
          var team = String(r.equipe || '').trim(); if (!team) return;
          var key = r.dateKey || ((cfg && cfg.dataReferencia) || new Date().toLocaleDateString('pt-BR'));
          byTeamDate[team] = byTeamDate[team] || {};
          byTeamDate[team][key] = r2((byTeamDate[team][key] || 0) + toN(r.valor));
          totalsByDate[key] = r2((totalsByDate[key] || 0) + toN(r.valor));
          if (r.metaMes || r.metaDia || r.metaAcum) { metaFromCsv[team] = Object.assign(metaFromCsv[team] || {}, { metaMes: r.metaMes, metaDia: r.metaDia, metaAcumulada: r.metaAcum }); }
        });
        var dates = Object.keys(totalsByDate).sort(dateSort);
        var refParsed = parseDateFlexible(cfg.dataReferencia || '');
        var refKey = refParsed ? refParsed.key : (cfg.dataReferencia || '');
        var selectedKey = (refKey && dates.indexOf(refKey) >= 0) ? refKey : (dates[dates.length - 1] || refKey || new Date().toLocaleDateString('pt-BR'));
        var selectedParsed = parseDateFlexible(selectedKey);
        if (selectedParsed) { cfg.dataReferencia = selectedParsed.key; cfg.diasLancados = businessUntil(selectedParsed.date); cfg.diasUteisMes = businessMonth(selectedParsed.date); }
        else cfg.dataReferencia = selectedKey;

        var teams = Array.from(new Set(Object.keys(existingMap).concat(Object.keys(byTeamDate)))).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { numeric: true }); });
        var selectedTime = selectedParsed ? selectedParsed.time : Infinity;
        var selectedYm = selectedParsed ? selectedParsed.ym : '';
        var updatedTeams = teams.map(function (team) {
          var base = existingMap[team] || { equipe: team, metaMes: 0, metaAcumulada: 0, metaDia: 0, produzidoDia: 0, produzidoAcumulado: 0 };
          var metaCsv = metaFromCsv[team] || {};
          var metaMes = toN(metaCsv.metaMes || base.metaMes);
          var metaDia = toN(metaCsv.metaDia || base.metaDia || (cfg.diasUteisMes ? metaMes / toN(cfg.diasUteisMes) : 0));
          var metaAcum = toN(metaCsv.metaAcumulada || base.metaAcumulada || (metaDia * (toN(cfg.diasLancados) || 1)));
          var perDate = byTeamDate[team] || {};
          var prodDia = toN(perDate[selectedKey]);
          var prodAcum = Object.keys(perDate).reduce(function (sum, k) {
            var p = parseDateFlexible(k);
            if (selectedParsed && p) {
              if (p.ym !== selectedYm || p.time > selectedTime) return sum;
            }
            return sum + toN(perDate[k]);
          }, 0);
          return { equipe: team, metaMes: r2(metaMes), metaAcumulada: r2(metaAcum), metaDia: r2(metaDia), produzidoDia: r2(prodDia), produzidoAcumulado: r2(prodAcum) };
        });
        var hist = dates.map(function (k) { return { data: shortDate(k), total: r2(totalsByDate[k]) }; });
        return { config: cfg, equipes: updatedTeams, historico: hist, dates: dates, byTeamDate: byTeamDate, totalsByDate: totalsByDate, selectedKey: selectedKey, sourceFile: sourceFile || 'csv-producao' };
      }
      function writeSnapshotsFromProduction(state) {
        var bank = readJson(dailyBankStorageKey(currentProjectId), {});
        var dates = state.dates || [];
        var byTeamDate = state.byTeamDate || {};
        var teams = state.equipes || [];
        dates.forEach(function (dateKey) {
          var parsed = parseDateFlexible(dateKey);
          var time = parsed ? parsed.time : Infinity;
          var ym = parsed ? parsed.ym : '';
          var cfg = c(state.config || {});
          cfg.dataReferencia = parsed ? parsed.key : dateKey;
          if (parsed) { cfg.diasLancados = businessUntil(parsed.date); cfg.diasUteisMes = businessMonth(parsed.date); }
          var snapTeams = teams.map(function (t) {
            var per = byTeamDate[t.equipe] || {};
            var dayVal = toN(per[dateKey]);
            var accum = Object.keys(per).reduce(function (sum, k) {
              var p = parseDateFlexible(k);
              if (parsed && p) { if (p.ym !== ym || p.time > time) return sum; }
              return sum + toN(per[k]);
            }, 0);
            var metaDia = toN(t.metaDia || (toN(t.metaMes) / Math.max(1, toN(cfg.diasUteisMes))));
            var metaAcum = r2(metaDia * Math.max(1, toN(cfg.diasLancados)));
            return { equipe: t.equipe, metaMes: r2(t.metaMes), metaDia: r2(metaDia), metaAcumulada: metaAcum, produzidoDia: r2(dayVal), produzidoAcumulado: r2(accum) };
          });
          var totals = calcTotalsFromTeams(snapTeams);
          bank[dateKey] = {
            savedAt: new Date().toISOString(), source: 'csv-producao', sourceFile: state.sourceFile || '', projectId: currentProjectId,
            title: (cfg && cfg.titulo) || '', totalProduzidoDia: totals.produzidoDia, totalProduzidoAcumulado: totals.produzidoAcumulado, totalMetaDia: totals.metaDia, totalMetaAcumulada: totals.metaAcumulada,
            config: cfg, equipes: snapTeams, historico: dates.filter(function (k) { return !parsed || !parseDateFlexible(k) || parseDateFlexible(k).time <= time; }).map(function (k) { return { data: shortDate(k), total: r2(state.totalsByDate[k]) }; }), teamCards: c(teamCards || {}), teamCardTheme: c(teamCardTheme || {})
          };
        });
        writeJson(dailyBankStorageKey(currentProjectId), bank);
        return bank;
      }
      function appendCsvLedger(records, fileName) {
        var ledger = readJson(csvLedgerKey(currentProjectId), { projectId: currentProjectId, imports: [], rows: [] });
        var now = new Date().toISOString();
        ledger.projectId = currentProjectId;
        ledger.imports = ledger.imports || [];
        ledger.rows = ledger.rows || [];
        ledger.imports.push({ importedAt: now, fileName: fileName || '', rowCount: records.length });
        records.forEach(function (r) { ledger.rows.push(Object.assign({ importedAt: now, fileName: fileName || '' }, r)); });
        if (ledger.rows.length > 12000) ledger.rows = ledger.rows.slice(ledger.rows.length - 12000);
        if (ledger.imports.length > 80) ledger.imports = ledger.imports.slice(ledger.imports.length - 80);
        writeJson(csvLedgerKey(currentProjectId), ledger);
        return ledger;
      }
      function parseProductionRecords(text, fileName) {
        var matrix = parseRows(text);
        if (!looksLikeProductionCsv(matrix)) return null;
        var header = matrix[0];
        var cols = resolveProductionColumns(header);
        if (cols.equipe < 0 || cols.data < 0 || cols.valor < 0) return null;
        var rows = matrix.slice(1);
        var records = [];
        rows.forEach(function (row, i) {
          var team = String(row[cols.equipe] || '').trim();
          var dateRaw = String(row[cols.data] || '').trim();
          var valor = parseMoney(row[cols.valor]);
          if (!team || !dateRaw || !Number.isFinite(valor)) return;
          var parsed = parseDateFlexible(dateRaw);
          var dateKey = parsed ? parsed.key : dateRaw;
          records.push({ equipe: team, dataOriginal: dateRaw, dateKey: dateKey, valor: r2(valor), servico: cols.servico >= 0 ? String(row[cols.servico] || '').trim() : '', metaMes: cols.metaMes >= 0 ? parseMoney(row[cols.metaMes]) : 0, metaDia: cols.metaDia >= 0 ? parseMoney(row[cols.metaDia]) : 0, metaAcum: cols.metaAcum >= 0 ? parseMoney(row[cols.metaAcum]) : 0, rowIndex: i + 2 });
        });
        return records.length ? records : null;
      }
      function importProductionCsvText(text, fileName) {
        var records = parseProductionRecords(text, fileName);
        if (!records) return false;
        try { if (typeof collectEditor === 'function' && document.getElementById('modalBg') && document.getElementById('modalBg').classList.contains('open')) collectEditor(); } catch (e) { }
        var imported = buildProductionImportState(records, fileName);
        config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(imported.config) : imported.config;
        equipes = imported.equipes;
        historico = imported.historico;
        appendCsvLedger(records, fileName);
        writeSnapshotsFromProduction(imported);
        try { saveLocalSilent(); } catch (e) { try { localStorage.setItem(stateStorageKey(currentProjectId), JSON.stringify(getCurrentState())); } catch (_e) { } }
        selectedViewMode = imported.selectedKey;
        try { localStorage.setItem(viewKey(currentProjectId), selectedViewMode); } catch (e) { }
        try { if (typeof editorRows === 'function') editorRows(); } catch (e) { }
        try { updateDailyBankSelect(imported.selectedKey); } catch (e) { }
        try { renderAll(); } catch (e) { }
        var dupMsg = 'CSV de produção importado. Linhas com a mesma equipe e mesma data foram somadas automaticamente.';
        alert(dupMsg + '\n\n' + records.length + ' linha(s) lida(s) · ' + imported.equipes.length + ' equipe(s) · data exibida: ' + imported.selectedKey + '.');
        return true;
      }

      var oldImportCsvText = window.importCsvText;
      window.importCsvText = function (text) {
        var ok = false;
        try { ok = importProductionCsvText(text, window.__ppLastCsvFileName || 'csv-producao'); } catch (e) { console.error('Falha no importador CSV produção, tentando modelo antigo.', e); ok = false; }
        if (ok) return;
        if (typeof oldImportCsvText === 'function') return oldImportCsvText.apply(this, arguments);
        alert('CSV inválido. Use o modelo de produção: Data; Equipe; Serviço; Valor bruto.');
      };
      window.importCsvFile = function (event) {
        var file = event && event.target && event.target.files && event.target.files[0];
        if (!file) return;
        window.__ppLastCsvFileName = file.name || 'csv-producao';
        var reader = new FileReader();
        reader.onload = function () { window.importCsvText(reader.result); };
        reader.onerror = function () { alert('Não foi possível ler o arquivo CSV.'); };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
      };

      window.downloadCsvTemplate = function () {
        var rows = [
          ['Data', 'Equipe', 'Encarregado', 'Serviço', 'Valor bruto', 'Meta mês', 'Meta dia', 'Base', 'Observação'],
          ['19/06/2026', 'EQP-01', '', 'Serviço A', '2500', '175000', '8333,33', 'BASE CENTRAL', 'Exemplo 1'],
          ['19/06/2026', 'EQP-01', '', 'Serviço B', '1800', '175000', '8333,33', 'BASE CENTRAL', 'Exemplo 2 - soma no mesmo dia/equipe'],
          ['20/06/2026', 'EQP-11', '', 'Serviço C', '5000', '105000', '5000', 'BASE CENTRAL', 'Exemplo histórico']
        ];
        var csv = rows.map(function (row) { return row.map(function (value) { return (typeof csvEscape === 'function') ? csvEscape(value) : String(value); }).join(';'); }).join('\r\n');
        var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'modelo-csv-producao-pp.csv';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 250);
      };

      function getViewMode() {
        if (selectedViewMode === null) { try { selectedViewMode = localStorage.getItem(viewKey(currentProjectId)) || '__current'; } catch (e) { selectedViewMode = '__current'; } }
        return selectedViewMode || '__current';
      }
      function setViewMode(mode) {
        selectedViewMode = mode || '__current';
        try { localStorage.setItem(viewKey(currentProjectId), selectedViewMode); } catch (e) { }
        renderAll();
      }
      window.ppSetDashboardViewDay = setViewMode;
      function getDailyBankForCurrent() { return readJson(dailyBankStorageKey(currentProjectId), {}); }
      function monthKeyFromDateKey(k) { var p = parseDateFlexible(k); return p ? p.ym : ''; }
      function getSnapshotForMode(mode) {
        if (!mode || mode === '__current' || String(mode).indexOf('__month:') === 0) return null;
        var bank = getDailyBankForCurrent();
        var snap = bank[mode];
        if (!snap) return null;
        return { config: c(snap.config || config || {}), equipes: c(snap.equipes || []), historico: c(snap.historico || historico || []), teamCards: c(snap.teamCards || teamCards || {}), teamCardTheme: c(snap.teamCardTheme || teamCardTheme || {}) };
      }
      function ensureGraphViewControls() {
        document.querySelectorAll('.bottom .panel-head .pp-head-tools').forEach(function (el) { el.remove(); });
      }
      function monthChartData(mode) {
        if (!mode || String(mode).indexOf('__month:') !== 0) return null;
        var month = String(mode).replace('__month:', '');
        var bank = getDailyBankForCurrent();
        var keys = Object.keys(bank).filter(function (k) { return monthKeyFromDateKey(k) === month; }).sort(dateSort);
        if (!keys.length) return null;
        var hist = keys.map(function (k) { var snap = bank[k] || {}; return { data: shortDate(k), total: toN(snap.totalProduzidoDia) }; });
        var teamMap = {};
        keys.forEach(function (k) { ((bank[k] && bank[k].equipes) || []).forEach(function (t) { var name = String(t.equipe || '').trim(); if (!name) return; teamMap[name] = r2((teamMap[name] || 0) + toN(t.produzidoDia)); }); });
        var teams = Object.keys(teamMap).map(function (e) { return { equipe: e, produzidoDia: teamMap[e] }; }).sort(function (a, b) { return b.produzidoDia - a.produzidoDia; }).slice(0, 12);
        return { historico: hist, teams: teams, month: month };
      }
      function renderMonthBottomChartsIfNeeded() {
        var mode = getViewMode();
        var md = monthChartData(mode);
        if (!md || !window.Chart || applyingView) return;
        try {
          if (charts && charts.historico) { charts.historico.destroy(); charts.historico = null; }
          if (charts && charts.equipeDia) { charts.equipeDia.destroy(); charts.equipeDia = null; }
          var histMax = Math.max(0, ...md.historico.map(function (h) { return toN(h.total); }));
          var histYMax = Math.ceil((histMax * 1.18) / 10000) * 10000 || 10000;
          charts.historico = new Chart(document.getElementById('chartHistorico'), {
            type: 'bar', data: { labels: md.historico.map(function (h) { return histLabel(h.data); }), datasets: [{ label: 'Produção do dia', data: md.historico.map(function (h) { return toN(h.total); }), backgroundColor: '#1F6FB2', borderRadius: 6, maxBarThickness: 42, valueFormat: 'currencyK', valueFontSize: 10.8 }] },
            options: { ...baseOptions, layout: { padding: { top: 24, right: 6 } }, plugins: { ...baseOptions.plugins, legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9, weight: '700' } } }, y: { beginAtZero: true, min: 0, max: histYMax, grid: { color: '#EDEFF2' }, ticks: { font: { size: 8.5 }, callback: function (v) { return 'R$ ' + Math.round(v / 1000) + ' mil'; } } } } }, plugins: [barValuePlugin]
          });
          charts.equipeDia = new Chart(document.getElementById('chartEquipeDia'), {
            type: 'bar', data: { labels: md.teams.map(function (d) { return d.equipe; }), datasets: [{ data: md.teams.map(function (d) { return d.produzidoDia; }), backgroundColor: '#1F6FB2', borderRadius: 5, maxBarThickness: 34, valueFormat: 'currencyK', valueFontSize: 10.8 }] },
            options: { ...baseOptions, layout: { padding: { top: 26, right: 4 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 8.7, weight: '800' }, maxRotation: 45, minRotation: 45 } }, y: { grid: { color: '#EDEFF2' }, ticks: { font: { size: 8.5 }, callback: function (v) { return 'R$ ' + Math.round(v / 1000) + ' mil'; } } } } }, plugins: [barValuePlugin]
          });
          var dataEquipe = document.getElementById('dataEquipe'); if (dataEquipe) dataEquipe.textContent = 'Mês ' + md.month;
        } catch (e) { console.warn('Filtro mensal dos gráficos ignorado.', e); }
      }

      var oldRenderAll = window.renderAll;
      window.renderAll = function () {
        if (applyingView || typeof oldRenderAll !== 'function') return oldRenderAll && oldRenderAll.apply(this, arguments);
        var mode = getViewMode();
        var snap = getSnapshotForMode(mode);
        if (snap) {
          applyingView = true;
          var oldConfig = config, oldEquipes = equipes, oldHistorico = historico, oldCards = teamCards, oldTheme = teamCardTheme;
          try {
            config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(snap.config || {}) : snap.config || {};
            config.titulo = oldConfig.titulo;
            config.clienteContrato = oldConfig.clienteContrato;
            config.identificacaoContrato = oldConfig.identificacaoContrato;
            equipes = Array.isArray(snap.equipes) ? snap.equipes : [];
            var _refYearView = String((snap.config || {}).dataReferencia || '').match(/(\d{4})$/)?.[1] || String(new Date().getFullYear());
            historico = Array.isArray(snap.historico) ? snap.historico.map(function (h) { return Object.assign({}, h, { data: (typeof normalizeHistoricoDate === 'function' ? normalizeHistoricoDate(h.data, _refYearView) : h.data) }); }) : [];
            teamCards = snap.teamCards || oldCards || teamCards || {};
            teamCardTheme = snap.teamCardTheme || oldTheme;
            oldRenderAll.apply(this, arguments);
          } finally {
            config = oldConfig; equipes = oldEquipes; historico = oldHistorico; teamCards = oldCards; teamCardTheme = oldTheme; applyingView = false;
          }
        } else {
          oldRenderAll.apply(this, arguments);
        }
        ensureGraphViewControls();
        renderMonthBottomChartsIfNeeded();
        updateEditorLeanMode();
      };

      function exportProjectBackup() {
        try { if (document.getElementById('modalBg') && document.getElementById('modalBg').classList.contains('open') && typeof collectEditor === 'function') collectEditor(); } catch (e) { }
        var state = getCurrentState();
        var payload = {
          tipo: 'pp-backup-completo-projeto', version: '2026-06-30-csv-historico-v1', exportedAt: new Date().toISOString(), projectId: currentProjectId, projectName: currentProjectName(), state: state,
          bancoDiario: readJson(dailyBankStorageKey(currentProjectId), {}), bancoCsvProducao: readJson(csvLedgerKey(currentProjectId), { projectId: currentProjectId, imports: [], rows: [] })
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'BACKUP_COMPLETO_' + safeFilename(payload.projectName) + '_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 250);
        alert('Backup completo do projeto gerado. Ele contém dados atuais, banco diário, histórico importado via CSV e configuração dos cards.');
      }
      window.ppExportBackupProjetoCompleto = exportProjectBackup;
      window.ppImportBackupProjetoCompletoFile = function (event) {
        var files = Array.from((event && event.target && event.target.files) || []);
        if (!files.length) return;
        var done = 0, ok = 0;
        files.forEach(function (file) {
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var payload = JSON.parse(reader.result);
              var pid = payload.projectId || (payload.state && payload.state.projectId) || currentProjectId;
              if (payload.tipo === 'pp-backup-completo-projeto') {
                if (payload.state) localStorage.setItem(stateStorageKey(pid), JSON.stringify(payload.state));
                if (payload.bancoDiario) writeJson(dailyBankStorageKey(pid), payload.bancoDiario);
                if (payload.bancoCsvProducao) writeJson(csvLedgerKey(pid), payload.bancoCsvProducao);
                ok++;
              } else if (typeof ppImportConsolidadoDiarioProjetoText === 'function') {
                ppImportConsolidadoDiarioProjetoText(reader.result); ok++;
              }
            } catch (e) { console.error('Falha ao importar backup', file.name, e); }
            done++; if (done === files.length) { if (ok) { try { loadProjectState(currentProjectId); } catch (e) { } try { renderAll(); if (typeof editorRows === 'function') editorRows(); } catch (e) { } alert(ok + ' arquivo(s) importado(s). O Acompanhamento Gerencial já pode usar os projetos disponíveis neste navegador.'); } else alert('Nenhum backup válido foi importado.'); }
          };
          reader.readAsText(file, 'utf-8');
        });
        event.target.value = '';
      };

      function ensureCsvBancoResumo() {
        return;
      }
      function updateEditorLeanMode() {
        var modal = document.getElementById('modalBg'); if (!modal) return;
        var hideIds = ['edFinYtd', 'edFinYtg', 'edFinBacklog'];
        hideIds.forEach(function (id) { var el = document.getElementById(id); var field = el && el.closest('.field'); if (field) field.style.display = 'none'; });
        var finCard = Array.from(document.querySelectorAll('#modalBg aside .editor-card')).find(function (c) { return /Executivo|Presidente/i.test((c.querySelector('h3') || {}).textContent || ''); });
        if (finCard) { var h = finCard.querySelector('h3'); if (h) h.textContent = 'Financeiro resumido'; var p = finCard.querySelector('p'); if (p) p.innerHTML = '<span class="pp-editor-badge">campos essenciais</span><br>Preencha forecast, projeção, custos e check de atualização.'; }
        ensureCsvBancoResumo();
      }
      function ensureFluxoEditorCard() {
        var aside = document.querySelector('#modalBg .modal-body aside'); if (!aside) return;
        var oldQuick = document.getElementById('ppEditorQuickCard');
        if (oldQuick) {
          var p = oldQuick.querySelector('p'); if (p) p.textContent = 'Fluxo recomendado: importar CSV de produção, aplicar no painel, salvar o dia e baixar o JSON/backup para consolidação.';
        }
        var card = document.getElementById('ppFluxoEditorCard');
        if (!card) {
          card = document.createElement('div'); card.className = 'editor-card'; card.id = 'ppFluxoEditorCard';
          card.innerHTML = '<h3>Fluxo diário do controller</h3>' +
            '<div class="pp-flow-steps"><div><b>1</b><span>Importe o <b>CSV de produção</b>. Se a mesma equipe tiver 2 serviços no mesmo dia, o painel soma automaticamente.</span></div><div><b>2</b><span>Confira data, dias lançados, metas e produção acumulada.</span></div><div><b>3</b><span>Clique em <b>Salvar fechamento</b> ou <b>Backup completo</b> e envie o JSON para o Acompanhamento Gerencial.</span></div></div>' +
            '<div class="editor-actions" style="grid-template-columns:1fr 1fr"><button class="btn btn-navy" onclick="triggerImportCsv()">Importar CSV produção</button><button class="btn btn-white" onclick="downloadCsvTemplate()">Modelo CSV</button><button class="btn btn-green" onclick="ppExportConsolidadoDiarioProjeto()">Salvar fechamento</button><button class="btn btn-orange" onclick="ppExportBackupProjetoCompleto()">Backup completo</button></div>' +
            '<input type="file" id="ppBackupImportFile" multiple accept=".json,application/json" style="display:none" onchange="ppImportBackupProjetoCompletoFile(event)">' +
            '<div class="editor-actions" style="margin-top:7px;grid-template-columns:1fr"><button class="btn btn-navy" onclick="document.getElementById(\'ppBackupImportFile\').click()">Importar um ou vários backups</button></div>';
          aside.insertBefore(card, aside.firstChild);
        }
      }
      var oldOpenEditor = window.openEditor;
      window.openEditor = function () {
        selectedViewMode = '__current'; try { localStorage.setItem(viewKey(currentProjectId), '__current'); } catch (e) { }
        var r = oldOpenEditor && oldOpenEditor.apply(this, arguments);
        setTimeout(function () { ensureFluxoEditorCard(); updateEditorLeanMode(); ensureGraphViewControls(); }, 80);
        setTimeout(function () { ensureFluxoEditorCard(); updateEditorLeanMode(); }, 350);
        return r;
      };
      var oldEditorRows = window.editorRows;
      if (typeof oldEditorRows === 'function') {
        window.editorRows = function () { var r = oldEditorRows.apply(this, arguments); ensureFluxoEditorCard(); updateEditorLeanMode(); return r; };
      }
      var oldSaveLocal = window.saveLocal;
      if (typeof oldSaveLocal === 'function') {
        window.saveLocal = function () { var r = oldSaveLocal.apply(this, arguments); try { selectedViewMode = (config && config.dataReferencia) || '__current'; localStorage.setItem(viewKey(currentProjectId), selectedViewMode); } catch (e) { } try { renderAll(); } catch (e) { } return r; };
      }
      setTimeout(function () { ensureGraphViewControls(); updateEditorLeanMode(); }, 500);
      setTimeout(function () { ensureGraphViewControls(); updateEditorLeanMode(); }, 1500);
      window.parseDateFlexible = parseDateFlexible;
    })();
