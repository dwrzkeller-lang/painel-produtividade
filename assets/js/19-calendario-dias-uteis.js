    (function () {
      "use strict";
      if (window.__ppCalendarioDiasUteis) return;
      window.__ppCalendarioDiasUteis = true;

      var CAMPO_CONFIG = 'ppDiasDoMes';
      var VAZIO = 0, UTIL = 1, FDS = 2;
      var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      var mesAberto = null;
      var marcasEmEdicao = null;
      var informados = {};

      function el(id) { return document.getElementById(id); }
      function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
      function dinheiro(v) {
        try { return 'R$ ' + n(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        catch (e) { return 'R$ ' + n(v).toFixed(2); }
      }
      function chaveMes(ano, mes) { return ano + '-' + String(mes).padStart(2, '0'); }

      function lerSalvo() {
        try {
          var c = (typeof config !== 'undefined' && config) ? config : {};
          var t = c[CAMPO_CONFIG];
          return (t && typeof t === 'object') ? t : {};
        } catch (e) { return {}; }
      }

      function padraoDoMes(ano, mes) {
        var marcas = {};
        var dias = new Date(ano, mes, 0).getDate();
        for (var d = 1; d <= dias; d++) {
          var semana = new Date(ano, mes - 1, d).getDay();
          marcas[d] = (semana >= 1 && semana <= 5) ? UTIL : VAZIO;
        }
        return marcas;
      }

      function marcasDoMes(ano, mes) {
        var chave = chaveMes(ano, mes);
        var salvo = lerSalvo()[chave];
        if (salvo && typeof salvo === 'object' && Object.keys(salvo).length) {
          var copia = {};
          Object.keys(salvo).forEach(function (k) { copia[k] = Number(salvo[k]) || VAZIO; });
          return copia;
        }
        return padraoDoMes(ano, mes);
      }

      var memoriaCiclo = null;
      function memo(chave, calcular) {
        if (!memoriaCiclo) {
          memoriaCiclo = {};
          setTimeout(function () { memoriaCiclo = null; }, 0);
        }
        if (!(chave in memoriaCiclo)) memoriaCiclo[chave] = calcular();
        return memoriaCiclo[chave];
      }

      function bancoDoCiclo() {
        return memo('banco', function () {
          try {
            return (typeof getDailyBank === 'function' && getDailyBank()) || {};
          } catch (e) { return {}; }
        });
      }

      function somaTaxasDia() {
        return memo('somaTaxas', function () {
          try {
            if (typeof equipes === 'undefined' || !Array.isArray(equipes)) return 0;
            return equipes.reduce(function (s, e) {
              var taxa = n(e && e.metaDia);
              return taxa > 0 ? s + taxa : s;
            }, 0);
          } catch (e) { return 0; }
        });
      }

      var SEMENTE_FDS = {};

      var CONSERTO_FDS_DUPLICADO = {};

      var CAMPO_SAB_ATIVO = 'metaSabadoAtiva';
      var CAMPO_DOM_ATIVO = 'metaDomingoAtiva';
      var CAMPO_CALENDARIO_NA_META = 'usarCalendarioNaMeta';
      var CAMPO_SOMAR_ACUM = 'somarAcumuladoDoBanco';

      function somarAcumuladoAtivo() {
        try {
          var v = (typeof config !== 'undefined' && config) ? config[CAMPO_SOMAR_ACUM] : undefined;
          return v === true || v === 'true' || v === 1 || v === '1';
        } catch (e) { return false; }
      }

      function idDoProjeto() {
        try { return String(window.currentProjectId || ''); } catch (e) { return ''; }
      }

      function valorInformadoFds(cfg, qual) {
        try {
          var fin = (cfg && cfg.financeiroExecutivo) || {};
          var campo = qual === 'dom' ? 'projCalMetaDomingo' : 'projCalMetaSabado';
          var v = fin[campo];
          if (v !== null && v !== undefined && String(v).trim() !== '') return n(v);
          var movs = Array.isArray(fin.movimentos) ? fin.movimentos : [];
          for (var i = movs.length - 1; i >= 0; i--) {
            var m = movs[i];
            if (m && m[campo] !== null && m[campo] !== undefined && String(m[campo]).trim() !== '') return n(m[campo]);
          }
        } catch (e) { }
        return null;
      }

      function fdsAtivo(cfg, qual, projetoId) {
        try {
          var campo = qual === 'dom' ? CAMPO_DOM_ATIVO : CAMPO_SAB_ATIVO;
          var marca = cfg ? cfg[campo] : undefined;
          if (marca === true || marca === 'true' || marca === 1 || marca === '1') return true;
          if (marca === false || marca === 'false' || marca === 0 || marca === '0') return false;

          var semente = SEMENTE_FDS[projetoId || idDoProjeto()];
          return !!(semente && n(semente[qual]) > 0);
        } catch (e) { return false; }
      }

      function valorFdsDoEstado(cfg, qual, projetoId) {
        if (!fdsAtivo(cfg, qual, projetoId)) return 0;
        var informado = valorInformadoFds(cfg, qual);
        if (informado !== null) return informado;
        var semente = SEMENTE_FDS[projetoId || idDoProjeto()];
        return semente ? n(semente[qual]) : 0;
      }

      function valorFimDeSemana(qual) {
        return memo('fds:' + qual, function () {
          try {
            return valorFdsDoEstado((typeof config !== 'undefined' && config) ? config : {}, qual, idDoProjeto());
          } catch (e) { return 0; }
        });
      }

      function contratoTemMetaFds() {
        return valorFimDeSemana('sab') > 0 || valorFimDeSemana('dom') > 0;
      }

      function calendarioEntraNaMeta() {
        return false;
      }

      function ehSabado(ano, mes, dia) { return new Date(ano, mes - 1, dia).getDay() === 6; }
      function ehDomingo(ano, mes, dia) { return new Date(ano, mes - 1, dia).getDay() === 0; }

      /* Soma as metas dos dias marcados. `ateDia` limita ao que já correu: */
      function calcularMeta(ano, mes, marcas, ateDia) {
        var taxas = somaTaxasDia();
        var vSab = valorFimDeSemana('sab');
        var vDom = valorFimDeSemana('dom');
        var uteis = 0, sabados = 0, domingos = 0;
        Object.keys(marcas).forEach(function (k) {
          var dia = Number(k);
          if (!dia) return;
          if (ateDia && dia > ateDia) return;
          var estado = Number(marcas[k]) || VAZIO;
          if (estado === VAZIO) return;
          if (ehSabado(ano, mes, dia)) sabados++;
          else if (ehDomingo(ano, mes, dia)) domingos++;
          else uteis++;
        });
        return {
          uteis: uteis, sabados: sabados, domingos: domingos,
          total: uteis * taxas + sabados * vSab + domingos * vDom,
          taxas: taxas, vSab: vSab, vDom: vDom
        };
      }

      function mesInicial() {
        try {
          var ref = String((config && config.dataReferencia) || '').trim();
          var p = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (p) return { ano: Number(p[3]), mes: Number(p[2]) };
        } catch (e) { }
        var hoje = new Date();
        return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
      }

      function montarCartaoRegras() {
        var modal = el('modalBg');
        if (!modal) return;
        var aside = modal.querySelector('.modal-body aside');
        if (!aside || el('ppRegrasMetaCard')) return;

        var card = document.createElement('div');
        card.className = 'editor-card';
        card.id = 'ppRegrasMetaCard';
        card.innerHTML =
          '<h3>Meta de fim de semana</h3>' +
          '<p class="pp-mini-note" style="margin:0 0 8px">Valor bruto do CSV. Em branco ou zero, ' +
          'o dia <b>não conta meta</b> nos dois painéis.</p>' +
          '<div class="pp-regra-dupla">' +
          '  <div class="field"><label>Meta do sábado</label>' +
          '  <input id="ppRegraSabValor" type="number" step="0.01" min="0" placeholder="0,00"></div>' +
          '  <div class="field"><label>Meta do domingo</label>' +
          '  <input id="ppRegraDomValor" type="number" step="0.01" min="0" placeholder="0,00"></div>' +
          '</div>' +
          '<input type="checkbox" id="ppRegraSab" hidden>' +
          '<input type="checkbox" id="ppRegraDom" hidden>' +
          '<input type="checkbox" id="ppRegraSomarAcum" hidden>' +
          '<h3 style="margin-top:14px">Feriados do mês</h3>' +
          '<p class="pp-mini-note" style="margin:0 0 6px">Datas que <b>não contam meta</b>. ' +
          'Separe por vírgula: <b>07/09, 20/11</b> ou <b>07/09/2026</b>. ' +
          'Feriados nacionais já são considerados. Informe só os locais.</p>' +
          '<div class="field"><input id="ppFeriadosExtras" type="text" ' +
          'placeholder="ex.: 24/06, 15/08"></div>';
        aside.insertBefore(card, aside.firstChild);

        ['ppRegraSabValor', 'ppRegraDomValor'].forEach(function (id) {
          var campo = el(id);
          if (campo) campo.addEventListener('input', sincronizarRegras);
        });
      }

      function sincronizarRegras() {
        var pares = [['ppRegraSab', 'ppRegraSabValor'], ['ppRegraDom', 'ppRegraDomValor']];
        pares.forEach(function (par) {
          var caixa = el(par[0]), valor = el(par[1]);
          if (!caixa || !valor) return;
          caixa.checked = Number(String(valor.value || '').replace(',', '.')) > 0;
          valor.disabled = false;
          valor.style.opacity = '1';
        });
      }

      function preencherRegras() {
        try {
          montarCartaoRegras();
          var cfg = (typeof config !== 'undefined' && config) ? config : {};
          var pid = idDoProjeto();

          var sab = el('ppRegraSab'), dom = el('ppRegraDom');
          if (sab) sab.checked = fdsAtivo(cfg, 'sab', pid);
          if (dom) dom.checked = fdsAtivo(cfg, 'dom', pid);

          var vSab = el('ppRegraSabValor'), vDom = el('ppRegraDomValor');
          if (vSab) vSab.value = valorFdsDoEstado(cfg, 'sab', pid) || '';
          if (vDom) vDom.value = valorFdsDoEstado(cfg, 'dom', pid) || '';

          var som = el('ppRegraSomarAcum');
          if (som) som.checked = somarAcumuladoAtivo();

          var fer = el('ppFeriadosExtras');
          if (fer) {
            var lista = (cfg && Array.isArray(cfg.feriadosExtras)) ? cfg.feriadosExtras : [];
            fer.value = lista.join(', ');
          }

          sincronizarRegras();
        } catch (e) { }
      }

      function coletarRegras() {
        try {
          var sab = el('ppRegraSab'), dom = el('ppRegraDom');
          if (!sab && !dom) return;

          config[CAMPO_SAB_ATIVO] = !!(sab && sab.checked);
          config[CAMPO_DOM_ATIVO] = !!(dom && dom.checked);

          var som = el('ppRegraSomarAcum');
          if (som) config[CAMPO_SOMAR_ACUM] = !!som.checked;

          if (!config.financeiroExecutivo || typeof config.financeiroExecutivo !== 'object') {
            config.financeiroExecutivo = {};
          }
          var vSab = el('ppRegraSabValor'), vDom = el('ppRegraDomValor');
          config.financeiroExecutivo.projCalMetaSabado =
            (sab && sab.checked) ? Math.max(0, n(vSab && vSab.value)) : 0;
          config.financeiroExecutivo.projCalMetaDomingo =
            (dom && dom.checked) ? Math.max(0, n(vDom && vDom.value)) : 0;

          var fer = el('ppFeriadosExtras');
          if (fer) {
            var limpos = String(fer.value || '')
              .split(/[,;\n]/)
              .map(function (t) { return String(t).trim(); })
              .filter(function (t) { return /^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(t); })
              .map(function (t) {
                var p = t.split('/');
                var d2 = function (x) { return (Number(x) < 10 ? '0' : '') + Number(x); };
                return p.length === 3 ? (d2(p[0]) + '/' + d2(p[1]) + '/' + p[2]) : (d2(p[0]) + '/' + d2(p[1]));
              });
            config.feriadosExtras = limpos.filter(function (v, i) { return limpos.indexOf(v) === i; });
            fer.value = config.feriadosExtras.join(', ');
          }
        } catch (e) { }
      }

      function navegar(passo) {
        if (!mesAberto) return;
        var p = mesAberto.split('-');
        var d = new Date(Number(p[0]), Number(p[1]) - 1 + passo, 1);
        abrirMes(d.getFullYear(), d.getMonth() + 1);
      }

      function abrirMes(ano, mes) {
        mesAberto = chaveMes(ano, mes);
        if (!marcasEmEdicao) marcasEmEdicao = {};
        if (!marcasEmEdicao[mesAberto]) marcasEmEdicao[mesAberto] = marcasDoMes(ano, mes);
        desenhar();
      }

      function desenhar() {
        if (!mesAberto) return;
        var p = mesAberto.split('-');
        var ano = Number(p[0]), mes = Number(p[1]);
        var marcas = marcasEmEdicao[mesAberto];

        var titulo = el('ppCalTitulo');
        if (titulo) titulo.textContent = MESES[mes - 1] + ' / ' + ano;

        var grade = el('ppCalGrade');
        if (!grade) return;
        var html = '';
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(function (s) {
          html += '<span class="pp-cal-dow">' + s + '</span>';
        });
        var primeiro = new Date(ano, mes - 1, 1).getDay();
        for (var v = 0; v < primeiro; v++) html += '<span class="pp-cal-vago"></span>';
        var dias = new Date(ano, mes, 0).getDate();
        for (var d = 1; d <= dias; d++) {
          var estado = Number(marcas[d]) || VAZIO;
          var cls = 'pp-cal-dia';
          if (estado === UTIL) cls += ' e-util';
          else if (estado === FDS) cls += ' e-fds';
          if (ehSabado(ano, mes, d) || ehDomingo(ano, mes, d)) cls += ' e-fimsemana';
          html += '<button type="button" class="' + cls + '" data-dia="' + d + '">' + d + '</button>';
        }
        grade.innerHTML = html;

        Array.prototype.forEach.call(grade.querySelectorAll('.pp-cal-dia'), function (b) {
          b.onclick = function () {
            var dia = Number(b.getAttribute('data-dia'));
            var atual = Number(marcas[dia]) || VAZIO;
            marcas[dia] = atual === VAZIO ? UTIL : (atual === UTIL ? FDS : VAZIO);
            desenhar();
          };
        });

        atualizarResumo(ano, mes, marcas);
      }

      function atualizarResumo(ano, mes, marcas) {
        var caixa = el('ppCalResumo');
        if (!caixa) return;

        var hoje = new Date();
        var mesmoMes = (hoje.getFullYear() === ano && (hoje.getMonth() + 1) === mes);
        var futuro = (ano > hoje.getFullYear()) || (ano === hoje.getFullYear() && mes > (hoje.getMonth() + 1));
        var ate = mesmoMes ? hoje.getDate() : (futuro ? 0 : 31);

        var mesInteiro = calcularMeta(ano, mes, marcas, 0);
        var acumulada = calcularMeta(ano, mes, marcas, ate);

        var manual = informados[mesAberto] || {};
        if (manual.uteis !== undefined || manual.sabados !== undefined) {
          if (manual.uteis !== undefined) mesInteiro.uteis = manual.uteis;
          if (manual.sabados !== undefined) mesInteiro.sabados = manual.sabados;
          mesInteiro.total = mesInteiro.uteis * mesInteiro.taxas +
            mesInteiro.sabados * mesInteiro.vSab +
            mesInteiro.domingos * mesInteiro.vDom;
        }

        var metaMesCsv = 0;
        try {
          if (typeof equipes !== 'undefined' && Array.isArray(equipes)) {
            metaMesCsv = equipes.reduce(function (s, e) { return s + n(e && e.metaMes); }, 0);
          }
        } catch (e) { }
        var pesoMes = mesInteiro.total;
        var pesoAte = acumulada.total;
        var divergencia = metaMesCsv - mesInteiro.total;

        caixa.innerHTML =
          '<div class="pp-cal-linha"><span>Dias úteis marcados</span><b>' + mesInteiro.uteis + '</b></div>' +
          '<div class="pp-cal-linha"><span>Sábados trabalhados</span><b>' + mesInteiro.sabados + '</b></div>' +
          (mesInteiro.domingos ? '<div class="pp-cal-linha"><span>Domingos trabalhados</span><b>' + mesInteiro.domingos + '</b></div>' : '') +
          '<div class="pp-cal-linha"><span>Soma das taxas/dia</span><b>' + dinheiro(mesInteiro.taxas) + '</b></div>' +
          '<div class="pp-cal-linha"><span>Valor do sábado</span><b>' + dinheiro(mesInteiro.vSab) + '</b></div>' +
          '<div class="pp-cal-linha destaque"><span>Meta do mês (pelas taxas)</span><b>' + dinheiro(mesInteiro.total) + '</b></div>' +
          '<div class="pp-cal-linha"><span>Meta mês somada do CSV</span><b>' + dinheiro(metaMesCsv) + '</b></div>' +
          (Math.abs(divergencia) > 0.5
            ? '<div class="pp-cal-linha" style="color:#B3321F"><span>CSV desatualizado em</span><b style="color:#B3321F">' + dinheiro(divergencia) + '</b></div>'
            : '') +
          '<div class="pp-cal-linha"><span>Ritmo decorrido</span><b>' +
          (pesoMes > 0 ? ((pesoAte / pesoMes) * 100).toFixed(2).replace('.', ',') + '%' : '-') + '</b></div>' +
          '<div class="pp-cal-linha destaque"><span>Meta acumulada até ' +
          (mesmoMes ? ('hoje (dia ' + ate + ')') : (futuro ? 'agora' : 'o fim do mês')) +
          '</span><b>' + dinheiro(pesoAte) + '</b></div>';
      }

      var abrirOriginal = window.openEditor;
      if (typeof abrirOriginal === 'function') {
        window.openEditor = function () {
          var r = abrirOriginal.apply(this, arguments);
          setTimeout(function () {
            try {
              preencherRegras();
            } catch (e) { }
          }, 80);
          return r;
        };
        try { openEditor = window.openEditor; } catch (e) { }
      }

      var coletarOriginal = window.collectEditor;
      if (typeof coletarOriginal === 'function') {
        window.collectEditor = function () {
          var r = coletarOriginal.apply(this, arguments);
          try { coletarRegras(); } catch (e) { }
          return r;
        };
        try { collectEditor = window.collectEditor; } catch (e) { }
      }

      function mesEmEdicao() {
        try {
          var sel = el('ppProdPeriodMonth');
          if (sel && /^\d{4}-\d{2}$/.test(String(sel.value || ''))) return sel.value;
        } catch (e) { }
        if (mesAberto) return mesAberto;
        var i = mesInicial();
        return chaveMes(i.ano, i.mes);
      }

      function filtrarHistoricoPorMes() {
        try {
          var lista = el('historyEditor');
          if (!lista) return;
          var mes = mesEmEdicao();
          var ocultas = 0, visiveis = 0;

          Array.prototype.forEach.call(lista.children, function (linha) {
            if (linha.classList && linha.classList.contains('pp-hist-aviso')) return;
            var campo = linha.querySelector ? linha.querySelector('input') : null;
            var valor = campo ? String(campo.value || '').trim() : '';
            var p = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            var doMes = p ? (p[3] + '-' + String(Number(p[2])).padStart(2, '0')) === mes : true;
            linha.style.display = doMes ? '' : 'none';
            if (doMes) visiveis++; else ocultas++;
          });

          var aviso = lista.querySelector('.pp-hist-aviso');
          if (ocultas > 0) {
            if (!aviso) {
              aviso = document.createElement('div');
              aviso.className = 'pp-hist-aviso';
              lista.appendChild(aviso);
            }
            var partes = String(mes).split('-');
            aviso.textContent = 'Mostrando apenas ' + (partes[1] || '') + '/' + (partes[0] || '') +
              ' · ' + ocultas + ' lançamento(s) de outros meses ocultos' +
              (visiveis === 0 ? '. Nenhum lançamento neste mês ainda.' : '.');
          } else if (aviso) {
            aviso.remove();
          }
        } catch (e) { }
      }

      function removerDatasRepetidas() {
        try {
          if (typeof historico === 'undefined' || !Array.isArray(historico)) return false;
          var vistos = {}, limpo = [];
          for (var i = historico.length - 1; i >= 0; i--) {
            var h = historico[i];
            var d = String((h && h.data) || '').trim();
            if (!d) { limpo.unshift(h); continue; }
            if (vistos[d]) continue;
            vistos[d] = true;
            limpo.unshift(h);
          }
          if (limpo.length === historico.length) return false;
          historico.length = 0;
          Array.prototype.push.apply(historico, limpo);
          return true;
        } catch (e) { return false; }
      }

      var linhasOriginal = window.editorRows;
      if (typeof linhasOriginal === 'function') {
        window.editorRows = function () {
          try { removerDatasRepetidas(); } catch (e) { }
          var r = linhasOriginal.apply(this, arguments);
          try { filtrarHistoricoPorMes(); } catch (e) { }
          return r;
        };
        try { editorRows = window.editorRows; } catch (e) { }
      }

      (function vigiarHistorico() {
        var tamanho = -1;
        setInterval(function () {
          try {
            var modal = el('modalBg');
            if (!modal || !modal.classList.contains('open')) return;
            var atual = (typeof historico !== 'undefined' && Array.isArray(historico)) ? historico.length : 0;
            if (atual === tamanho) return;
            tamanho = atual;
            if (removerDatasRepetidas() && typeof editorRows === 'function') { editorRows(); return; }
            filtrarHistoricoPorMes();
          } catch (e) { }
        }, 900);
      })();

      var mesTrocadoOriginal = window.ppProductionPeriodMonthChanged;
      if (typeof mesTrocadoOriginal === 'function') {
        window.ppProductionPeriodMonthChanged = function (mes) {
          var r = mesTrocadoOriginal.apply(this, arguments);
          try { filtrarHistoricoPorMes(); } catch (e) { }
          try {
            var p = String(mes || '').match(/^(\d{4})-(\d{2})$/);
            if (p) abrirMes(Number(p[1]), Number(p[2]));
          } catch (e) { }
          return r;
        };
      }

      function contarDias(mesChave, ateDia) {
        return memo('dias:' + mesChave + ':' + ateDia, function () {
          return contarDiasCalculo(mesChave, ateDia);
        });
      }

      function pascoaDe(ano) {
        var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
        var d = Math.floor(b / 4), e = b % 4;
        var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4), k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var mes = Math.floor((h + l - 7 * m + 114) / 31);
        var dia = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(ano, mes - 1, dia);
      }

      function feriadosNacionais(ano) {
        return memo('feriadosNacionais::' + ano, function () {
          var mapa = {};
          var doisDig = function (n) { return (n < 10 ? '0' : '') + n; };
          var marcar = function (dia, mes) { mapa[doisDig(dia) + '/' + doisDig(mes)] = true; };
          marcar(1, 1);
          marcar(21, 4);
          marcar(1, 5);
          marcar(7, 9);
          marcar(12, 10);
          marcar(2, 11);
          marcar(15, 11);
          marcar(20, 11);
          marcar(25, 12);
          try {
            var p = pascoaDe(ano);
            var sexta = new Date(p.getFullYear(), p.getMonth(), p.getDate() - 2);
            marcar(sexta.getDate(), sexta.getMonth() + 1);
          } catch (e) { }
          return mapa;
        });
      }

      function feriadosExtrasDoConfig(cfg, ano, mes, dia) {
        try {
          var lista = cfg && cfg.feriadosExtras;
          if (!Array.isArray(lista) || !lista.length) return false;
          var p = function (n) { return (n < 10 ? '0' : '') + n; };
          var completo = p(dia) + '/' + p(mes) + '/' + ano;
          var curto = p(dia) + '/' + p(mes);
          var solto = dia + '/' + mes;
          for (var i = 0; i < lista.length; i++) {
            var v = String(lista[i] || '').trim();
            if (v === completo || v === curto || v === solto) return true;
          }
        } catch (e) { }
        return false;
      }

      function ehFeriadoPorCsv(cfg, ano, mes, dia, projetoId) {
        try {
          var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
          var nac = feriadosNacionais(ano);
          if (nac && nac[p2(dia) + '/' + p2(mes)]) return true;
        } catch (e) { }

        if (feriadosExtrasDoConfig(cfg, ano, mes, dia)) return true;

        return false;
      }

      function partesDaData(v) {
        try {
          if (v instanceof Date && !isNaN(v.getTime())) {
            return { dia: v.getDate(), mes: v.getMonth() + 1, ano: v.getFullYear() };
          }
          var m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!m) return null;
          return { dia: Number(m[1]), mes: Number(m[2]), ano: Number(m[3]) };
        } catch (e) { return null; }
      }

      function diasDeSemanaAte(ano, mes, ateDia) {
        var ultimo = new Date(ano, mes, 0).getDate();
        var limite = Math.min(Number(ateDia) || ultimo, ultimo);
        var c = 0;
        for (var d = 1; d <= limite; d++) {
          var dw = new Date(ano, mes - 1, d).getDay();
          if (dw !== 0 && dw !== 6) c++;
        }
        return c;
      }

      function diasUteisAteData(cfg, ano, mes, ateDia) {
        var ultimo = new Date(ano, mes, 0).getDate();
        var limite = Math.min(Number(ateDia) || ultimo, ultimo);
        var c = 0;
        for (var d = 1; d <= limite; d++) {
          var dw = new Date(ano, mes - 1, d).getDay();
          if (dw === 0 || dw === 6) continue;
          if (ehFeriadoPorCsv(cfg, ano, mes, d)) continue;
          c++;
        }
        return c;
      }

      window.ppDiasUteisAte = function (cfg, data) {
        var p = partesDaData(data);
        return p ? diasUteisAteData(cfg, p.ano, p.mes, p.dia) : NaN;
      };

      window.ppDiasUteisDoMes = function (cfg, data) {
        var p = partesDaData(data);
        return p ? diasUteisAteData(cfg, p.ano, p.mes, new Date(p.ano, p.mes, 0).getDate()) : NaN;
      };

      function refDaConfig(cfg) {
        var p = partesDaData(cfg && cfg.dataReferencia);
        if (p) return p;
        try { return partesDaData(typeof window.dailyKey === 'function' ? window.dailyKey() : ''); }
        catch (e) { return null; }
      }

      window.ppDiasDecorridosCorrigidos = function (cfg) {
        var ds = n(cfg && cfg.diasLancados);
        try {
          var ref = refDaConfig(cfg);
          if (!ref || !(ds > 0)) return ds;
          var antigo = diasDeSemanaAte(ref.ano, ref.mes, ref.dia);
          var certo = diasUteisAteData(cfg, ref.ano, ref.mes, ref.dia);
          if (certo === antigo) return ds;
          if (ds === antigo || ds === Math.max(1, antigo)) return certo;
          return ds;
        } catch (e) { return ds; }
      };

      function metaAcumCorrigidaPeloFeriado(metaAcum, metaDia, cfg) {
        try {
          metaAcum = n(metaAcum); metaDia = n(metaDia);
          if (!(metaAcum > 0) || !(metaDia > 0)) return null;
          var ref = refDaConfig(cfg);
          if (!ref) return null;
          var antigo = diasDeSemanaAte(ref.ano, ref.mes, ref.dia);
          var certo = diasUteisAteData(cfg, ref.ano, ref.mes, ref.dia);
          if (certo === antigo) return null;
          var folga = Math.max(0.05, metaAcum * 0.0005);
          var gravadoComFeriado = [antigo, Math.max(1, antigo)].some(function (d) {
            return Math.abs(metaAcum - metaDia * d) <= folga;
          });
          if (!gravadoComFeriado) return null;
          return Math.round(metaDia * certo * 100) / 100;
        } catch (e) { return null; }
      }
      window.ppMetaAcumCorrigidaPeloFeriado = metaAcumCorrigidaPeloFeriado;

      function contarDiasCalculo(mesChave, ateDia) {
        var partes = mesChave.split('-');
        var ano = Number(partes[0]), mes = Number(partes[1]);
        var diasTrabalhados = {};

        function registrar(dia, origem) {
          dia = Number(dia);
          if (!dia || dia < 1 || dia > 31) return;
          if (ateDia && dia > ateDia) return;
          if (!diasTrabalhados[dia]) diasTrabalhados[dia] = { calendario: false, producao: false };
          diasTrabalhados[dia][origem] = true;
        }
        function registrarData(valor, origem) {
          var texto = String(valor || '').trim();
          var completa = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (completa) {
            if (chaveMes(Number(completa[3]), Number(completa[2])) !== mesChave) return;
            registrar(Number(completa[1]), origem);
            return;
          }
          var curta = texto.match(/^(\d{1,2})\/(\d{1,2})$/);
          if (curta) {
            if (Number(curta[2]) !== mes) return;
            registrar(Number(curta[1]), origem);
          }
        }

        try {
          if (calendarioEntraNaMeta()) {
            var salvo = lerSalvo()[mesChave];
            if (salvo && typeof salvo === 'object') {
              Object.keys(salvo).forEach(function (k) {
                if ((Number(salvo[k]) || VAZIO) !== VAZIO) registrar(k, 'calendario');
              });
            }
          }
        } catch (e) { }

        function metaDoBanco(registro) {
          if (!registro || typeof registro !== 'object') return null;
          var campos = ['totalMetaDia', 'metaDia', 'totalMeta'];
          for (var i = 0; i < campos.length; i++) {
            var v = Number(registro[campos[i]]);
            if (isFinite(v)) return v;
          }
          try {
            if (Array.isArray(registro.equipes) && registro.equipes.length) {
              var soma = 0, achou = false;
              registro.equipes.forEach(function (e) {
                var m = Number(e && e.metaDia);
                if (isFinite(m)) { soma += m; achou = true; }
              });
              if (achou) return soma;
            }
          } catch (e) { }
          return null;
        }

        var metaPorDia = {};

        function producaoDoBanco(registro) {
          if (!registro || typeof registro !== 'object') return 0;
          var campos = ['totalProduzidoDia', 'produzidoDia', 'totalProduzido', 'total'];
          for (var i = 0; i < campos.length; i++) {
            var v = Number(registro[campos[i]]);
            if (isFinite(v) && v > 0) return v;
          }
          return 0;
        }

        try {
          {
            var banco = bancoDoCiclo();
            Object.keys(banco).forEach(function (chave) {
              if (producaoDoBanco(banco[chave]) > 0) registrarData(chave, 'producao');
              try {
                var pd = String(chave).split('/');
                if (pd.length === 3 && Number(pd[1]) === mes && Number(pd[2]) === ano) {
                  var mv = metaDoBanco(banco[chave]);
                  if (mv !== null) metaPorDia[Number(pd[0])] = mv;
                }
              } catch (e) { }
            });
          }
        } catch (e) { }

        try {
          if (typeof historico !== 'undefined' && Array.isArray(historico)) {
            historico.forEach(function (h) {
              if (h && Number(h.total) > 0) registrarData(h.data, 'producao');
            });
          }
        } catch (e) { }

        var vSab = valorFimDeSemana('sab');
        var vDom = valorFimDeSemana('dom');
        var uteis = 0, sabados = 0, domingos = 0;

        Object.keys(diasTrabalhados).forEach(function (k) {
          var dia = Number(k);
          var origem = diasTrabalhados[k];

          if (ehDomingo(ano, mes, dia)) {
            if (vDom > 0) domingos++;
            return;
          }
          if (ehSabado(ano, mes, dia)) {
            if (vSab > 0) sabados++;
            return;
          }
          if (origem !== 'calendario' && ehFeriadoPorCsv(
            typeof config !== 'undefined' ? config : null, ano, mes, dia,
            typeof idDoProjeto === 'function' ? idDoProjeto() : '')) return;
          uteis++;
        });

        if (!uteis && !sabados && !domingos) return null;
        return { uteis: uteis, sabados: sabados, domingos: domingos, fds: sabados + domingos };
      }

      function contextoDoRender() {
        return memo('contexto', contextoDoRenderCalculo);
      }

      function contextoDoRenderCalculo() {
        var ctx = { dias: null, soma: 0, vSab: 0, vDom: 0, motivo: '' };
        try {
          var ref = (typeof window.dailyKey === 'function') ? String(window.dailyKey() || '') : '';
          var d = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!d) { ctx.motivo = 'sem dia selecionado'; return ctx; }
          ctx.dias = contarDias(chaveMes(Number(d[3]), Number(d[2])), Number(d[1]));
          if (!ctx.dias) ctx.motivo = 'nenhum dia encontrado';
          ctx.soma = somaTaxasDia();
          if (!(ctx.soma > 0)) ctx.motivo = 'sem taxa/dia nas equipes';
          ctx.vSab = valorFimDeSemana('sab');
          ctx.vDom = valorFimDeSemana('dom');
        } catch (e) { ctx.motivo = 'erro no calculo'; }
        return ctx;
      }

      window.ppResumoDiasContados = function () {
        try {
          var ctx = contextoDoRender();
          if (!ctx.dias) return null;

          var partes = [];
          if (ctx.vSab > 0 && ctx.dias.sabados) partes.push('+ ' + ctx.dias.sabados + ' sábado(s)');
          if (ctx.vDom > 0 && ctx.dias.domingos) partes.push('+ ' + ctx.dias.domingos + ' domingo(s)');
          if (!partes.length) return null;
          return 'CSV ' + partes.join(' ');
        } catch (e) { return null; }
      };

      window.ppMetaAcumuladaDaEquipe = function (equipe) {
        try {
          var base = n(equipe && equipe.metaAcumulada);

          var _corrigida = metaAcumCorrigidaPeloFeriado(
            base, equipe && equipe.metaDia, typeof config !== 'undefined' ? config : null);
          if (_corrigida !== null) base = _corrigida;

          if (!contratoTemMetaFds()) return _corrigida;

          if (CONSERTO_FDS_DUPLICADO[idDoProjeto()]) {
            var ctxC = contextoDoRender();
            if (ctxC && ctxC.dias && ctxC.soma > 0) {
              var taxaC = n(equipe && equipe.metaDia);
              if (taxaC > 0) {
                var pesoC = taxaC / ctxC.soma;
                var fdsC = ctxC.dias.sabados * ctxC.vSab * pesoC +
                  ctxC.dias.domingos * ctxC.vDom * pesoC;
                var sobra = base - (ctxC.dias.uteis * taxaC);
                if (fdsC > 0 && Math.abs(sobra - fdsC) <= fdsC * 0.01) {
                  return Math.round(base * 100) / 100;
                }
              }
            }
          }

          var ctx = contextoDoRender();
          if (!ctx.dias || !(ctx.soma > 0)) return null;

          var taxa = n(equipe && equipe.metaDia);
          if (!(taxa > 0)) return null;

          var peso = taxa / ctx.soma;

          return Math.round((
            base +
            ctx.dias.sabados * ctx.vSab * peso +
            ctx.dias.domingos * ctx.vDom * peso
          ) * 100) / 100;
        } catch (e) { return null; }
      };

      window.ppMetaDiaDoDiaSelecionado = function (equipe) {
        try {
          var ref = '';
          try { ref = (typeof window.dailyKey === 'function') ? String(window.dailyKey() || '') : ''; } catch (e) { }
          var d = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!d) return null;
          var dia = Number(d[1]), mes = Number(d[2]), ano = Number(d[3]);

          var sab = ehSabado(ano, mes, dia);
          var dom = ehDomingo(ano, mes, dia);

          if (!sab && !dom) {
            if (ehFeriadoPorCsv(typeof config !== 'undefined' ? config : null, ano, mes, dia,
              typeof idDoProjeto === 'function' ? idDoProjeto() : '')) return 0;
            return null;
          }

          var valor = valorFimDeSemana(sab ? 'sab' : 'dom');
          if (!(valor > 0)) return 0;

          var taxa = n(equipe && equipe.metaDia);
          var soma = somaTaxasDia();
          if (!(taxa > 0) || !(soma > 0)) return 0;
          return Math.round(valor * (taxa / soma) * 100) / 100;
        } catch (e) { return null; }
      };

      /* ── PRODUÇÃO ACUMULADA SOMADA DO BANCO DIÁRIO (17/08/2026) ──────────── */
      function nomeChave(valor) {
        return String(valor || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim().toUpperCase();
      }

      function somaDoBancoPorEquipe() {
        var vazio = { dias: 0, mapa: null, motivo: 'sem dia selecionado' };
        var ref = '';
        try { ref = (typeof window.dailyKey === 'function') ? String(window.dailyKey() || '') : ''; } catch (e) { }
        var d = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!d) return vazio;

        var mesAlvo = chaveMes(Number(d[3]), Number(d[2]));
        var ateDia = Number(d[1]);
        var banco = bancoDoCiclo();

        var mapa = {}, dias = 0;
        Object.keys(banco).forEach(function (chave) {
          var p = String(chave || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!p) return;
          if (chaveMes(Number(p[3]), Number(p[2])) !== mesAlvo) return;
          if (Number(p[1]) > ateDia) return;
          var lista = (banco[chave] && Array.isArray(banco[chave].equipes)) ? banco[chave].equipes : [];
          if (!lista.length) return;
          dias++;
          lista.forEach(function (t) {
            var nome = nomeChave(t && t.equipe);
            if (!nome) return;
            mapa[nome] = (mapa[nome] || 0) + n(t && t.produzidoDia);
          });
        });

        if (!dias) return { dias: 0, mapa: null, motivo: 'banco diário sem dias no mês' };
        return { dias: dias, mapa: mapa, motivo: '' };
      }

      window.ppProducaoAcumuladaDaEquipe = function (equipe) {
        try {
          if (!somarAcumuladoAtivo()) return null;

          var b = somaDoBancoPorEquipe();
          if (!b.mapa) return null;
          var nome = nomeChave(equipe && equipe.equipe);
          if (!nome || !(nome in b.mapa)) return null;
          var soma = Math.round(b.mapa[nome] * 100) / 100;
          if (!(soma > 0) && n(equipe && equipe.produzidoAcumulado) > 0) return null;
          return soma;
        } catch (e) { return null; }
      };

      window.ppResumoProducaoAcumulada = function () {
        try {
          if (!somarAcumuladoAtivo()) return null;
          var b = somaDoBancoPorEquipe();
          if (!b.mapa) return null;
          return b.dias + ' dia(s) lançado(s)';
        } catch (e) { return null; }
      };

      /* ═══ REMOVIDO EM 17/08/2026: aplicarMetaAcumulada() ═══════════════════ */

      function preencherCardDiasUteis() {
        try {
          var campoMes = el('edDiasMes');
          var campoTrab = el('edDiasLancados');
          if (!campoMes && !campoTrab) return;

          var sugestao = '';
          try {
            var ref = (typeof window.dailyKey === 'function') ? String(window.dailyKey() || '') : '';
            var d = ref.match(new RegExp('^(\d{1,2})/(\d{1,2})/(\d{4})$'));
            if (d) {
              var contagem = contarDias(chaveMes(Number(d[3]), Number(d[2])), Number(d[1]));
              if (contagem) {
                var lancados = contagem.uteis + contagem.sabados + contagem.domingos;
                sugestao = ' Pelo que está lançado no CSV e no banco diário até ' +
                  ref + ', foram ' + lancados + ' dia(s).';
              }
            }
          } catch (e) { }

          function liberar(campo, titulo) {
            if (!campo) return;
            campo.readOnly = false;
            campo.title = titulo;
            campo.style.background = '';
            campo.style.color = '';
            campo.style.cursor = '';
          }

          liberar(campoMes,
            'Dias úteis totais do mês para este contrato. O Acompanhamento Gerencial ' +
            'divide a receita líquida por este número.');
          liberar(campoTrab,
            'Dias já trabalhados no mês. O Acompanhamento Gerencial multiplica por ' +
            'este número para chegar na Receita Líquida Acumulada.' + sugestao);
        } catch (e) { }
      }

      var linhasParaDias = window.editorRows;
      if (typeof linhasParaDias === 'function') {
        window.editorRows = function () {
          var r = linhasParaDias.apply(this, arguments);
          setTimeout(preencherCardDiasUteis, 40);
          return r;
        };
        try { editorRows = window.editorRows; } catch (e) { }
      }

      function pesosDoEstado(state, mesChave, ateDia, projetoId) {
        try {
          if (!state || !mesChave) return null;
          var partes = mesChave.split('-');
          var ano = Number(partes[0]), mes = Number(partes[1]);

          var listaEquipes = Array.isArray(state.equipes) ? state.equipes : [];
          var soma = listaEquipes.reduce(function (s, e) {
            var t = n(e && e.metaDia);
            return t > 0 ? s + t : s;
          }, 0);
          if (!(soma > 0)) return null;

          var cfgEstado = state.config || {};
          var vSab = valorFdsDoEstado(cfgEstado, 'sab', projetoId);
          var vDom = valorFdsDoEstado(cfgEstado, 'dom', projetoId);

          var comProducao = {};
          try {
            (Array.isArray(state.historico) ? state.historico : []).forEach(function (h) {
              if (!h || !(Number(h.total) > 0)) return;
              var m = String(h.data || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
              if (!m) return;
              if (m[3] && chaveMes(Number(m[3]), Number(m[2])) !== mesChave) return;
              if (!m[3] && Number(m[2]) !== mes) return;
              comProducao[Number(m[1])] = true;
            });
          } catch (e) { }

          var metaPorDia = {};
          try {
            (Array.isArray(state.historico) ? state.historico : []).forEach(function (h) {
              if (!h) return;
              var m = String(h.data || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
              if (!m) return;
              if (m[3] && chaveMes(Number(m[3]), Number(m[2])) !== mesChave) return;
              if (!m[3] && Number(m[2]) !== mes) return;
              var mv = Number(h.metaDia != null ? h.metaDia : h.totalMetaDia);
              if (isFinite(mv)) metaPorDia[Number(m[1])] = mv;
            });
          } catch (e) { }

          var marcados = {};

          function pesoAte(limite) {
            var uteis = 0, sabados = 0, domingos = 0;
            var totalDias = new Date(ano, mes, 0).getDate();
            for (var d = 1; d <= totalDias; d++) {
              if (limite && d > limite) break;
              var temProducao = !!comProducao[d];
              var temMarca = !!marcados[d];
              if (!temProducao && !temMarca) continue;
              if (ehDomingo(ano, mes, d)) { if (vDom > 0) domingos++; continue; }
              if (ehSabado(ano, mes, d)) { if (vSab > 0) sabados++; continue; }
              if (!temMarca && ehFeriadoPorCsv(cfgEstado, ano, mes, d, projetoId)) continue;
              uteis++;
            }
            return uteis * soma + sabados * vSab + domingos * vDom;
          }

          var uteisMes = 0, sabadosMes = 0;
          var diasNoMes = new Date(ano, mes, 0).getDate();
          for (var dd = 1; dd <= diasNoMes; dd++) {
            var sem = new Date(ano, mes - 1, dd).getDay();
            if (sem === 0) continue;
            if (sem === 6) { if (vSab > 0) sabadosMes++; continue; }
            uteisMes++;
          }
          var total = uteisMes * soma + sabadosMes * vSab;
          if (!(total > 0)) return null;

          var fds = { sabados: 0, domingos: 0 };
          var ateLimite = ateDia || new Date(ano, mes, 0).getDate();
          for (var df = 1; df <= ateLimite; df++) {
            if (!comProducao[df] && !marcados[df]) continue;
            if (ehDomingo(ano, mes, df)) { if (vDom > 0) fds.domingos++; continue; }
            if (ehSabado(ano, mes, df)) { if (vSab > 0) fds.sabados++; }
          }

          var uteisDec = 0;
          for (var du = 1; du <= ateLimite; du++) {
            if (!comProducao[du] && !marcados[du]) continue;
            if (ehDomingo(ano, mes, du) || ehSabado(ano, mes, du)) continue;
            if (!marcados[du] && ehFeriadoPorCsv(cfgEstado, ano, mes, du, projetoId)) continue;
            uteisDec++;
          }

          return {
            total: total, decorrido: pesoAte(ateDia), soma: soma,
            vSab: vSab, vDom: vDom,
            uteisDecorridos: uteisDec,
            sabadosDecorridos: fds.sabados, domingosDecorridos: fds.domingos
          };
        } catch (e) { return null; }
      }
      window.ppPesosDoEstado = pesosDoEstado;

      window.ppMetaAcumuladaDoEstado = function (state, mesChave, ateDia, projetoId) {
        try {
          if (!state) return null;

          var lista = Array.isArray(state.equipes) ? state.equipes : [];
          var _cfgE = state.config || {};
          var base = lista.reduce(function (s, e) {
            var gravado = n(e && e.metaAcumulada);
            var corrigido = metaAcumCorrigidaPeloFeriado(gravado, e && e.metaDia, _cfgE);
            return s + (corrigido !== null ? corrigido : gravado);
          }, 0);

          var extra = 0;
          var p = pesosDoEstado(state, mesChave, ateDia, projetoId);
          if (p) {
            extra = (p.sabadosDecorridos || 0) * n(p.vSab) +
              (p.domingosDecorridos || 0) * n(p.vDom);

            if (CONSERTO_FDS_DUPLICADO[projetoId] && extra > 0 && p.soma > 0) {
              var esperadoUteis = (p.uteisDecorridos || 0) * p.soma;
              var sobraT = base - esperadoUteis;
              if (Math.abs(sobraT - extra) <= extra * 0.01) extra = 0;
            }
          }

          var total = base + extra;
          if (!(total > 0)) return null;
          return Math.round(total * 100) / 100;
        } catch (e) { return null; }
      };

      window.ppMetaDiaDoEstado = function (state, projetoId, dataDia) {
        try {
          if (!state) return null;
          var cfg = state.config || {};

          var ref = String(dataDia || cfg.dataReferencia || '').trim();
          var p = ref.match(new RegExp('^(\\d{1,2})/(\\d{1,2})/(\\d{4})$'));
          if (!p) return null;
          var dia = Number(p[1]), mes = Number(p[2]), ano = Number(p[3]);

          if (!ehSabado(ano, mes, dia) && !ehDomingo(ano, mes, dia)
            && ehFeriadoPorCsv(cfg, ano, mes, dia, projetoId)) return 0;

          if (ehSabado(ano, mes, dia)) return valorFdsDoEstado(cfg, 'sab', projetoId);
          if (ehDomingo(ano, mes, dia)) return valorFdsDoEstado(cfg, 'dom', projetoId);

          return null;
        } catch (e) { return null; }
      };

      /* Exposto para inspeção e para os próximos passos. */
      window.ppCalendarioDias = {
        marcasDoMes: marcasDoMes,
        calcularMeta: calcularMeta,
        somaTaxasDia: somaTaxasDia,
        valorFimDeSemana: valorFimDeSemana
      };
    })();
