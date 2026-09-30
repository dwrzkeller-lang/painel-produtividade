    (function () {
      function initPfinFloatingTooltip() {
        var bg = document.getElementById('projectFinanceBg');
        if (!bg || bg.classList.contains('pfin-floating-ready')) return;
        var tooltip = document.createElement('div');
        tooltip.id = 'pfinFloatingTooltip';
        tooltip.className = 'pfin-floating-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        bg.appendChild(tooltip);
        bg.classList.add('pfin-floating-ready');
        var active = null;

        function hide() {
          active = null;
          tooltip.classList.remove('is-visible');
          tooltip.removeAttribute('style');
        }

        function show(help) {
          if (!help) return;
          var text = String(help.getAttribute('data-tip') || '').trim();
          var column = String(help.getAttribute('data-column') || '').trim();
          var modal = help.closest('.modal');
          if (!text || !modal) return;
          active = help;
          tooltip.textContent = '';
          if (column) {
            var columnEl = document.createElement('strong');
            columnEl.className = 'pfin-floating-tooltip-column';
            columnEl.textContent = column;
            tooltip.appendChild(columnEl);
          }
          var textEl = document.createElement('span');
          textEl.className = 'pfin-floating-tooltip-text';
          textEl.textContent = text;
          tooltip.appendChild(textEl);
          tooltip.style.maxWidth = Math.max(160, Math.min(280, modal.clientWidth - 28)) + 'px';
          tooltip.style.left = '0px';
          tooltip.style.top = '0px';
          tooltip.classList.add('is-visible');

          var anchor = help.getBoundingClientRect();
          var bounds = modal.getBoundingClientRect();
          var box = tooltip.getBoundingClientRect();
          var gap = 8;
          var minLeft = bounds.left + 12;
          var maxLeft = Math.max(minLeft, bounds.right - box.width - 12);
          var left = anchor.left + (anchor.width / 2) - (box.width / 2);
          left = Math.max(minLeft, Math.min(maxLeft, left));

          var top = anchor.bottom + gap;
          if (top + box.height > bounds.bottom - 10) top = anchor.top - box.height - gap;
          top = Math.max(bounds.top + 10, Math.min(bounds.bottom - box.height - 10, top));
          tooltip.style.left = Math.round(left) + 'px';
          tooltip.style.top = Math.round(top) + 'px';
          help.setAttribute('aria-describedby', tooltip.id);
        }

        bg.addEventListener('mouseover', function (event) {
          var help = event.target && event.target.closest ? event.target.closest('.pfin-help') : null;
          if (help && help !== active) show(help);
        });
        bg.addEventListener('mouseout', function (event) {
          var help = event.target && event.target.closest ? event.target.closest('.pfin-help') : null;
          if (help && (!event.relatedTarget || !help.contains(event.relatedTarget))) hide();
        });
        bg.addEventListener('focusin', function (event) {
          var help = event.target && event.target.closest ? event.target.closest('.pfin-help') : null;
          if (help) show(help);
        });
        bg.addEventListener('focusout', function (event) {
          if (event.target && event.target.classList && event.target.classList.contains('pfin-help')) hide();
        });
        bg.addEventListener('keydown', function (event) { if (event.key === 'Escape') hide(); });
        var body = bg.querySelector('.modal-body');
        if (body) body.addEventListener('scroll', hide, { passive: true });
        window.addEventListener('resize', hide, { passive: true });
      }

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPfinFloatingTooltip);
      else initPfinFloatingTooltip();
    })();
