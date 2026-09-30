    (function () {
      var COPYRIGHT_TXT_FINAL = "© 2026 Painel de Produtividade · Todos os direitos reservados.";
      var WEEK_BR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      function moneySafe(v) { try { return money(v); } catch (e) { return String(v || 0); } }
      function numberSafe(v) { try { return n(v); } catch (e) { var x = Number(String(v || 0).replace(/\./g, '').replace(',', '.')); return Number.isFinite(x) ? x : 0; } }
      function pctInputValue(v, fallback) {
        var x = numberSafe(v);
        if (!x && fallback !== undefined) x = fallback;
        if (x > 1.0001) x = x / 100;
        return Math.max(0, Math.min(9.99, x));
      }
      function fmtPctInput(v) { return (pctInputValue(v, 0) * 100).toFixed(0); }
      function parseDateBRFinal(value) {
        var s = String(value || '').trim();
        var m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        if (!m) {
          try {
            var r = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            return new Date(r.getFullYear(), r.getMonth(), r.getDate());
          } catch (e) { return new Date(); }
        }
        var day = Number(m[1]), mon = Number(m[2]) - 1;
        var y = m[3] ? Number(m[3]) : (new Date()).getFullYear();
        if (y < 100) y += 2000;
        return new Date(y, mon, day);
      }
      function pad2(x) { return String(x).padStart(2, '0'); }
      function fmtDateShort(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); }
      function fmtWeekDate(d) { return WEEK_BR[d.getDay()] + ' ' + fmtDateShort(d); }
      function isBusiness(d) { var w = d.getDay(); return w !== 0 && w !== 6; }
      function countBusinessInMonth(date) {
        try {
          if (typeof window.ppDiasUteisDoMes === 'function') {
            var g = window.ppDiasUteisDoMes(typeof config !== 'undefined' ? config : null, date);
            if (isFinite(g)) return g;
          }
        } catch (e) { }
        var d = new Date(date.getFullYear(), date.getMonth(), 1), end = new Date(date.getFullYear(), date.getMonth() + 1, 0), c = 0;
        while (d <= end) { if (isBusiness(d)) c++; d.setDate(d.getDate() + 1); }
        return c;
      }
      function countBusinessUntil(date) {
        try {
          if (typeof window.ppDiasUteisAte === 'function') {
            var g = window.ppDiasUteisAte(typeof config !== 'undefined' ? config : null, date);
            if (isFinite(g)) return g;
          }
        } catch (e) { }
        var d = new Date(date.getFullYear(), date.getMonth(), 1), end = new Date(date.getFullYear(), date.getMonth(), date.getDate()), c = 0;
        while (d <= end) { if (isBusiness(d)) c++; d.setDate(d.getDate() + 1); }
        return c;
      }
      function futureBusinessLabels(count, refValue) {
        count = Math.max(0, Number(count) || 0);
        var ref = parseDateBRFinal(refValue || (window.config && config.dataReferencia) || '');
        var labels = [];
        var d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
        var end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
        while (d <= end && labels.length < count) {
          if (isBusiness(d)) labels.push(fmtWeekDate(d));
          d.setDate(d.getDate() + 1);
        }
        while (labels.length < count) { labels.push('Dia útil ' + (labels.length + 1)); }
        return labels;
      }
      function rioNowString() {
        try {
          return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(',', '');
        } catch (e) {
          var d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }
      }
      window.ppRioNowString = rioNowString;

      if (typeof formatDateTimeBR === 'function') {
        formatDateTimeBR = function (value) {
          if (!value) return '';
          try {
            var d = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(d.getTime())) return String(value);
            return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d).replace(',', '');
          } catch (e) { return String(value); }
        };
      }

      function statusCfg() {
        try { config = normalizeConfigObject(config); } catch (e) { }
        var s = (config && config.statusLimites) || {};
        var at = pctInputValue(s.atencaoMin ?? s.atencao ?? config.limiteAtencao, 0.70);
        var ex = pctInputValue(s.excelenteMin ?? s.excelente ?? config.limiteExcelente, 1.00);
        if (ex < at) ex = at;
        return { atencaoMin: at, excelenteMin: ex };
      }
      if (typeof calcStatus === 'function') {
        calcStatus = function (d) {
          var lim = statusCfg();
          var pct = numberSafe(d && d.percentualAcumulado);
          if (numberSafe(d && d.produzidoAcumulado) <= 0 || pct < lim.atencaoMin) return { text: 'CRÍTICO', cls: 'alr', color: '#D0402B' };
          if (pct >= lim.excelenteMin) return { text: 'EXCELENTE', cls: 'ok', color: '#1E8A4C' };
          return { text: 'ATENÇÃO', cls: 'att', color: '#E0A100' };
        };
      }
      if (typeof statusClassFromMetric === 'function') {
        statusClassFromMetric = function (d) {
          var t = String((d && d.status && d.status.text) || '').toUpperCase();
          if (t.indexOf('CRÍT') >= 0 || t.indexOf('ALERTA') >= 0) return 'danger';
          if (t.indexOf('ATEN') >= 0) return 'warn';
          return '';
        };
      }
      if (typeof statusClassName === 'function') {
        statusClassName = function (s) {
          var t = String(s || '').toUpperCase();
          if (t.indexOf('EXCELENTE') >= 0) return 'excelente';
          if (t.indexOf('CRÍT') >= 0 || t.indexOf('ALERTA') >= 0) return 'alerta';
          return 'atencao';
        };
      }

      if (typeof tableHtml === 'function') {
        tableHtml = function (rows, total) {
          if (typeof ppFiltroEquipeTexto === 'function' && ppFiltroEquipeTexto()) {
            rows = rows.filter(function (d) { return ppEquipeCasaFiltro(d.equipe); });
          }
          return `<colgroup><col><col><col><col><col><col><col><col><col><col></colgroup>
        <thead><tr>
          <th>#</th><th>Equipe</th><th>Meta mês</th><th>Meta acum.</th><th>Meta dia</th><th>Prod. dia</th><th>Prod. acum.</th><th>Desv. dia</th><th>Desv. acum.</th><th>Status</th>
        </tr></thead>
        <tbody>${rows.map(function (d, i) {
            return `<tr>
          <td><span class="idx">${i + 1}</span></td>
          <td title="${escapeAttr(d.equipe)}">${escapeHtml(d.equipe)}</td>
          <td>${moneySafe(d.metaMes)}</td>
          <td>${moneySafe(d.metaAcumulada)}</td>
          <td>${moneySafe(d.metaDia)}</td>
          <td>${moneySafe(d.produzidoDia)}</td>
          <td><b>${moneySafe(d.produzidoAcumulado)}</b></td>
          <td class="${deltaClass(d.desvioDia)}">${percent(d.desvioDiaPct)}</td>
          <td class="${deltaClass(d.desvioAcumulado)}">${percent(d.desvioAcumuladoPct)}</td>
          <td><span class="badge ${d.status.cls}">${escapeHtml(d.status.text)}</span></td>
        </tr>`;
          }).join('')}</tbody>
        <tfoot><tr>
          <td colspan="2">TOTAL GERAL</td>
          <td>${moneySafe(total.metaMes)}</td>
          <td>${moneySafe(total.metaAcumulada)}</td>
          <td>${moneySafe(total.metaDia)}</td>
          <td>${moneySafe(total.produzidoDia)}</td>
          <td>${moneySafe(total.produzidoAcumulado)}</td>
          <td class="${deltaClass(total.desvioDia)}">${percent(total.desvioDiaPct)}</td>
          <td class="${deltaClass(total.desvioAcumulado)}">${percent(total.desvioAcumuladoPct)}</td>
          <td></td>
        </tr></tfoot>`;
        };
      }

      if (typeof renderCharts === 'function') {
        var __oldRenderCharts2906 = renderCharts;
        renderCharts = function (prefix, list, sorted, total, bucket) {
          __oldRenderCharts2906(prefix, list, sorted, total, bucket);
          try {
            var crit = (total.status && (total.status['CRÍTICO'] || total.status['ALERTA'])) || 0;
            if (bucket && bucket.status) {
              bucket.status.data.labels = ['Excelente', 'Atenção', 'Crítico'];
              bucket.status.data.datasets[0].data = [total.status['EXCELENTE'] || 0, total.status['ATENÇÃO'] || 0, crit];
              bucket.status.update('none');
            }
          } catch (e) { }
        };
      }

      if (typeof createTeamCardChart === 'function') {
        createTeamCardChart = function (canvas, d, themeOverride) {
          if (!canvas) return null;
          if (!window.Chart) { canvas.outerHTML = '<div class="tc-empty-chart">Gráfico indisponível: verifique a conexão e recarregue o arquivo.</div>'; return null; }
          var theme = normalizeTeamCardTheme(themeOverride || teamCardTheme);
          var series = getTeamEvolutionSeries(d);
          var realLabels = series.map(function (s) { return s.label; });
          var realData = series.map(function (s) { return Math.max(0, numberSafe(s.value)); });
          var diasMes = Math.max(1, numberSafe(config.diasUteisMes) || 21);
          var diasLancados = Math.max(1, Math.min(diasMes, numberSafe(config.diasLancados) || realData.length || 1));
          var diasRestantes = Math.max(0, diasMes - diasLancados);
          var futureLabels = futureBusinessLabels(diasRestantes, config.dataReferencia);
          var labels = realLabels.concat(futureLabels);
          var metaMes = Math.max(0, numberSafe(d.metaMes));
          var metaAtual = Math.min(metaMes, numberSafe(d.metaAcumulada) || (metaMes / diasMes) * diasLancados);
          var metaPast = realData.map(function (_, i) { return Math.min(metaMes, metaAtual * ((i + 1) / Math.max(1, realData.length))); });
          var metaFuture = futureLabels.map(function (_, i) { return Math.min(metaMes, metaAtual + (metaMes - metaAtual) * ((i + 1) / Math.max(1, futureLabels.length))); });
          var metaData = metaPast.concat(metaFuture);
          var saldo = Math.max(0, metaMes - numberSafe(d.produzidoAcumulado));
          var stepRec = futureLabels.length > 0 ? saldo / futureLabels.length : 0;
          var recoveryData = realData.slice(0, -1).map(function () { return null; }).concat([realData[realData.length - 1] ?? numberSafe(d.produzidoAcumulado)]).concat(futureLabels.map(function (_, i) { return Math.min(metaMes, numberSafe(d.produzidoAcumulado) + stepRec * (i + 1)); }));
          var realDataset = realData.concat(futureLabels.map(function () { return null; }));
          var vals = realDataset.concat(recoveryData, metaData).filter(function (v) { return v !== null && Number.isFinite(Number(v)); });
          var maxY = (Math.max.apply(Math, [metaMes].concat(vals)) * 1.15) || 10000;
          return new Chart(canvas, {
            type: 'line',
            data: {
              labels: labels, datasets: [
                { label: 'Real bruto', data: realDataset, borderColor: theme.destaque, backgroundColor: theme.destaque, borderWidth: 3, pointRadius: 3.5, tension: .25, shortLabel: 'real' },
                { label: 'Recuperação', data: recoveryData, borderColor: '#1E8A4C', backgroundColor: '#1E8A4C', borderWidth: 3, pointRadius: 3.5, borderDash: [7, 5], tension: .2, shortLabel: 'rec.' },
                { label: 'Meta', data: metaData, borderColor: '#161B24', backgroundColor: '#161B24', borderWidth: 2.5, pointRadius: 2.8, borderDash: [5, 5], tension: 0, shortLabel: 'meta' }
              ]
            },
            options: {
              responsive: true, maintainAspectRatio: false, animation: false,
              layout: { padding: { top: 22, right: 14, left: 4, bottom: 0 } },
              plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 3, color: '#3F4752', font: { size: 11, weight: '800' } } }, tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + money(ctx.raw); } } } },
              scales: { x: { grid: { display: false }, ticks: { color: '#67707C', font: { size: 10, weight: '800' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, suggestedMax: maxY, grid: { color: '#E9ECF0' }, ticks: { color: '#67707C', font: { size: 10, weight: '800' }, callback: function (v) { return 'R$ ' + Math.round(v / 1000) + ' mil'; } } } }
            },
            plugins: [tcLineLabelPlugin]
          });
        };
      }

      if (typeof createOperationalTeamChart === 'function') {
        createOperationalTeamChart = function (canvas, d, chartId) {
          if (!canvas) return null;
          if (!window.Chart) { canvas.outerHTML = '<div class="tc-empty-chart">Gráfico indisponível: verifique a conexão e recarregue o arquivo.</div>'; return null; }
          var series = getTeamEvolutionSeries(d);
          var labelsBase = series.map(function (s) { return s.label; });
          var realData = series.map(function (s) { return Math.max(0, numberSafe(s.value)); });
          var diasMes = Math.max(1, numberSafe(config.diasUteisMes) || 21);
          var diasLancados = Math.max(1, Math.min(diasMes, numberSafe(config.diasLancados) || realData.length || 1));
          var diasRestantes = Math.max(0, diasMes - diasLancados);
          var futureLabels = futureBusinessLabels(diasRestantes, config.dataReferencia);
          var labels = labelsBase.concat(futureLabels);
          var metaMes = Math.max(0, numberSafe(d.metaMes));
          var metaAtual = Math.min(metaMes, numberSafe(d.metaAcumulada) || (metaMes / diasMes) * diasLancados);
          var saldoMeta = Math.max(0, metaMes - numberSafe(d.produzidoAcumulado));
          var novaMetaDia = futureLabels.length > 0 ? saldoMeta / futureLabels.length : 0;
          var recoveryData = realData.slice(0, -1).map(function () { return null; }).concat([realData[realData.length - 1] ?? numberSafe(d.produzidoAcumulado)]).concat(futureLabels.map(function (_, i) { return Math.min(metaMes, numberSafe(d.produzidoAcumulado) + novaMetaDia * (i + 1)); }));
          var metaPast = realData.map(function (_, i) { return Math.min(metaMes, metaAtual * ((i + 1) / Math.max(1, realData.length))); });
          var metaFuture = futureLabels.map(function (_, i) { return Math.min(metaMes, metaAtual + (metaMes - metaAtual) * ((i + 1) / Math.max(1, futureLabels.length))); });
          var metaData = metaPast.concat(metaFuture);
          var realDataset = realData.concat(futureLabels.map(function () { return null; }));
          var vals = realDataset.concat(recoveryData, metaData).filter(function (v) { return v !== null && Number.isFinite(Number(v)); });
          var maxY = (Math.max.apply(Math, [metaMes, numberSafe(d.produzidoAcumulado)].concat(vals)) * 1.14) || 10000;
          return new Chart(canvas, {
            type: 'line',
            data: {
              labels: labels, datasets: [
                { label: 'Real acumulado', data: realDataset, borderColor: teamCardTheme.destaque, backgroundColor: teamCardTheme.destaque, borderWidth: 3.5, pointRadius: 3, tension: .25, shortLabel: 'real' },
                { label: 'Necessário', data: recoveryData, borderColor: '#1E8A4C', backgroundColor: '#1E8A4C', borderWidth: 3.5, pointRadius: 3, borderDash: [7, 5], tension: .18, shortLabel: 'meta nova' },
                { label: 'Meta planejada', data: metaData, borderColor: '#161B24', backgroundColor: '#161B24', borderWidth: 2.4, pointRadius: 2, borderDash: [5, 5], tension: 0, shortLabel: 'meta' }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { top: 16, right: 10, left: 4, bottom: 0 } }, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 3, color: '#3F4752', font: { size: 11, weight: '800' } } }, tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + money(ctx.raw); } } } }, scales: { x: { grid: { display: false }, ticks: { color: '#67707C', font: { size: 10, weight: '800' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, suggestedMax: maxY, grid: { color: '#E9ECF0' }, ticks: { color: '#67707C', font: { size: 10, weight: '800' }, callback: function (v) { return 'R$ ' + Math.round(v / 1000) + ' mil'; } } } } },
            plugins: [tcLineLabelPlugin]
          });
        };
      }

      function ensureFooterEnd() {
        try {
          document.querySelectorAll('.pp-global-rights,.login-rights').forEach(function (el) { el.style.display = 'none'; });
          var footer = document.getElementById('ppFinalFooter');
          if (!footer) { footer = document.createElement('div'); footer.id = 'ppFinalFooter'; footer.className = 'pp-final-footer'; document.body.appendChild(footer); }
          footer.textContent = COPYRIGHT_TXT_FINAL;
          document.body.appendChild(footer);
        } catch (e) { }
      }

      function patchStatusLabels() {
        try {
          document.querySelectorAll('.status-line span').forEach(function (el) { if (/ALERTA/i.test(el.textContent || '')) el.childNodes[el.childNodes.length - 1].textContent = 'CRÍTICO'; });
          var st = data().total.status;
          var crit = st['CRÍTICO'] || st['ALERTA'] || 0;
          var alr = document.getElementById('statusAlr'); if (alr) alr.textContent = crit + ' equipe(s)';
          var capAlr = document.getElementById('capAlr'); if (capAlr) capAlr.textContent = crit + ' equipe(s)';
        } catch (e) { }
      }

      function ensureEditorExtras() {
        try {
          var aside = document.querySelector('#modalBg .modal-body aside');
          if (!aside) return;
          if (!document.getElementById('businessDaysEditor')) {
            var card = document.createElement('div');
            card.className = 'editor-card';
            card.id = 'businessDaysEditor';
            card.innerHTML = '<h3>DIAS ÚTEIS DO MÊS ATUAL</h3><div class="form-grid"><div class="field"><label>Data referência</label><input id="edDiasDataRef" placeholder="dd/mm/aaaa"></div><div class="field"><label>Horário RJ</label><input id="edRioClock" readonly></div><div class="field"><label>Dias úteis do mês</label><input id="edDiasMesAuto" type="number" min="0" step="0.5"></div><div class="field"><label>Dias trabalhados</label><input id="edDiasLancadosAuto" type="number" min="0" step="0.5"></div></div><div class="editor-actions" style="margin-top:8px;grid-template-columns:1fr"><button class="btn btn-navy" onclick="ppGerarDiasUteisMesAtual()">Gerar dias úteis pelo mês/data</button></div><p class="pp-mini-note">Esses campos alimentam o painel lateral gerencial e as projeções. Ajuste manualmente quando houver feriado ou calendário específico do contrato.</p>';
            var ref = aside.querySelector('.editor-card:nth-of-type(2)') || aside.firstChild;
            aside.insertBefore(card, ref);
          }
          if (!document.getElementById('statusThresholdEditor')) {
            var s = document.createElement('div');
            s.className = 'editor-card';
            s.id = 'statusThresholdEditor';
            s.innerHTML = '<h3>STATUS DO PROJETO</h3><div class="form-grid"><div class="field"><label>Excelente a partir de %</label><input id="edStatusExcelente" type="number" step="1" min="0" placeholder="100"></div><div class="field"><label>Atenção a partir de %</label><input id="edStatusAtencao" type="number" step="1" min="0" placeholder="70"></div></div><p class="pp-mini-note">Abaixo da faixa de atenção o painel classifica como CRÍTICO. Os cards e rankings consolidam automaticamente esta regra por projeto.</p>';
            var actions = Array.from(aside.querySelectorAll('.editor-card')).find(function (c) { return /Ações rápidas/i.test((c.querySelector('h3') || {}).textContent || ''); });
            aside.insertBefore(s, actions || null);
          }
          if (!document.getElementById('taxaLiquidaEditor')) {
            var t = document.createElement('div');
            t.className = 'editor-card';
            t.id = 'taxaLiquidaEditor';
            t.innerHTML = '<h3>TAXA LÍQUIDA DO PROJETO</h3><div class="form-grid"><div class="field"><label>Taxa líquida (fator)</label><input id="edTaxaLiquida" type="number" step="0.0001" min="0" placeholder="ex.: 0,90"></div></div><p class="pp-mini-note">Fator aplicado ao valor bruto produzido para obter o LÍQUIDO (ex.: imposto 10% → 0,90). O card "Líquido" = Acumulado bruto × esta taxa.</p>';
            var actions2 = Array.from(aside.querySelectorAll('.editor-card')).find(function (c) { return /Ações rápidas/i.test((c.querySelector('h3') || {}).textContent || ''); });
            aside.insertBefore(t, actions2 || null);
          }
          syncExtraEditorFields();
        } catch (e) { }
      }
      function syncExtraEditorFields() {
        try {
          var lim = statusCfg();
          var _ativo = document.activeElement;
          var _skip = function (el) { return el && el === _ativo; };
          var ref = document.getElementById('edDiasDataRef'); if (ref && !_skip(ref)) ref.value = (config && config.dataReferencia) || '';
          var clock = document.getElementById('edRioClock'); if (clock) clock.value = rioNowString();
          var dm = document.getElementById('edDiasMesAuto'); if (dm && !_skip(dm)) dm.value = numberSafe(config && config.diasUteisMes) || '';
          var dl = document.getElementById('edDiasLancadosAuto'); if (dl && !_skip(dl)) dl.value = numberSafe(config && config.diasLancados) || '';
          var ex = document.getElementById('edStatusExcelente'); if (ex && !_skip(ex)) ex.value = fmtPctInput(lim.excelenteMin);
          var at = document.getElementById('edStatusAtencao'); if (at && !_skip(at)) at.value = fmtPctInput(lim.atencaoMin);
          var tx = document.getElementById('edTaxaLiquida');
          if (tx && !_skip(tx)) {
            var fator = (config && config.taxaLiquida != null && config.taxaLiquida !== '')
              ? numberSafe(config.taxaLiquida)
              : (1 - Math.max(0, Math.min(1, numberSafe(config && config.descontoLiquido) || 0)));
            tx.value = fator;
          }
        } catch (e) { }
      }
      function collectExtraEditorFields() {
        try {
          config = normalizeConfigObject(config);
          var dm = document.getElementById('edDiasMesAuto');
          var dl = document.getElementById('edDiasLancadosAuto');
          var dr = document.getElementById('edDiasDataRef');
          if (dm && dm.value !== '') config.diasUteisMes = numberSafe(dm.value);
          if (dl && dl.value !== '') config.diasLancados = numberSafe(dl.value);
          if (dr && dr.value.trim()) config.dataReferencia = dr.value.trim();
          var ex = document.getElementById('edStatusExcelente');
          var at = document.getElementById('edStatusAtencao');
          var exv = pctInputValue(ex && ex.value, 1.00);
          var atv = pctInputValue(at && at.value, 0.70);
          config.statusLimites = { excelenteMin: exv, atencaoMin: atv };
          config.limiteExcelente = exv;
          config.limiteAtencao = atv;
          var tx = document.getElementById('edTaxaLiquida');
          if (tx && tx.value !== '') {
            var fator = Math.max(0, numberSafe(tx.value));
            config.taxaLiquida = fator;
            config.descontoLiquido = Math.max(0, Math.min(1, 1 - fator));
          }
          var edMes = document.getElementById('edDiasMes'); if (edMes) edMes.value = config.diasUteisMes;
          var edLan = document.getElementById('edDiasLancados'); if (edLan) edLan.value = config.diasLancados;
          var edData = document.getElementById('edData'); if (edData) edData.value = config.dataReferencia;
        } catch (e) { }
      }
      window.ppGerarDiasUteisMesAtual = function () {
        try {
          var inputRef = document.getElementById('edDiasDataRef');
          var ref = parseDateBRFinal((inputRef && inputRef.value) || (config && config.dataReferencia) || '');
          var business = countBusinessInMonth(ref);
          var worked = countBusinessUntil(ref);
          var dm = document.getElementById('edDiasMesAuto'); if (dm) dm.value = business;
          var dl = document.getElementById('edDiasLancadosAuto'); if (dl) dl.value = worked;
          var edMes = document.getElementById('edDiasMes'); if (edMes) edMes.value = business;
          var edLan = document.getElementById('edDiasLancados'); if (edLan) edLan.value = worked;
          collectExtraEditorFields();
          if (typeof recalcTargets === 'function') recalcTargets();
          else { renderAll(); saveLocalSilent(); }
        } catch (e) { alert('Não foi possível gerar os dias úteis. Verifique a data referência.'); }
      };

      if (typeof editorRows === 'function') {
        var __oldEditorRows2906 = editorRows;
        editorRows = function () { __oldEditorRows2906(); ensureEditorExtras(); syncExtraEditorFields(); };
      }
      if (typeof openEditor === 'function') {
        var __oldOpenEditor2906 = openEditor;
        openEditor = function () { __oldOpenEditor2906(); ensureEditorExtras(); syncExtraEditorFields(); };
      }
      if (typeof collectEditor === 'function') {
        var __oldCollectEditor2906 = collectEditor;
        collectEditor = function () { __oldCollectEditor2906(); collectExtraEditorFields(); };
      }
      setInterval(syncExtraEditorFields, 30000);

      if (typeof buildExecutiveProject === 'function' && !buildExecutiveProject.__ppCheckWip) {
        var __oldBuildExecutiveProject2906 = buildExecutiveProject;
        buildExecutiveProject = function (project) {
          var out = __oldBuildExecutiveProject2906(project);
          try {
            var state = loadStoredProjectState(project.id);
            var fin = (state && state.config && state.config.financeiroExecutivo) || {};
            var checked = !!fin.checkAtualizado;
            out.checkUpdated = checked;
            out.lastUpdatedAt = checked ? (fin.dataHoraAtualizacao || out.lastUpdatedAt || '') : '';
            out.lastUpdateLabel = checked ? formatDateTimeBR(fin.dataHoraAtualizacao || out.lastUpdatedAt) : 'Aguardando check manual';
          } catch (e) { }
          return out;
        };
        buildExecutiveProject.__ppCheckWip = true;
      }

      function patchExecutiveFrameFinal() {
        try {
          var frame = document.getElementById('executiveFrame');
          var doc = frame && frame.contentDocument;
          if (!doc) return;
          doc.querySelectorAll('div').forEach(function (div) {
            var txt = (div.textContent || '').trim();
            var st = String(div.getAttribute('style') || '');
            if (txt.indexOf('© 2026 Painel de Produtividade') >= 0 && /position\s*:\s*fixed/i.test(st)) div.remove();
          });
          var style = doc.getElementById('ppGerencialModernStyles');
          if (!style) {
            style = doc.createElement('style');
            style.id = 'ppGerencialModernStyles';
            style.textContent = '.panel,.kpi,.exec-table tbody tr,.finance-table tbody tr,.manager-focus-card,.manager-rank-item,.alert-item,.side-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease!important}.panel:hover,.kpi:hover,.manager-focus-card:hover{transform:translateY(-2px)!important;box-shadow:0 12px 30px rgba(8,46,67,.13)!important;border-color:#C8D5E3!important}.exec-table tbody tr:hover td,.finance-table tbody tr:hover td{background:#E7F0F9!important}.manager-rank-item:hover,.alert-item:hover{transform:translateX(2px)!important;background:#FFFFFF!important;border-color:#BFD6EC!important}.side-card{background:linear-gradient(165deg,#1F6FB2,#E0A100)!important}.topbar{box-shadow:0 8px 22px rgba(8,46,67,.10)!important}.footer-note{position:static!important;text-align:center!important;margin:10px 0 0!important;color:#67707C!important;font-weight:850!important}#dayTable col:nth-child(1){width:20%!important}#dayTable col:nth-child(2){width:14%!important}#dayTable col:nth-child(3){width:14%!important}#dayTable col:nth-child(4){width:13%!important}#dayTable col:nth-child(5){width:13%!important}#dayTable col:nth-child(6){width:19%!important}#dayTable col:nth-child(7){width:7%!important}#dayTable th,#dayTable td{padding:8px 5px!important;white-space:normal!important}#dayTable th{font-size:9px!important;line-height:1.15!important;vertical-align:middle!important;text-align:right!important}#dayTable th:first-child{text-align:left!important}#dayTable td:first-child,#dayTable th:first-child{min-width:0!important}#dayTable .project-name{font-size:11px!important}#dayTable .money-cell{font-size:10px!important;white-space:nowrap!important}#accumTable col:nth-child(1){width:24%!important}#accumTable col:nth-child(2){width:16%!important}#accumTable col:nth-child(3){width:18%!important}#accumTable col:nth-child(4){width:16%!important}#accumTable col:nth-child(5){width:16%!important}#accumTable col:nth-child(6){width:10%!important}#accumTable th,#accumTable td{padding:8px 5px!important;white-space:normal!important}#accumTable th{font-size:9px!important;line-height:1.15!important;vertical-align:middle!important;text-align:right!important}#accumTable th:first-child{text-align:left!important}#accumTable td:first-child,#accumTable th:first-child{min-width:0!important}#accumTable .project-name{font-size:11px!important}#accumTable .money-cell{font-size:10px!important;white-space:nowrap!important}';
            doc.head.appendChild(style);
          }
          var footer = doc.querySelector('.footer-note');
          if (footer) { footer.textContent = COPYRIGHT_TXT_FINAL; footer.style.position = 'static'; footer.style.display = 'block'; }
          function updateSideClock() {
            try {
              var win = doc.defaultView;
              var period = (win && win.db && win.db.period) || 'Acompanhamento operacional';
              var side = doc.getElementById('sidePeriod');
              if (side) side.innerHTML = 'Período: ' + period + '<br>Dados atualizados até ' + rioNowString();
            } catch (e) { }
          }
          updateSideClock();
          if (doc.defaultView && !doc.defaultView.ppRioClockInterval) {
            doc.defaultView.ppRioClockInterval = doc.defaultView.setInterval(updateSideClock, 30000);
          }
        } catch (e) { }
      }
      if (typeof patchExecutiveFrame === 'function') {
        var __oldPatchExecutiveFrame2906 = patchExecutiveFrame;
        patchExecutiveFrame = function () { try { __oldPatchExecutiveFrame2906(); } catch (e) { } patchExecutiveFrameFinal(); };
      }
      if (typeof ppRefreshExecutiveFrame === 'function') {
        var __oldRefreshExec2906 = ppRefreshExecutiveFrame;
        ppRefreshExecutiveFrame = function () {
          try { __oldRefreshExec2906(); } catch (e) { }
          setTimeout(patchExecutiveFrameFinal, 120);
          setTimeout(patchExecutiveFrameFinal, 500);
        };
      }
      if (typeof openExecutivePanel === 'function') {
        var __oldOpenExec2906 = openExecutivePanel;
        openExecutivePanel = function () {
          __oldOpenExec2906();
          setTimeout(patchExecutiveFrameFinal, 160);
          setTimeout(patchExecutiveFrameFinal, 600);
        };
      }

      if (typeof renderAll === 'function') {
        var __oldRenderAll2906 = renderAll;
        renderAll = function () {
          __oldRenderAll2906();
          patchStatusLabels();
          ensureFooterEnd();
          try {
            var _tc = document.getElementById('teamCardPage');
            if (_tc && _tc.classList.contains('open')) {
              var _d = (typeof selectedTeamData === 'function') ? selectedTeamData() : null;
              var _assin = _d ? [_d.equipe, _d.metaMes, _d.metaAcumulada, _d.metaDia,
                _d.produzidoDia, _d.produzidoAcumulado].join('|') : 'sem-equipe';
              if (_assin !== window.__ppAssinaturaCard) {
                window.__ppAssinaturaCard = _assin;
                renderTeamCard();
              }
            } else {
              window.__ppAssinaturaCard = null;
            }
          } catch (e) { }
        };
      }
      var __ppRenderAllTimer = null;
      window.ppRenderAllDebounced = function () {
        if (__ppRenderAllTimer) clearTimeout(__ppRenderAllTimer);
        __ppRenderAllTimer = setTimeout(function () {
          __ppRenderAllTimer = null;
          try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
        }, 250);
      };
      if (typeof renderCapture === 'function') {
        var __oldRenderCapture2906 = renderCapture;
        renderCapture = function (show) { __oldRenderCapture2906(show); patchStatusLabels(); };
      }

      if (typeof saveLocalSilent === 'function') {
        var __oldSaveSilent2906 = saveLocalSilent;
        saveLocalSilent = function () { try { collectExtraEditorFields(); } catch (e) { } __oldSaveSilent2906(); };
      }
      if (typeof applyEditor === 'function') {
        var __oldApplyEditor2906 = applyEditor;
        applyEditor = function (close) { collectExtraEditorFields(); __oldApplyEditor2906(close); patchStatusLabels(); };
      }
      if (typeof saveLocal === 'function') {
        var __oldSaveLocal2906 = saveLocal;
        saveLocal = function () { collectExtraEditorFields(); __oldSaveLocal2906(); patchStatusLabels(); };
      }
      if (typeof markProjectUpdatedNow === 'function') {
        var __oldMarkProjectUpdatedNow2906 = markProjectUpdatedNow;
        markProjectUpdatedNow = function () {
          if (document.getElementById('modalBg') && document.getElementById('modalBg').classList.contains('open')) collectExtraEditorFields();
          __oldMarkProjectUpdatedNow2906();
        };
      }

      function bootFinal() {
        ensureFooterEnd();
        patchStatusLabels();
        try { if (typeof renderAll === 'function' && !document.body.classList.contains('app-locked') && !document.body.classList.contains('executive-mode')) renderAll(); } catch (e) { }
        try { patchExecutiveFrameFinal(); } catch (e) { }
      }
      bootFinal();
      setTimeout(bootFinal, 300);
      setTimeout(bootFinal, 1200);
      setInterval(function () { ensureFooterEnd(); patchExecutiveFrameFinal(); }, 120000);
    })();
