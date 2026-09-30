    (function () {
      if (window.__ppAjusteCsvDataDesempenho) return;
      window.__ppAjusteCsvDataDesempenho = true;

      var parseDateFlexible = window.parseDateFlexible || function (v) {
        var s = String(v || '').trim();
        if (!s) return null;
        var m = s.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
        if (!m) return null;
        var day = Number(m[1]), month = Number(m[2]), year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : new Date().getFullYear();
        return { ym: String(month).padStart(2, '0') + '/' + year, day: day, month: month, year: year };
      };

      var CSV_LEDGER_KEY_BASE_FINAL = 'painel-produtividade-csv-producao-ledger-v1-projetos';
      var VIEW_MODE_KEY_BASE_FINAL = 'painel-produtividade-view-dia-graficos-v1-projetos';

      function id(v) { return document.getElementById(v); }
      function projectId() { try { return currentProjectId || 'contrato-alfa'; } catch (e) { return 'contrato-alfa'; } }
      function dailyKey(pid) { try { return (typeof DAILY_BANK_KEY_BASE !== 'undefined' ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos') + '::' + (pid || projectId()); } catch (e) { return 'painel-produtividade-banco-diario-editavel-v3-projetos::' + (pid || projectId()); } }
      function stateKeyFinal(pid) { try { return (typeof STORAGE_KEY_BASE !== 'undefined' ? STORAGE_KEY_BASE : 'painel-produtividade-produtividade-editavel-v8-projetos') + '::' + (pid || projectId()); } catch (e) { return 'painel-produtividade-produtividade-editavel-v8-projetos::' + (pid || projectId()); } }
      function ledgerKey(pid) { return CSV_LEDGER_KEY_BASE_FINAL + '::' + (pid || projectId()); }
      function viewKeyFinal(pid) { return VIEW_MODE_KEY_BASE_FINAL + '::' + (pid || projectId()); }
      function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; } }
      function readJson(k, fallback) { try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } }
      function writeJson(k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); }
        catch (e) {
          try {
            if (typeof window.ppPruneLocalStorage === 'function') window.ppPruneLocalStorage();
            localStorage.setItem(k, JSON.stringify(v));
          } catch (e2) { }
        }
      }
      function toNum(v) {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        var s = String(v == null ? '' : v).trim();
        if (!s) return 0;
        s = s.replace(/R\$/gi, '').replace(/\s/g, '');
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        s = s.replace(/[^0-9.\-]/g, '');
        var n = Number(s);
        return Number.isFinite(n) ? n : 0;
      }
      function r2(v) { v = toNum(v); return Math.round((v + Number.EPSILON) * 100) / 100; }
      function norm(s) {
        return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim();
      }
      function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
      function csvEsc(v) {
        var s = String(v == null ? '' : v);
        return /[;,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }
      function parseCsvText(text) {
        try { if (typeof parseCsv === 'function') return parseCsv(text); } catch (e) { }
        var out = [], row = [], cur = '', quoted = false;
        text = String(text || '').replace(/^\ufeff/, '');
        var firstLine = text.split(/\r?\n/)[0] || '';
        var cSemi = firstLine.split(';').length, cComma = firstLine.split(',').length, cTab = firstLine.split('\t').length;
        var delimiter = ';';
        if (cTab > cSemi && cTab > cComma) delimiter = '\t';
        else if (cComma > cSemi) delimiter = ',';
        for (var i = 0; i < text.length; i++) {
          var ch = text[i], next = text[i + 1];
          if (ch === '"') {
            if (quoted && next === '"') { cur += '"'; i++; }
            else quoted = !quoted;
          } else if (ch === delimiter && !quoted) { row.push(cur); cur = ''; }
          else if ((ch === '\n' || ch === '\r') && !quoted) {
            if (ch === '\r' && next === '\n') i++;
            row.push(cur); out.push(row); row = []; cur = '';
          } else cur += ch;
        }
        row.push(cur); out.push(row);
        return out.filter(function (r) { return r.some(function (c) { return String(c || '').trim() !== ''; }); });
      }
      function findCol(headers, names) {
        var h = headers.map(norm);
        for (var i = 0; i < names.length; i++) {
          var n0 = norm(names[i]);
          var exact = h.indexOf(n0);
          if (exact >= 0) return exact;
        }
        for (var j = 0; j < names.length; j++) {
          var n1 = norm(names[j]);
          var partial = h.findIndex(function (x) { return x && (x.indexOf(n1) >= 0 || n1.indexOf(x) >= 0); });
          if (partial >= 0) return partial;
        }
        return -1;
      }
      function parseDateBRAny(value) {
        var s = String(value || '').trim();
        if (!s) return null;
        var defaultYear = new Date().getFullYear();
        try {
          var ref = String((config && config.dataReferencia) || '');
          var rm = ref.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
          if (rm) defaultYear = rm[3].length === 2 ? 2000 + Number(rm[3]) : Number(rm[3]);
        } catch (e) { }
        var iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[T\s]|$)/);
        if (iso) {
          var y = Number(iso[1]), mo = Number(iso[2]), da = Number(iso[3]);
          var d2 = new Date(y, mo - 1, da);
          if (d2.getFullYear() === y && d2.getMonth() === mo - 1 && d2.getDate() === da) {
            return { date: d2, key: String(da).padStart(2, '0') + '/' + String(mo).padStart(2, '0') + '/' + y, short: String(da).padStart(2, '0') + '/' + String(mo).padStart(2, '0'), ym: String(mo).padStart(2, '0') + '/' + y, time: d2.getTime() };
          }
        }
        var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?:[T\s]|$)/);
        if (m) {
          var day = Number(m[1]), month = Number(m[2]), year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : defaultYear;
          var d = new Date(year, month - 1, day);
          if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
            return { date: d, key: String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year, short: String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0'), ym: String(month).padStart(2, '0') + '/' + year, time: d.getTime() };
          }
        }
        return null;
      }
      function sortDateKeys(a, b) {
        var pa = parseDateBRAny(a), pb = parseDateBRAny(b);
        return (pa ? pa.time : 0) - (pb ? pb.time : 0);
      }
      function ehDiaSemMeta(x, semMeta) {
        try {
          if (!semMeta || !semMeta.length) return false;
          var p = function (n) { return (n < 10 ? '0' : '') + n; };
          var chave = p(x.getDate()) + '/' + p(x.getMonth() + 1) + '/' + x.getFullYear();
          var solta = x.getDate() + '/' + (x.getMonth() + 1) + '/' + x.getFullYear();
          for (var i = 0; i < semMeta.length; i++) {
            if (semMeta[i] === chave || semMeta[i] === solta) return true;
          }
        } catch (e) { }
        return false;
      }
      function businessUntil(d, semMeta) {
        try {
          if (d && typeof window.ppDiasUteisAte === 'function') {
            var g = window.ppDiasUteisAte(typeof config !== 'undefined' ? config : null, d);
            if (isFinite(g)) return Math.max(1, g);
          }
        } catch (e) { }
        try { if (typeof countBusinessUntil === 'function') return countBusinessUntil(d, semMeta); } catch (e) { }
        if (!d) return Math.max(1, toNum(config && config.diasLancados) || 1);
        var c = 0;
        for (var x = new Date(d.getFullYear(), d.getMonth(), 1); x <= d; x.setDate(x.getDate() + 1)) { var day = x.getDay(); if (day !== 0 && day !== 6 && !ehDiaSemMeta(x, semMeta)) c++; }
        return Math.max(1, c);
      }
      function businessMonth(d, semMeta) {
        try {
          if (d && typeof window.ppDiasUteisDoMes === 'function') {
            var g = window.ppDiasUteisDoMes(typeof config !== 'undefined' ? config : null, d);
            if (isFinite(g)) return Math.max(1, g);
          }
        } catch (e) { }
        try { if (typeof countBusinessInMonth === 'function') return countBusinessInMonth(d, semMeta); } catch (e) { }
        if (!d) return Math.max(1, toNum(config && config.diasUteisMes) || 21);
        var c = 0, last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        for (var i = 1; i <= last; i++) { var x = new Date(d.getFullYear(), d.getMonth(), i); var day = x.getDay(); if (day !== 0 && day !== 6 && !ehDiaSemMeta(x, semMeta)) c++; }
        return Math.max(1, c);
      }
      function currentState() {
        return { config: clone(config || {}), equipes: Array.isArray(equipes) ? clone(equipes) : [], historico: Array.isArray(historico) ? clone(historico) : [], teamCards: clone(teamCards || {}), teamCardTheme: clone(teamCardTheme || {}) };
      }

      function removeEditorShortcutCards() {
        ['ppEditorQuickCard', 'ppFluxoEditorCard'].forEach(function (cardId) { var el = id(cardId); if (el) el.remove(); });
      }

      function mirrorEditableReferenceFields() {
        try {
          var cfg = config || {};
          var date = cfg.dataReferencia || '';
          var daysMonth = cfg.diasUteisMes == null ? '' : cfg.diasUteisMes;
          var daysWorked = cfg.diasLancados == null ? '' : cfg.diasLancados;
          ['edData', 'edDiasDataRef', 'ppConsolidadoData'].forEach(function (fid) { var el = id(fid); if (el) { el.readOnly = false; if (document.activeElement !== el && !el.value) el.value = date; } });
          var dm1 = id('edDiasMes'), dm2 = id('edDiasMesAuto'), dl1 = id('edDiasLancados'), dl2 = id('edDiasLancadosAuto');
          [dm1, dm2, dl1, dl2].forEach(function (el) { if (el) el.readOnly = false; });
          if (dm2 && document.activeElement !== dm2 && !dm2.value) dm2.value = daysMonth;
          if (dl2 && document.activeElement !== dl2 && !dl2.value) dl2.value = daysWorked;
        } catch (e) { }
      }
      function collectEditableReferenceFields() {
        try {
          config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(config) : (config || {});
          var date = '';
          ['edDiasDataRef', 'edData', 'ppConsolidadoData'].some(function (fid) { var el = id(fid); if (el && String(el.value || '').trim()) { date = String(el.value).trim(); return true; } return false; });
          if (date) { config.dataReferencia = date;['edData', 'edDiasDataRef', 'ppConsolidadoData'].forEach(function (fid) { var el = id(fid); if (el && document.activeElement !== el) el.value = date; }); }
          var dm = id('edDiasMesAuto') && id('edDiasMesAuto').value !== '' ? toNum(id('edDiasMesAuto').value) : (id('edDiasMes') && id('edDiasMes').value !== '' ? toNum(id('edDiasMes').value) : toNum(config.diasUteisMes));
          var dl = id('edDiasLancadosAuto') && id('edDiasLancadosAuto').value !== '' ? toNum(id('edDiasLancadosAuto').value) : (id('edDiasLancados') && id('edDiasLancados').value !== '' ? toNum(id('edDiasLancados').value) : toNum(config.diasLancados));
          if (dm >= 0) config.diasUteisMes = dm;
          if (dl >= 0) config.diasLancados = config.diasUteisMes > 0 ? Math.min(dl, config.diasUteisMes) : dl;
          ['edDiasMes', 'edDiasMesAuto'].forEach(function (fid) { var el = id(fid); if (el && document.activeElement !== el) el.value = config.diasUteisMes; });
          ['edDiasLancados', 'edDiasLancadosAuto'].forEach(function (fid) { var el = id(fid); if (el && document.activeElement !== el) el.value = config.diasLancados; });
        } catch (e) { }
      }

      function ensureProductionOnlyCsvCard() {
        var aside = document.querySelector('#modalBg .modal-body aside');
        if (!aside) return;
        var cards = Array.from(aside.querySelectorAll('.editor-card'));
        var csvCard = cards.find(function (c) { var h = (c.querySelector('h3') || {}).textContent || ''; return /importar\s*\/\s*exportar\s*csv|csv\s*rápido|csv\s*rapido|produção\s*csv|producao\s*csv/i.test(h); });
        if (!csvCard) { csvCard = document.createElement('div'); csvCard.className = 'editor-card'; aside.appendChild(csvCard); }
        csvCard.id = 'ppProductionCsvOnlyCard';
        csvCard.innerHTML = '<h3>Produção CSV do projeto</h3>' +
          '<p class="pp-csv-note">Use somente este modelo. O painel lê todas as linhas, soma automaticamente a mesma equipe no mesmo dia e atualiza meta mês, meta dia, produção do dia, acumulado e histórico.</p>' +
          '<input type="file" id="csvFile" accept=".csv,text/csv" style="display:none" onchange="ppImportProductionCsvOnlyFile(event)">' +
          '<div class="editor-actions" id="productionCsvButtons" style="margin-top:8px">' +
          '<button class="btn btn-white" onclick="downloadCsvTemplate()">Modelo CSV Produção</button>' +
          '<button class="btn btn-navy" onclick="triggerImportCsv()">Importar Produção CSV</button>' +
          '</div>' +
          '<p class="pp-csv-note"><b>Colunas do modelo:</b> Data; Equipe; Serviço; Valor bruto; Meta mês; Meta dia; Base; Observação. A meta acumulada é calculada automaticamente por Meta dia × Dias trabalhados.</p>';
        var legacyFast = document.getElementById('productionCsvButtons');
        if (legacyFast && legacyFast.parentNode !== csvCard) legacyFast.remove();
      }

      function parseProductionRecordsOnly(text, fileName) {
        parseProductionRecordsOnly._lastError = '';
        var matrix = parseCsvText(text);
        if (!matrix || matrix.length < 2) {
          parseProductionRecordsOnly._lastError = 'O arquivo está vazio ou só tem o cabeçalho. Inclua ao menos uma linha de produção abaixo do cabeçalho.';
          return null;
        }
        var header = matrix[0];
        var cols = {
          data: findCol(header, ['Data', 'Data referência', 'Data ref', 'Dia', 'Data produção', 'Data producao', 'DATA']),
          equipe: findCol(header, ['Equipe', 'Nº OP', 'N OP', 'NO OP', 'Prefixo', 'Turma', 'Equipe executora', 'Equipe responsável']),
          servico: findCol(header, ['Serviço', 'Servico', 'Atividade', 'Descrição', 'Descricao', 'Demanda', 'Tipo']),
          valor: findCol(header, ['Valor bruto', 'Valor', 'Produção', 'Producao', 'Produzido', 'Receita', 'Faturamento', 'Total']),
          metaMes: findCol(header, ['Meta mês', 'Meta mes', 'Meta mensal', 'Meta do mês', 'Meta do mes']),
          metaDia: findCol(header, ['Meta dia', 'Meta diária', 'Meta diaria', 'Meta diária equipe', 'Meta dia equipe']),
          base: findCol(header, ['Base', 'Regional', 'Cidade', 'Local']),
          obs: findCol(header, [
            'Observação', 'Observacao', 'Observações', 'Observacoes',
            'Obs', 'Obs.', 'Comentário', 'Comentario', 'Comentários', 'Comentarios',
            'Nota', 'Notas', 'Justificativa', 'Ocorrência', 'Ocorrencia'
          ])
        };
        var faltando = [];
        if (cols.data < 0) faltando.push('Data');
        if (cols.equipe < 0) faltando.push('Equipe');
        if (cols.valor < 0) faltando.push('Valor bruto');
        if (faltando.length) {
          parseProductionRecordsOnly._lastError = 'Faltou a(s) coluna(s) obrigatória(s): ' + faltando.join(', ') +
            '. Cabeçalho encontrado: ' + header.map(function (h) { return String(h || '').trim(); }).filter(Boolean).join(' | ') +
            '. Use o botão “Modelo Produção CSV” para baixar o formato correto.';
          return null;
        }
        var records = [], invalidas = 0, exemplo = '';
        matrix.slice(1).forEach(function (row, idx) {
          var team = String(row[cols.equipe] || '').trim().toUpperCase();
          var parsed = parseDateBRAny(row[cols.data]);
          var val = toNum(row[cols.valor]);
          if (!team || !parsed || !Number.isFinite(val)) {
            if (team || String(row[cols.data] || '').trim() || String(row[cols.valor] || '').trim()) {
              invalidas++;
              if (!exemplo) exemplo = 'linha ' + (idx + 2) + ' (Data="' + String(row[cols.data] || '') + '", Equipe="' + team + '", Valor="' + String(row[cols.valor] || '') + '")';
            }
            return;
          }
          records.push({
            equipe: team, dateKey: parsed.key, short: parsed.short, ym: parsed.ym, time: parsed.time, valor: r2(val),
            servico: cols.servico >= 0 ? String(row[cols.servico] || '').trim() : '',
            metaMes: cols.metaMes >= 0 ? toNum(row[cols.metaMes]) : 0,
            metaDia: cols.metaDia >= 0 ? toNum(row[cols.metaDia]) : 0,
            base: cols.base >= 0 ? String(row[cols.base] || '').trim() : '',
            obs: cols.obs >= 0 ? String(row[cols.obs] || '').trim() : '',
            rowIndex: idx + 2, sourceFile: fileName || 'csv-producao'
          });
        });
        if (!records.length) {
          parseProductionRecordsOnly._lastError = 'Nenhuma linha válida encontrada. Verifique se Data está no formato DD/MM/AAAA e se Valor bruto é numérico' +
            (exemplo ? ', por exemplo ' + exemplo : '') + '.';
          return null;
        }
        parseProductionRecordsOnly._lastWarning = invalidas
          ? (invalidas + ' linha(s) foram ignoradas por Data/Valor inválidos' + (exemplo ? ' (ex.: ' + exemplo + ')' : '') + '.')
          : '';
        return records;
      }

      function applyProductionRecords(records, fileName) {
        try { if (typeof collectEditor === 'function' && id('modalBg') && id('modalBg').classList.contains('open')) collectEditor(); } catch (e) { }
        config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(config || {}) : (config || {});

        var byTeamDate = {}, totalByDate = {}, metaByTeam = {}, infoByTeam = {};
        var metaByTeamYm = {};
        var metaByDate = {};
        var obsByTeamDate = {};
        records.forEach(function (r) {
          byTeamDate[r.equipe] = byTeamDate[r.equipe] || {};
          byTeamDate[r.equipe][r.dateKey] = r2((byTeamDate[r.equipe][r.dateKey] || 0) + r.valor);
          totalByDate[r.dateKey] = r2((totalByDate[r.dateKey] || 0) + r.valor);
          if (r.dateKey) metaByDate[r.dateKey] = r2(toNum(metaByDate[r.dateKey]) + toNum(r.metaDia));
          if (r.metaMes > 0 || r.metaDia > 0) {
            metaByTeam[r.equipe] = metaByTeam[r.equipe] || {};
            if (r.metaMes > 0) metaByTeam[r.equipe].metaMes = r.metaMes;
            if (r.metaDia > 0) metaByTeam[r.equipe].metaDia = r.metaDia;
            if (r.ym) {
              metaByTeamYm[r.equipe] = metaByTeamYm[r.equipe] || {};
              var metaDoMesCsv = metaByTeamYm[r.equipe][r.ym] = metaByTeamYm[r.equipe][r.ym] || {};
              if (r.metaMes > 0) metaDoMesCsv.metaMes = r.metaMes;
              if (r.metaDia > 0) metaDoMesCsv.metaDia = r.metaDia;
            }
          }
          if (r.obs && r.dateKey) {
            obsByTeamDate[r.equipe] = obsByTeamDate[r.equipe] || {};
            if (!obsByTeamDate[r.equipe][r.dateKey]) obsByTeamDate[r.equipe][r.dateKey] = r.obs;
          }
          infoByTeam[r.equipe] = infoByTeam[r.equipe] || {};
          if (r.base && !infoByTeam[r.equipe].base) infoByTeam[r.equipe].base = r.base;
          if (r.servico && !infoByTeam[r.equipe].servico) infoByTeam[r.equipe].servico = r.servico;
        });

        try {
          var _prevBank = readJson(dailyKey(projectId()), {});
          var _currentCanonicalDates = {};
          Object.keys(totalByDate).forEach(function (dk) {
            var p = parseDateBRAny(dk);
            _currentCanonicalDates[p ? p.key : dk] = true;
          });
          var _mergedHistoricalDates = {};
          Object.keys(_prevBank).sort(sortDateKeys).forEach(function (dk) {
            var parsedBankDate = parseDateBRAny(dk);
            var canonicalDate = parsedBankDate ? parsedBankDate.key : dk;
            if (_currentCanonicalDates[canonicalDate]) return;
            if (_mergedHistoricalDates[canonicalDate]) return;
            _mergedHistoricalDates[canonicalDate] = true;
            var snap = _prevBank[dk];
            if (!snap || !Array.isArray(snap.equipes)) return;
            snap.equipes.forEach(function (t) {
              var team = String(t.equipe || '').trim().toUpperCase();
              var dv = toNum(t.produzidoDia);
              if (!team || !dv) return;
              byTeamDate[team] = byTeamDate[team] || {};
              byTeamDate[team][canonicalDate] = r2(toNum(byTeamDate[team][canonicalDate] || 0) + dv);
            });
          });
        } catch (_e) {  }

        var dates = Object.keys(totalByDate).sort(sortDateKeys);
        var cfgRef = parseDateBRAny(config.dataReferencia || '');
        var selectedKey = dates[dates.length - 1] || (cfgRef && cfgRef.key) || config.dataReferencia || '';
        var selected = parseDateBRAny(selectedKey);

        if (selected) {
          config.dataReferencia = selected.key;
          config.diasLancados = businessUntil(selected.date);

          try {
            if (!config.comentariosEquipe) config.comentariosEquipe = {};
            Object.keys(obsByTeamDate).forEach(function (team) {
              Object.keys(obsByTeamDate[team]).forEach(function (dk) {
                if (!config.comentariosEquipe[dk]) config.comentariosEquipe[dk] = {};
                var atual = config.comentariosEquipe[dk][team];
                if (atual && atual.origem === 'manual') return;
                config.comentariosEquipe[dk][team] = {
                  texto: String(obsByTeamDate[team][dk]).slice(0, 1000),
                  origem: 'csv',
                  at: new Date().toISOString()
                };
              });
            });
          } catch (e) { }
        }
        var selectedTime = selected ? selected.time : Infinity;
        var selectedYm = selected ? selected.ym : '';

        var existing = {};
        (Array.isArray(equipes) ? equipes : []).forEach(function (t) { var name = String(t.equipe || '').trim().toUpperCase(); if (name) existing[name] = clone(t); });
        var allTeams = Array.from(new Set(Object.keys(existing).concat(Object.keys(byTeamDate)))).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { numeric: true }); });
        equipes = allTeams.map(function (team) {
          var base = existing[team] || { equipe: team, metaMes: 0, metaDia: 0, metaAcumulada: 0, produzidoDia: 0, produzidoAcumulado: 0 };
          var metaCsv = selected
            ? ((metaByTeamYm[team] && metaByTeamYm[team][selectedYm]) || {})
            : (metaByTeam[team] || {});
          var metaMes = r2(metaCsv.metaMes > 0 ? metaCsv.metaMes : toNum(base.metaMes));
          var metaDia = r2(metaCsv.metaDia > 0 ? metaCsv.metaDia : (toNum(base.metaDia) > 0 ? toNum(base.metaDia) : (metaMes / Math.max(1, toNum(config.diasUteisMes) || 1))));
          var metaAcum = r2(metaDia * Math.max(0, toNum(config.diasLancados) || 0));
          var per = byTeamDate[team] || {};
          var prodDia = r2(per[selectedKey] || 0);
          var prodAcum = Object.keys(per).reduce(function (sum, k) {
            var p = parseDateBRAny(k);
            if (selected && p && (p.ym !== selectedYm || p.time > selectedTime)) return sum;
            return sum + toNum(per[k]);
          }, 0);
          return { equipe: team, metaMes: metaMes, metaAcumulada: metaAcum, metaDia: metaDia, produzidoDia: prodDia, produzidoAcumulado: r2(prodAcum) };
        });
        historico = dates.map(function (k) { var p = parseDateBRAny(k); return { data: p ? p.short : String(k).slice(0, 5), total: r2(totalByDate[k]) }; });

        try {
          teamCards = teamCards || {};
          Object.keys(infoByTeam).forEach(function (team) {
            teamCards[team] = Object.assign({}, teamCards[team] || {}, { nomeEquipe: (teamCards[team] && teamCards[team].nomeEquipe) || team, base: infoByTeam[team].base || ((config.marcadorBaseAlternativa && team.indexOf(config.marcadorBaseAlternativa) >= 0) ? (config.baseAlternativa || config.basePadrao || '') : (config.basePadrao || '')), servico: infoByTeam[team].servico || (teamCards[team] && teamCards[team].servico) || '', dataAcao: config.dataReferencia, feedback: 'Atualizado por CSV de produção.' });
          });
        } catch (e) { }

        var rawBank = readJson(dailyKey(projectId()), {});
        var bank = {};
        Object.keys(rawBank).sort(sortDateKeys).forEach(function (dk) {
          var parsedBankDate = parseDateBRAny(dk);
          var canonicalDate = parsedBankDate ? parsedBankDate.key : dk;
          if (bank[canonicalDate] === undefined || dk === canonicalDate) bank[canonicalDate] = rawBank[dk];
        });
        function acharEquipeNoRetrato(retrato, team) {
          if (!retrato || !Array.isArray(retrato.equipes)) return null;
          return retrato.equipes.find(function (x) { return String(x && x.equipe || '').trim().toUpperCase() === team; }) || null;
        }
        var retratoAnteriorDoMes = {};
        dates.forEach(function (dk) {
          var p = parseDateBRAny(dk);
          if (!p || retratoAnteriorDoMes.hasOwnProperty(p.ym)) return;
          var doMes = Object.keys(bank).filter(function (k) {
            var q = parseDateBRAny(k);
            return q && q.ym === p.ym && bank[k] && bank[k].config && Array.isArray(bank[k].equipes) && bank[k].equipes.length;
          }).sort(sortDateKeys);
          retratoAnteriorDoMes[p.ym] = doMes.length ? bank[doMes[doMes.length - 1]] : null;
        });

        dates.forEach(function (dateKey) {
          var parsed = parseDateBRAny(dateKey), time = parsed ? parsed.time : Infinity, ym = parsed ? parsed.ym : '';
          var outroMes = !!(parsed && selected && parsed.ym !== selectedYm);
          var retratoDoMes = outroMes ? retratoAnteriorDoMes[parsed.ym] : null;
          var retratoDoDia = outroMes ? bank[dateKey] : null;
          var cfg;
          if (retratoDoMes) {
            cfg = clone(retratoDoMes.config);
            cfg.comentariosEquipe = clone((config && config.comentariosEquipe) || {});
          } else {
            cfg = clone(config || {});
            if (outroMes) cfg.diasUteisMes = businessMonth(parsed.date);
          }
          try {
            if (!cfg.comentariosEquipe) cfg.comentariosEquipe = {};
            Object.keys(obsByTeamDate).forEach(function (team) {
              Object.keys(obsByTeamDate[team]).forEach(function (dk) {
                if (!cfg.comentariosEquipe[dk]) cfg.comentariosEquipe[dk] = {};
                var atual = cfg.comentariosEquipe[dk][team];
                if (atual && atual.origem === 'manual') return;
                cfg.comentariosEquipe[dk][team] = {
                  texto: String(obsByTeamDate[team][dk]).slice(0, 1000),
                  origem: 'csv',
                  at: new Date().toISOString()
                };
              });
            });
          } catch (e) { }

          if (parsed) { cfg.dataReferencia = parsed.key; cfg.diasLancados = businessUntil(parsed.date);  }
          var snapTeams = allTeams.map(function (team) {
            var base = equipes.find(function (x) { return String(x.equipe || '').toUpperCase() === team; }) || { equipe: team, metaMes: 0, metaDia: 0 };
            if (outroMes) {
              var metaDoMes = (metaByTeamYm[team] && metaByTeamYm[team][parsed.ym]) || {};
              var salvo = acharEquipeNoRetrato(retratoDoDia, team) || acharEquipeNoRetrato(retratoDoMes, team);
              if (metaDoMes.metaMes > 0 || metaDoMes.metaDia > 0) {
                base = { equipe: team,
                  metaMes: metaDoMes.metaMes > 0 ? metaDoMes.metaMes : (salvo ? toNum(salvo.metaMes) : 0),
                  metaDia: metaDoMes.metaDia > 0 ? metaDoMes.metaDia : 0 };
              } else if (salvo) {
                base = { equipe: team, metaMes: toNum(salvo.metaMes), metaDia: toNum(salvo.metaDia) };
              }
            }
            var per = byTeamDate[team] || {};
            var dayVal = r2(per[dateKey] || 0);
            var accum = Object.keys(per).reduce(function (sum, k) { var p = parseDateBRAny(k); if (parsed && p && (p.ym !== ym || p.time > time)) return sum; return sum + toNum(per[k]); }, 0);
            var md = r2(toNum(base.metaDia) || (toNum(base.metaMes) / Math.max(1, toNum(cfg.diasUteisMes) || 1)));
            return { equipe: team, metaMes: r2(base.metaMes), metaDia: md, metaAcumulada: r2(md * Math.max(0, toNum(cfg.diasLancados) || 0)), produzidoDia: dayVal, produzidoAcumulado: r2(accum) };
          });
          var totals = snapTeams.reduce(function (a, t) { a.dia += toNum(t.produzidoDia); a.acum += toNum(t.produzidoAcumulado); a.metaDia += toNum(t.metaDia); a.metaAcum += toNum(t.metaAcumulada); return a; }, { dia: 0, acum: 0, metaDia: 0, metaAcum: 0 });
          bank[dateKey] = { savedAt: new Date().toISOString(), source: 'csv-producao', sourceFile: fileName || '', projectId: projectId(), title: cfg.titulo || '', totalProduzidoDia: r2(totals.dia), totalProduzidoAcumulado: r2(totals.acum), totalMetaDia: r2(totals.metaDia), totalMetaAcumulada: r2(totals.metaAcum), config: cfg, equipes: snapTeams, historico: dates.filter(function (k) { var p = parseDateBRAny(k); return !parsed || !p || p.time <= time; }).map(function (k) { var p = parseDateBRAny(k); return { data: p ? p.short : String(k).slice(0, 5), total: r2(totalByDate[k]) }; }) };
        });
        if (typeof window.setDailyBank === 'function') window.setDailyBank(bank);
        else writeJson(dailyKey(projectId()), bank);

        try {
          var _fullBankHist = bank;
          var _allHistKeys = Object.keys(_fullBankHist).sort(sortDateKeys);
          if (_allHistKeys.length > 0) {
            historico = _allHistKeys.map(function (k) {
              var p = parseDateBRAny(k);
              var totalDia = r2(toNum((_fullBankHist[k] && _fullBankHist[k].totalProduzidoDia) || 0));
              return { data: p ? p.short : String(k).slice(0, 5), total: totalDia };
            });
          }
        } catch (_e) {  }

        var ledger = readJson(ledgerKey(projectId()), { projectId: projectId(), imports: [], rows: [] });
        ledger.projectId = projectId();
        ledger.imports = Array.isArray(ledger.imports) ? ledger.imports : [];
        ledger.rows = Array.isArray(ledger.rows) ? ledger.rows : [];
        var batch = Date.now() + '-' + Math.random().toString(16).slice(2);
        ledger.imports.push({ batchId: batch, importedAt: new Date().toISOString(), fileName: fileName || '', rows: records.length, dates: dates.length, teams: allTeams.length });
        records.forEach(function (r) { ledger.rows.push(Object.assign({}, r, { batchId: batch, importedAt: new Date().toISOString() })); });
        if (ledger.imports.length > 60) ledger.imports = ledger.imports.slice(-60);
        if (ledger.rows.length > 3000) ledger.rows = ledger.rows.slice(-3000);
        writeJson(ledgerKey(projectId()), ledger);

        try { localStorage.setItem(stateKeyFinal(projectId()), JSON.stringify(currentState())); } catch (e) { }
        try { if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true); else if (typeof saveLocalSilent === 'function') saveLocalSilent(); } catch (e) { }
        setTimeout(function () { try { if (typeof ppRefreshExecutiveFrame === 'function') ppRefreshExecutiveFrame(); } catch (e) { } }, 1000);
        try { if (typeof editorRows === 'function') editorRows(); } catch (e) { }
        try { if (typeof updateDailyBankSelect === 'function') updateDailyBankSelect(selectedKey); } catch (e) { }
        try { localStorage.setItem(viewKeyFinal(projectId()), selectedKey); } catch (e) { }
        try { if (typeof ppSetDashboardViewDay === 'function') ppSetDashboardViewDay(selectedKey); else if (typeof renderAll === 'function') renderAll(); } catch (e) { try { renderAll(); } catch (_e) { } }
        setTimeout(function () { ensureTeamPerformanceDaySelector(); ensureProductionOnlyCsvCard(); }, 120);
        return { records: records.length, teams: allTeams.length, dates: dates.length, selected: selectedKey };
      }

      window.downloadCsvTemplate = window.downloadProductionCsvTemplate = function () {
        var rows = [
          ['Data', 'Equipe', 'Encarregado', 'Serviço', 'Valor bruto', 'Meta mês', 'Meta dia', 'Base', 'Observação'],
          ['19/06/2026', 'EQP-01', '', 'Serviço A', '2500', '175000', '8333,33', 'BASE CENTRAL', 'Exemplo 1'],
          ['19/06/2026', 'EQP-01', '', 'Serviço B', '1800', '175000', '8333,33', 'BASE CENTRAL', 'Exemplo 2 - soma no mesmo dia/equipe'],
          ['20/06/2026', 'EQP-11', '', 'Serviço C', '5000', '105000', '5000', 'BASE CENTRAL', 'Exemplo histórico']
        ];
        var csv = rows.map(function (r) { return r.map(csvEsc).join(';'); }).join('\r\n');
        var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'modelo_csv_producao_pp_meta_mes_meta_dia.csv';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 250);
      };
      window.triggerImportCsv = window.triggerImportProductionCsv = function () {
        ensureProductionOnlyCsvCard();
        var input = id('csvFile');
        if (input) input.click();
      };
      window.ppImportProductionCsvOnlyFile = window.importCsvFile = window.importProductionCsvFile = function (event) {
        var file = event && event.target && event.target.files && event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var records = parseProductionRecordsOnly(reader.result, file.name || 'csv-producao');
            if (!records) { alert('Não foi possível importar o CSV.\n\n' + (parseProductionRecordsOnly._lastError || 'Verifique as colunas e os valores. Baixe o modelo Produção CSV para conferir o formato.')); return; }
            var info = applyProductionRecords(records, file.name || 'csv-producao');
            var aviso = parseProductionRecordsOnly._lastWarning ? '\n\nAtenção: ' + parseProductionRecordsOnly._lastWarning : '';
            alert('Produção CSV importada com sucesso.\n\n' + info.records + ' linha(s) lida(s) · ' + info.teams + ' equipe(s) · ' + info.dates + ' dia(s) no histórico · painel exibindo: ' + info.selected + '.' + aviso);
          } catch (e) { console.error(e); alert('Não foi possível importar o CSV de produção.\n\nDetalhe técnico: ' + (e && e.message ? e.message : e) + '\n\nDica: confirme que Data está em DD/MM/AAAA e Valor bruto é numérico.'); }
          if (event.target) event.target.value = '';
        };
        reader.onerror = function () { alert('Não foi possível ler o arquivo CSV.'); };
        reader.readAsText(file, 'utf-8');
      };
      window.importCsvText = window.importProductionCsvText = function (text) {
        var records = parseProductionRecordsOnly(text, 'csv-producao-colado');
        if (!records) { alert('Não foi possível importar o CSV.\n\n' + (parseProductionRecordsOnly._lastError || 'Use somente o modelo Produção CSV.')); return false; }
        var info = applyProductionRecords(records, 'csv-producao-colado');
        var aviso = parseProductionRecordsOnly._lastWarning ? '\n\nAtenção: ' + parseProductionRecordsOnly._lastWarning : '';
        alert('Produção CSV importada. Linhas da mesma equipe no mesmo dia foram somadas automaticamente.\nData exibida: ' + info.selected + '.' + aviso);
        return true;
      };

      function reconcilePerformanceDailyBank() {
        var pid = projectId();
        var rawBank = readJson(dailyKey(pid), {});
        var bank = {};
        var changed = false;

        Object.keys(rawBank || {}).forEach(function (key) {
          var parsed = parseDateBRAny(key);
          if (!parsed) { changed = true; return; }
          if (parsed.key !== key) changed = true;
          if (!bank[parsed.key] || key === parsed.key) bank[parsed.key] = rawBank[key];
        });

        var rootTeams = Array.isArray(equipes) ? clone(equipes) : [];
        var rootHistory = Array.isArray(historico) ? clone(historico) : [];
        var ref = parseDateBRAny((config && config.dataReferencia) || '');
        var historyTotals = {};
        rootHistory.forEach(function (item) {
          var p = parseDateBRAny(item && item.data);
          if (p) historyTotals[p.key] = r2(item.total);
        });

        var ledger = readJson(ledgerKey(pid), { imports: [], rows: [] });
        var importTime = {};
        (Array.isArray(ledger.imports) ? ledger.imports : []).forEach(function (entry) {
          if (entry && entry.batchId) importTime[entry.batchId] = String(entry.importedAt || '');
        });
        var chosenByDate = {};
        (Array.isArray(ledger.rows) ? ledger.rows : []).forEach(function (row) {
          var p = parseDateBRAny(row && (row.dateKey || row.dataOriginal || row.data));
          var team = String(row && row.equipe || '').trim().toUpperCase();
          if (!p || !team) return;
          var batch = String(row.batchId || row.importedAt || 'legado');
          var stamp = importTime[batch] || String(row.importedAt || '');
          var slot = chosenByDate[p.key];
          if (!slot || stamp > slot.stamp || (stamp === slot.stamp && batch > slot.batch)) {
            slot = chosenByDate[p.key] = { stamp: stamp, batch: batch, rows: [] };
          }
          if (slot.batch === batch) slot.rows.push(row);
        });

        var exactByTeamDate = {};
        var allTeamNames = {};
        rootTeams.forEach(function (team) {
          var name = String(team && team.equipe || '').trim().toUpperCase();
          if (name) allTeamNames[name] = true;
        });
        Object.keys(chosenByDate).forEach(function (dateKey) {
          chosenByDate[dateKey].rows.forEach(function (row) {
            var name = String(row.equipe || '').trim().toUpperCase();
            allTeamNames[name] = true;
            exactByTeamDate[name] = exactByTeamDate[name] || {};
            exactByTeamDate[name][dateKey] = r2((exactByTeamDate[name][dateKey] || 0) + toNum(row.valor));
          });
        });
        var exactDates = Object.keys(chosenByDate).sort(sortDateKeys);
        var baseByName = {};
        rootTeams.forEach(function (team) {
          var name = String(team && team.equipe || '').trim().toUpperCase();
          if (name) baseByName[name] = clone(team);
        });

        function historyUntil(dateKey) {
          var target = parseDateBRAny(dateKey);
          return Object.keys(historyTotals).filter(function (key) {
            var p = parseDateBRAny(key);
            return !target || !p || p.time <= target.time;
          }).sort(sortDateKeys).map(function (key) {
            var p = parseDateBRAny(key);
            return { data: p ? p.short : String(key).slice(0, 5), total: r2(historyTotals[key]) };
          });
        }
        function snapshotConfig(parsed) {
          var cfg = clone(config || {});
          if (parsed) {
            cfg.dataReferencia = parsed.key;
            cfg.diasLancados = businessUntil(parsed.date);
          }
          return cfg;
        }
        function totalsFrom(teams) {
          return teams.reduce(function (sum, team) {
            sum.dia += toNum(team.produzidoDia);
            sum.acum += toNum(team.produzidoAcumulado);
            sum.metaDia += toNum(team.metaDia);
            sum.metaAcum += toNum(team.metaAcumulada);
            return sum;
          }, { dia: 0, acum: 0, metaDia: 0, metaAcum: 0 });
        }
        function makeSnapshot(dateKey, teams, source) {
          var parsed = parseDateBRAny(dateKey);
          var cfg = snapshotConfig(parsed);
          var totals = totalsFrom(teams);
          return {
            savedAt: '', source: source, projectId: pid, title: cfg.titulo || '',
            totalProduzidoDia: r2(totals.dia), totalProduzidoAcumulado: r2(totals.acum),
            totalMetaDia: r2(totals.metaDia), totalMetaAcumulada: r2(totals.metaAcum),
            config: cfg, equipes: teams, historico: historyUntil(dateKey),
            teamCardTheme: clone(teamCardTheme || {})
          };
        }

        exactDates.forEach(function (dateKey) {
          if (bank[dateKey] && Array.isArray(bank[dateKey].equipes) && bank[dateKey].equipes.length && bank[dateKey].source !== 'historico-legado-reconciliado') return;
          var parsed = parseDateBRAny(dateKey);
          var cfg = snapshotConfig(parsed);
          var teams = Object.keys(allTeamNames).sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { numeric: true }); }).map(function (name) {
            var team = clone(baseByName[name] || { equipe: name, metaMes: 0, metaDia: 0 });
            var per = exactByTeamDate[name] || {};
            var dayValue = r2(per[dateKey] || 0);
            var accumulated = Object.keys(per).reduce(function (sum, key) {
              var p = parseDateBRAny(key);
              if (parsed && p && (p.ym !== parsed.ym || p.time > parsed.time)) return sum;
              return sum + toNum(per[key]);
            }, 0);
            var metaDay = r2(toNum(team.metaDia) || (toNum(team.metaMes) / Math.max(1, toNum(cfg.diasUteisMes))));
            team.equipe = name;
            team.metaDia = metaDay;
            team.metaAcumulada = r2(metaDay * Math.max(0, toNum(cfg.diasLancados)));
            team.produzidoDia = dayValue;
            team.produzidoAcumulado = r2(accumulated);
            return team;
          });
          historyTotals[dateKey] = r2(totalsFrom(teams).dia);
          bank[dateKey] = makeSnapshot(dateKey, teams, 'csv-ledger-recuperado');
          changed = true;
        });

        if (ref && (!bank[ref.key] || !Array.isArray(bank[ref.key].equipes) || !bank[ref.key].equipes.length)) {
          bank[ref.key] = makeSnapshot(ref.key, clone(rootTeams), 'editor-projeto');
          if (historyTotals[ref.key] === undefined) historyTotals[ref.key] = r2(bank[ref.key].totalProduzidoDia);
          changed = true;
        }

        var historyKeys = Object.keys(historyTotals).sort(sortDateKeys);
        var accumulatedTotal = 0;
        var accumulatedMonth = '';
        historyKeys.forEach(function (dateKey) {
          var p = parseDateBRAny(dateKey);
          if (!p) return;
          if (p.ym !== accumulatedMonth) { accumulatedMonth = p.ym; accumulatedTotal = 0; }
          accumulatedTotal = r2(accumulatedTotal + toNum(historyTotals[dateKey]));
          if (bank[dateKey] && Array.isArray(bank[dateKey].equipes) && bank[dateKey].equipes.length) return;
          var weightTotal = rootTeams.reduce(function (sum, team) { return sum + Math.max(0, toNum(team.produzidoAcumulado)); }, 0);
          var count = Math.max(1, rootTeams.length);
          var cfg = snapshotConfig(p);
          var teams = rootTeams.map(function (original) {
            var team = clone(original);
            var weight = weightTotal > 0 ? Math.max(0, toNum(team.produzidoAcumulado)) / weightTotal : 1 / count;
            var metaDay = r2(toNum(team.metaDia) || (toNum(team.metaMes) / Math.max(1, toNum(cfg.diasUteisMes))));
            team.metaDia = metaDay;
            team.metaAcumulada = r2(metaDay * Math.max(0, toNum(cfg.diasLancados)));
            team.produzidoDia = r2(toNum(historyTotals[dateKey]) * weight);
            team.produzidoAcumulado = r2(accumulatedTotal * weight);
            return team;
          });
          bank[dateKey] = makeSnapshot(dateKey, teams, 'historico-legado-reconciliado');
          bank[dateKey].totalProduzidoDia = r2(historyTotals[dateKey]);
          bank[dateKey].totalProduzidoAcumulado = r2(accumulatedTotal);
          changed = true;
        });

        if (changed) writeJson(dailyKey(pid), bank);
        return { changed: changed, bank: bank };
      }
      window.ppReconcilePerformanceDailyBank = reconcilePerformanceDailyBank;

      function isFullDateKeyLocal(k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(k || '').trim()); }
      function currentViewMode() {
        try { return localStorage.getItem(viewKeyFinal(projectId())) || '__current'; } catch (e) { return '__current'; }
      }
      function setDayViewFromMain(value) {
        try { window._ppUserPickedDay = true; } catch (e) { }
        try { localStorage.setItem(viewKeyFinal(projectId()), value || '__current'); } catch (e) { }
        if (typeof ppSetDashboardViewDay === 'function') ppSetDashboardViewDay(value || '__current');
        else if (typeof renderAll === 'function') renderAll();
      }
      window.ppSetPerformanceDayView = setDayViewFromMain;
      function buildMonthOptionsPerf() {
        var bank = reconcilePerformanceDailyBank().bank;
        var keys = Object.keys(bank).filter(isFullDateKeyLocal).sort(sortDateKeys);
        var months = [];
        keys.forEach(function (k) {
          var p = parseDateBRAny(k);
          if (p && p.ym && months.indexOf(p.ym) < 0) months.push(p.ym);
        });
        months.reverse();
        var html = '<option value="">Todos os meses</option>';
        var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        months.forEach(function (m) {
          var parts = String(m).split('/');
          var label = parts.length === 2 && monthNames[Number(parts[0]) - 1]
            ? monthNames[Number(parts[0]) - 1] + '/' + parts[1]
            : m;
          html += '<option value="' + escHtml(m) + '">' + escHtml(label) + '</option>';
        });
        return html;
      }
      function performanceDayKeys(filterMonth) {
        var bank = reconcilePerformanceDailyBank().bank;
        var keys = Object.keys(bank).filter(isFullDateKeyLocal).sort(sortDateKeys).reverse();
        if (filterMonth) {
          keys = keys.filter(function (k) {
            var p = parseDateBRAny(k);
            return p && p.ym === filterMonth;
          });
        }
        return keys;
      }
      function ppResolveMostRecentDayKey() {
        var bank = reconcilePerformanceDailyBank().bank;
        var keys = Object.keys(bank).filter(isFullDateKeyLocal).sort(sortDateKeys).reverse();
        if (!keys.length) return '';
        var now = new Date();
        var curMo = now.getMonth() + 1;
        var curYm = (curMo < 10 ? '0' + curMo : '' + curMo) + '/' + now.getFullYear();
        var months = [];
        keys.forEach(function (k) {
          var p = parseDateBRAny(k);
          if (p && p.ym && months.indexOf(p.ym) < 0) months.push(p.ym);
        });
        var targetYm = (months.indexOf(curYm) >= 0) ? curYm : (months[0] || '');
        if (!targetYm) return keys[0];
        for (var i = 0; i < keys.length; i++) {
          var pp = parseDateBRAny(keys[i]);
          if (pp && pp.ym === targetYm) return keys[i];
        }
        return keys[0];
      }
      window.ppResolveMostRecentDayKey = ppResolveMostRecentDayKey;
      function buildDayOptionsByMonth(filterMonth) {
        var keys = performanceDayKeys(filterMonth);
        var html = '';
        keys.forEach(function (k) { html += '<option value="' + escHtml(k) + '">' + escHtml(k) + '</option>'; });
        return html || '<option value="" disabled>Sem dias</option>';
      }
      function ppSetPerformanceMonthFilter(month) {
        var dayKeys = performanceDayKeys(month);
        var selectedDay = dayKeys[0] || '';
        document.querySelectorAll('.pp-team-day-select:not(.pp-team-month-select)').forEach(function (sel) {
          sel.innerHTML = buildDayOptionsByMonth(month);
          sel.value = selectedDay;
          if (typeof window.aplSyncSelectEl === 'function') window.aplSyncSelectEl(sel);
        });
        document.querySelectorAll('.pp-team-month-select').forEach(function (sel) {
          if (sel.value !== (month || '')) sel.value = month || '';
          if (typeof window.aplSyncSelectEl === 'function') window.aplSyncSelectEl(sel);
        });
        setDayViewFromMain(selectedDay || '__current');
      }
      window.ppSetPerformanceMonthFilter = ppSetPerformanceMonthFilter;

      function ensureTeamPerformanceDaySelector() {
        var heads = Array.from(document.querySelectorAll('.panel-head'));
        heads.forEach(function (head) {
          var title = (head.querySelector('span') || {}).textContent || '';
          if (!/desempenho\s+por\s+equipe/i.test(title)) return;
          if (head.querySelector('.pp-team-day-tools')) return;
          var small = head.querySelector('small');
          var wrap = document.createElement('div');
          wrap.className = 'pp-team-day-tools';
          wrap.innerHTML =
            '<select class="pp-team-day-select pp-team-month-select" title="Filtrar por mês" onchange="ppSetPerformanceMonthFilter(this.value)"></select>' +
            '<select class="pp-team-day-select" title="Escolher dia do desempenho" onchange="ppSetPerformanceDayView(this.value)"></select>';
          if (small) head.insertBefore(wrap, small); else head.appendChild(wrap);
          var panel = head.closest('.panel');
          if (panel) panel.classList.add('pp-team-filter-panel');
        });

        var mode = currentViewMode();
        var activeMonth = '';
        if (mode && mode.indexOf('__month:') === 0) {
          activeMonth = mode.replace('__month:', '');
        } else if (mode && mode !== '__current') {
          var _p = parseDateBRAny(mode);
          if (_p && _p.ym) activeMonth = _p.ym;
        }

        var monthOpts = buildMonthOptionsPerf();
        var dayOpts = buildDayOptionsByMonth(activeMonth);
        var availableDays = performanceDayKeys(activeMonth);

        document.querySelectorAll('.pp-team-month-select').forEach(function (sel) {
          if (sel.innerHTML !== monthOpts) sel.innerHTML = monthOpts;
          sel.value = activeMonth || '';
          if (sel.value !== (activeMonth || '')) sel.value = '';
        });

        var dayValue = (mode && mode !== '__current' && mode.indexOf('__month:') === -1 && availableDays.indexOf(mode) >= 0)
          ? mode
          : (availableDays[0] || '');
        document.querySelectorAll('.pp-team-day-select:not(.pp-team-month-select)').forEach(function (sel) {
          if (sel.innerHTML !== dayOpts) sel.innerHTML = dayOpts;
          sel.value = dayValue;
          if (sel.value !== dayValue) sel.selectedIndex = 0;
        });

        if (typeof window.aplReinitSelects === 'function') window.aplReinitSelects();
        document.querySelectorAll('.pp-team-day-select').forEach(function (sel) {
          if (typeof window.aplSyncSelectEl === 'function') window.aplSyncSelectEl(sel);
        });
      }
      window.ensureTeamPerformanceDaySelector = ensureTeamPerformanceDaySelector;

      function ppHydrateEquipesFromBank() {
        try {
          if (Array.isArray(equipes) && equipes.length > 0) return false;
          var bank = readJson(dailyKey(projectId()), {});
          var bankKeys = Object.keys(bank).sort(sortDateKeys);
          if (!bankKeys.length) return false;
          var viewMode = '';
          try { viewMode = localStorage.getItem(VIEW_MODE_KEY_BASE_FINAL + '::' + projectId()) || ''; } catch (e) { }
          var snapKey = (viewMode && viewMode !== '__current' && bank[viewMode]) ? viewMode : bankKeys[bankKeys.length - 1];
          var snap = bank[snapKey];
          if (snap && Array.isArray(snap.equipes) && snap.equipes.length > 0) {
            equipes = snap.equipes.map(function (t) { return Object.assign({}, t); });
            if (snap.config) { try { config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(Object.assign({}, snap.config)) : Object.assign({}, snap.config); } catch (e) { } }
            if (Array.isArray(snap.historico)) historico = snap.historico.map(function (h) { return Object.assign({}, h); });
            return true;
          }
        } catch (e) { }
        return false;
      }
      window.ppHydrateEquipesFromBank = ppHydrateEquipesFromBank;

      var oldCollectFinal = window.collectEditor;
      if (typeof oldCollectFinal === 'function') {
        window.collectEditor = function () { var r = oldCollectFinal.apply(this, arguments); collectEditableReferenceFields(); return r; };
        try { collectEditor = window.collectEditor; } catch (e) { }
      }
      var oldEditorRowsFinal = window.editorRows;
      if (typeof oldEditorRowsFinal === 'function') {
        window.editorRows = function () {
          var r = oldEditorRowsFinal.apply(this, arguments);
          removeEditorShortcutCards();
          ensureProductionOnlyCsvCard();
          mirrorEditableReferenceFields();
          ensureTeamPerformanceDaySelector();
          return r;
        };
        try { editorRows = window.editorRows; } catch (e) { }
      }
      var oldOpenFinal = window.openEditor;
      if (typeof oldOpenFinal === 'function') {
        window.openEditor = function () {
          try { ppHydrateEquipesFromBank(); } catch (e) { }
          var r = oldOpenFinal.apply(this, arguments);
          setTimeout(function () { removeEditorShortcutCards(); ensureProductionOnlyCsvCard(); mirrorEditableReferenceFields(); ensureTeamPerformanceDaySelector(); if (typeof aplReinitSelects === 'function') aplReinitSelects(); }, 60);
          setTimeout(function () { removeEditorShortcutCards(); ensureProductionOnlyCsvCard(); mirrorEditableReferenceFields(); if (typeof aplReinitSelects === 'function') aplReinitSelects(); }, 260);
          return r;
        };
        try { openEditor = window.openEditor; } catch (e) { }
      }
      var oldApplyFinal = window.applyEditor;
      if (typeof oldApplyFinal === 'function') {
        window.applyEditor = function () { collectEditableReferenceFields(); var r = oldApplyFinal.apply(this, arguments); collectEditableReferenceFields(); try { saveLocalSilent(); } catch (e) { } try { renderAll(); } catch (e) { } return r; };
        try { applyEditor = window.applyEditor; } catch (e) { }
      }
      var oldRenderFinal = window.renderAll;
      if (typeof oldRenderFinal === 'function') {
        window.renderAll = function () { var r = oldRenderFinal.apply(this, arguments); try { ensureTeamPerformanceDaySelector(); } catch (e) { } return r; };
        try { renderAll = window.renderAll; } catch (e) { }
      }

      setInterval(function () {
        if (document.body.classList.contains('app-locked')) return;
        var modal = id('modalBg');
        if (modal && modal.classList.contains('open')) { removeEditorShortcutCards(); ensureProductionOnlyCsvCard(); mirrorEditableReferenceFields(); }
      }, 5000);
      setTimeout(function () { try { ensureTeamPerformanceDaySelector(); } catch (e) { } ensureProductionOnlyCsvCard(); removeEditorShortcutCards(); }, 1500);
    })();
