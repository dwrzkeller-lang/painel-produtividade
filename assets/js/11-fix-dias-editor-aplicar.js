    (function () {
      if (window.__ppFixDiasEditorAplicar) return;
      window.__ppFixDiasEditorAplicar = true;

      var manualValues = {};
      var applying = false;
      var timer = null;
      var dayFieldIds = [
        'edData', 'edDiasDataRef', 'ppConsolidadoData',
        'edDiasMes', 'edDiasMesAuto', 'edDiasLancados', 'edDiasLancadosAuto',
        'edRioClock'
      ];

      function el(id) { return document.getElementById(id); }
      function isOpen() { var m = el('modalBg'); return !!(m && m.classList.contains('open')); }
      function safeNumber(v) {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        var s = String(v ?? '').trim();
        if (!s) return 0;
        s = s.replace(/\s/g, '').replace(/R\$/gi, '');
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        var x = Number(s);
        return Number.isFinite(x) ? x : 0;
      }
      function getConfig() {
        try { config = (typeof normalizeConfigObject === 'function') ? normalizeConfigObject(config) : (config || {}); }
        catch (e) { try { config = config || {}; } catch (_e) { } }
        try { return config; } catch (e) { return {}; }
      }
      function setValueIfFree(id, value) {
        var input = el(id);
        if (!input) return;
        var v = (value === undefined || value === null) ? '' : String(value);
        if (document.activeElement === input) return;
        if (input.value !== v) input.value = v;
      }
      function preferredValue(ids, fallback) {
        for (var i = 0; i < ids.length; i++) {
          var input = el(ids[i]);
          if (input && String(input.value || '').trim() !== '') return String(input.value).trim();
        }
        return fallback || '';
      }
      function mirrorDaysEditorFields(cfg) {
        cfg = cfg || getConfig();
        var data = cfg.dataReferencia || '';
        var diasMes = cfg.diasUteisMes ?? '';
        var diasLanc = cfg.diasLancados ?? '';
        setValueIfFree('edData', data);
        setValueIfFree('edDiasDataRef', data);
        setValueIfFree('ppConsolidadoData', data);
        setValueIfFree('edDiasMes', diasMes);
        setValueIfFree('edDiasMesAuto', diasMes);
        setValueIfFree('edDiasLancados', diasLanc);
        setValueIfFree('edDiasLancadosAuto', diasLanc);
        var clock = el('edRioClock');
        if (clock) {
          clock.readOnly = false;
          if (!clock.value && typeof rioNowString === 'function') clock.value = rioNowString();
        }
      }
      function collectDaysEditorFields() {
        var cfg = getConfig();

        var data = preferredValue(['edDiasDataRef', 'edData', 'ppConsolidadoData'], cfg.dataReferencia || '');
        if (data) cfg.dataReferencia = data;

        var mesAuto = el('edDiasMesAuto');
        var mesBase = el('edDiasMes');
        var lancAuto = el('edDiasLancadosAuto');
        var lancBase = el('edDiasLancados');

        var diasMes = (mesAuto && mesAuto.value !== '') ? safeNumber(mesAuto.value) : ((mesBase && mesBase.value !== '') ? safeNumber(mesBase.value) : safeNumber(cfg.diasUteisMes));
        var diasLanc = (lancAuto && lancAuto.value !== '') ? safeNumber(lancAuto.value) : ((lancBase && lancBase.value !== '') ? safeNumber(lancBase.value) : safeNumber(cfg.diasLancados));

        if (diasMes >= 0) cfg.diasUteisMes = diasMes;
        if (diasLanc >= 0) cfg.diasLancados = diasLanc;
        if (cfg.diasUteisMes > 0 && cfg.diasLancados > cfg.diasUteisMes) cfg.diasLancados = cfg.diasUteisMes;

        mirrorDaysEditorFields(cfg);
        return cfg;
      }
      function applyDaysEditionNow(render) {
        if (applying) return;
        applying = true;
        try {
          collectDaysEditorFields();
          if (render !== false) {
            try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
            try { if (typeof syncConsolidadoCard === 'function') syncConsolidadoCard(); } catch (e) { }
          }
        } finally { applying = false; }
      }
      function scheduleApply() {
        clearTimeout(timer);
        timer = setTimeout(function () { applyDaysEditionNow(true); }, 160);
      }
      function bindDaysEditorFields() {
        dayFieldIds.forEach(function (id) {
          var input = el(id);
          if (!input || input.dataset.ppDaysFixed === '1') return;
          input.dataset.ppDaysFixed = '1';
          if (id === 'edRioClock') input.readOnly = false;
          input.addEventListener('focus', function () { manualValues[id] = input.value; });
          input.addEventListener('input', function () { manualValues[id] = input.value; scheduleApply(); });
          input.addEventListener('change', function () { manualValues[id] = input.value; applyDaysEditionNow(true); });
          input.addEventListener('blur', function () { manualValues[id] = input.value; applyDaysEditionNow(true); });
        });
        mirrorDaysEditorFields(getConfig());
      }

      var oldGerar = window.ppGerarDiasUteisMesAtual;
      window.ppGerarDiasUteisMesAtual = function () {
        try {
          if (typeof oldGerar === 'function') oldGerar.apply(this, arguments);
        } catch (e) {
          try {
            var inputRef = el('edDiasDataRef') || el('edData');
            var ref = (typeof parseDateBRFinal === 'function') ? parseDateBRFinal((inputRef && inputRef.value) || getConfig().dataReferencia || '') : null;
            if (ref && typeof countBusinessInMonth === 'function' && typeof countBusinessUntil === 'function') {
              if (el('edDiasMesAuto')) el('edDiasMesAuto').value = countBusinessInMonth(ref);
              if (el('edDiasLancadosAuto')) el('edDiasLancadosAuto').value = countBusinessUntil(ref);
            }
          } catch (_e) { }
        }
        bindDaysEditorFields();
        applyDaysEditionNow(true);
      };

      if (typeof openEditor === 'function' && !openEditor.__ppDiasEditorAplicarFix) {
        var oldOpen = openEditor;
        openEditor = function () {
          var r = oldOpen.apply(this, arguments);
          setTimeout(function () { bindDaysEditorFields(); applyDaysEditionNow(false); }, 60);
          setTimeout(bindDaysEditorFields, 250);
          return r;
        };
        openEditor.__ppDiasEditorAplicarFix = true;
      }
      if (typeof editorRows === 'function' && !editorRows.__ppDiasEditorAplicarFix) {
        var oldRows = editorRows;
        editorRows = function () {
          var r = oldRows.apply(this, arguments);
          bindDaysEditorFields();
          return r;
        };
        editorRows.__ppDiasEditorAplicarFix = true;
      }
      if (typeof collectEditor === 'function' && !collectEditor.__ppDiasEditorAplicarFix) {
        var oldCollect = collectEditor;
        collectEditor = function () {
          var r = oldCollect.apply(this, arguments);
          collectDaysEditorFields();
          return r;
        };
        collectEditor.__ppDiasEditorAplicarFix = true;
      }
      if (typeof applyEditor === 'function' && !applyEditor.__ppDiasEditorAplicarFix) {
        var oldApply = applyEditor;
        applyEditor = function () {
          collectDaysEditorFields();
          var r = oldApply.apply(this, arguments);
          collectDaysEditorFields();
          try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
          try { if (typeof saveLocalSilent === 'function') saveLocalSilent(); } catch (e) { }
          return r;
        };
        applyEditor.__ppDiasEditorAplicarFix = true;
      }

      document.addEventListener('input', function (ev) {
        var t = ev && ev.target;
        if (t && dayFieldIds.indexOf(t.id) >= 0) { manualValues[t.id] = t.value; scheduleApply(); }
      }, true);

      (function cicloApenasComEditorAberto() {
        var ciclo = null;

        function passo() {
          dayFieldIds.forEach(function (id) {
            var input = el(id);
            if (input && document.activeElement === input && manualValues[id] !== undefined && input.value !== manualValues[id]) input.value = manualValues[id];
          });
          bindDaysEditorFields();
        }
        function ligar() {
          if (ciclo) return;
          passo();
          ciclo = setInterval(passo, 700);
        }
        function desligar() {
          if (!ciclo) return;
          clearInterval(ciclo);
          ciclo = null;
        }
        function sincronizar() { if (isOpen()) ligar(); else desligar(); }

        var modal = el('modalBg');
        if (!modal || typeof MutationObserver !== 'function') {
          setInterval(function () { if (isOpen()) passo(); }, 700);
          return;
        }
        new MutationObserver(sincronizar).observe(modal, { attributes: true, attributeFilter: ['class'] });
        sincronizar();
      })();

      setTimeout(bindDaysEditorFields, 300);
    })();
