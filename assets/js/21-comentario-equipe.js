(function () {
  'use strict';

  var ABERTA = null;

  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function diaAtual() {
    try {
      if (typeof window.dailyKey === 'function') {
        var k = String(window.dailyKey() || '').trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k)) return k;
      }
    } catch (e) { }
    try {
      var ref = String((window.config && config.dataReferencia) || '').trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(ref)) return ref;
    } catch (e) { }
    return '';
  }

  function mapaComentarios(criar) {
    try {
      if (typeof config === 'undefined' || !config) return null;
      if (!config.comentariosEquipe) {
        if (!criar) return null;
        config.comentariosEquipe = {};
      }
      return config.comentariosEquipe;
    } catch (e) { return null; }
  }

  function acharNoDia(doDia, equipe) {
    if (!doDia || !equipe) return null;
    if (doDia[equipe]) return doDia[equipe];
    var alto = String(equipe).trim().toUpperCase();
    if (doDia[alto]) return doDia[alto];
    var chaves = Object.keys(doDia);
    for (var i = 0; i < chaves.length; i++) {
      if (String(chaves[i]).trim().toUpperCase() === alto) return doDia[chaves[i]];
    }
    return null;
  }

  function comentarioNoBanco(equipe, dia) {
    try {
      var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined')
        ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
      var pid = String(window.currentProjectId || '');
      if (!pid) return null;
      var bruto = localStorage.getItem(base + '::' + pid);
      if (!bruto) return null;
      var banco = JSON.parse(bruto);
      var reg = banco && banco[dia];
      var doDia = reg && reg.config && reg.config.comentariosEquipe && reg.config.comentariosEquipe[dia];
      return acharNoDia(doDia, equipe);
    } catch (e) { return null; }
  }

  window.ppComentarioDaEquipe = function (equipe, dia) {
    try {
      dia = dia || diaAtual();
      var mapa = mapaComentarios(false);
      var item = acharNoDia(mapa && mapa[dia], equipe);
      if (!item) item = comentarioNoBanco(equipe, dia);
      if (!item) return null;
      var obj = (typeof item === 'string') ? { texto: item, origem: 'csv' } : item;
      if (!obj || !String(obj.texto || '').trim()) return null;
      return obj;
    } catch (e) { return null; }
  };

  window.ppSalvarComentarioDaEquipe = function (equipe, dia, texto) {
    try {
      var mapa = mapaComentarios(true);
      if (!mapa) return false;
      dia = dia || diaAtual();
      if (!dia || !equipe) return false;
      if (!mapa[dia]) mapa[dia] = {};

      var limpo = String(texto == null ? '' : texto).trim();
      var autor = '';
      try { autor = String(window.currentUserLogin || ''); } catch (e) { }

      mapa[dia][equipe] = {
        texto: limpo ? limpo.slice(0, 1000) : '',
        autor: autor,
        at: new Date().toISOString(),
        origem: 'manual'
      };

      window.__ppSaveExplicito = true;
      if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true);
      else if (typeof saveLocalSilent === 'function') saveLocalSilent();
      return true;
    } catch (e) { return false; }
  };

  window.ppDiagnosticoComentarios = function () {
    try {
      var dia = diaAtual();
      var mapa = mapaComentarios(false) || {};
      var dias = Object.keys(mapa);
      console.log('%c Painel · diagnóstico dos comentários ', 'background:#151B26;color:#fff;font-weight:bold');
      console.log('Dia exibido no painel:', dia || '(nenhum)');
      console.log('Dias com comentário salvos:', dias.length ? dias.join(', ') : '(nenhum)');
      if (dias.length) {
        dias.forEach(function (d) {
          var equipes = Object.keys(mapa[d] || {});
          console.log('  ' + d + ' → ' + equipes.length + ' equipe(s): ' + equipes.join(', '));
        });
      }
      var doDia = mapa[dia] || {};
      var qtd = Object.keys(doDia).length;
      if (!dias.length) {
        console.warn('Nenhum comentário chegou. Provável causa: a coluna do CSV não foi reconhecida. ' +
          'Nomes aceitos: Observação, Observações, Obs, Comentário, Comentários, Nota, Justificativa, Ocorrência.');
      } else if (!qtd) {
        console.warn('Há comentários salvos, mas nenhum para o dia exibido (' + dia + '). ' +
          'Troque a data no seletor para um dos dias listados acima.');
      } else {
        console.log('%c ' + qtd + ' comentário(s) disponíveis para o dia exibido. ', 'background:#1E8A4C;color:#fff');
      }
      return { dia: dia, dias: dias, noDiaExibido: qtd };
    } catch (e) { console.error('Diagnóstico falhou:', e); return null; }
  };

  function podeEditar() {
    try {
      if (typeof window.ppIsReadOnlyRole === 'function') return !window.ppIsReadOnlyRole();
      return !document.body.classList.contains('pp-readonly');
    } catch (e) { return false; }
  }

  function fecharTodas(tabela) {
    try {
      Array.prototype.slice.call(tabela.querySelectorAll('tr.pp-coment-linha'))
        .forEach(function (tr) { tr.parentNode.removeChild(tr); });
      Array.prototype.slice.call(tabela.querySelectorAll('.badge.pp-coment-ativo'))
        .forEach(function (b) { b.classList.remove('pp-coment-ativo'); });
    } catch (e) { }
  }

  function montarLinha(equipe, dia, colunas, opcoes) {
    opcoes = opcoes || {};
    var item = window.ppComentarioDaEquipe(equipe, dia);
    var texto = item && item.texto ? item.texto : '';
    var assinatura = '';
    if (item && item.origem === 'manual' && item.autor) {
      var quando = '';
      try {
        var d = new Date(item.at);
        var p = function (x) { return (x < 10 ? '0' : '') + x; };
        quando = p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
      } catch (e) { }
      assinatura = '<span class="pp-coment-assin">por ' + esc(item.autor) + (quando ? ' · ' + esc(quando) : '') + '</span>';
    } else if (item && item.origem === 'csv') {
      assinatura = '<span class="pp-coment-assin">observação da planilha</span>';
    }

    var vazio = !texto;
    var corpo = vazio
      ? '<p class="pp-coment-vazio">Sem comentário para esta equipe em ' + esc(dia) + '.</p>'
      : '<p class="pp-coment-texto">' + esc(texto).replace(/\n/g, '<br>') + '</p>';

    var editandoAgora = !!opcoes.editando;
    var valorCampo = editandoAgora && opcoes.rascunho != null ? opcoes.rascunho : texto;
    var editor = podeEditar()
      ? '<div class="pp-coment-editor pp-edit-only"' + (editandoAgora ? '' : ' hidden') + '>'
      + '  <textarea class="pp-coment-campo" maxlength="1000" rows="3"'
      + '    placeholder="O que explica o desvio desta equipe hoje? Ex.: equipe parada por falta de material.">' + esc(valorCampo) + '</textarea>'
      + '  <div class="pp-coment-acoes">'
      + '    <button type="button" class="btn btn-green pp-coment-salvar">Salvar comentário</button>'
      + '    <button type="button" class="btn btn-white pp-coment-cancelar">Cancelar</button>'
      + '  </div>'
      + '</div>'
      : '';

    var botaoEditar = podeEditar() && !editandoAgora
      ? '<button type="button" class="pp-coment-editar pp-edit-only" title="'
      + (vazio ? 'Escrever um comentário para esta equipe neste dia' : 'Editar este comentário') + '">'
      + (vazio ? 'Escrever' : 'Editar') + '</button>'
      : '';

    var tr = document.createElement('tr');
    tr.className = 'pp-coment-linha' + (opcoes.animar ? ' pp-coment-anima' : '');
    tr.setAttribute('data-equipe', equipe);
    tr.setAttribute('data-dia', dia);
    tr.innerHTML = '<td colspan="' + colunas + '">'
      + '<div class="pp-coment-caixa">'
      + '  <div class="pp-coment-topo">'
      + '    <b class="pp-coment-titulo">' + esc(equipe) + ' · ' + esc(dia) + '</b>'
      + assinatura
      + botaoEditar
      + '  </div>'
      + corpo
      + editor
      + '</div></td>';
    return tr;
  }

  function alternar(badge) {
    try {
      var linha = badge.closest('tr');
      var tabela = badge.closest('table');
      if (!linha || !tabela) return;

      var celulaNome = linha.cells && linha.cells[1];
      var equipe = celulaNome ? (celulaNome.getAttribute('title') || celulaNome.textContent || '').trim() : '';
      if (!equipe) return;

      var dia = diaAtual();
      if (!dia) return;

      var jaAberta = linha.nextElementSibling
        && linha.nextElementSibling.classList
        && linha.nextElementSibling.classList.contains('pp-coment-linha');

      fecharTodas(tabela);
      if (jaAberta) { ABERTA = null; return; }

      var colunas = (linha.cells && linha.cells.length) || 10;
      var nova = montarLinha(equipe, dia, colunas, { animar: true });
      linha.parentNode.insertBefore(nova, linha.nextSibling);
      badge.classList.add('pp-coment-ativo');
      ABERTA = { dia: dia, equipe: equipe, editando: false, rascunho: null };
    } catch (e) { }
  }

  function fecharTudoEZerar() {
    try {
      ABERTA = null;
      var tabela = document.getElementById('mainTable');
      if (tabela) fecharTodas(tabela);
    } catch (e) { }
  }

  window.ppFecharComentarioEquipe = fecharTudoEZerar;

  ['voltarAoPicker', 'openProject', 'abrirProjeto', 'openExecutivePanel', 'openAdminPanel', 'logoutApp']
    .forEach(function (nome) {
      try {
        if (typeof window[nome] !== 'function' || window[nome].__comentReset) return;
        var original = window[nome];
        window[nome] = function () {
          fecharTudoEZerar();
          return original.apply(this, arguments);
        };
        window[nome].__comentReset = true;
      } catch (e) { }
    });

  (function vigiarContextoDoPainel() {
    var ultimo = '';
    setInterval(function () {
      try {
        var agora = String(window.currentProjectId || '') + '|' + diaAtual();
        if (ultimo && agora !== ultimo) fecharTudoEZerar();
        ultimo = agora;
      } catch (e) { }
    }, 1200);
  })();

  document.addEventListener('click', function (ev) {
    try {
      var alvo = ev.target;
      if (!alvo || !alvo.closest) return;

      var badge = alvo.closest('#mainTable .badge');
      if (badge) {
        ev.preventDefault();
        ev.stopPropagation();
        alternar(badge);
        return;
      }

      var btnEditar = alvo.closest('.pp-coment-editar');
      if (btnEditar) {
        var caixa = btnEditar.closest('.pp-coment-caixa');
        var editor = caixa && caixa.querySelector('.pp-coment-editor');
        if (editor) {
          editor.hidden = false;
          btnEditar.hidden = true;
          if (ABERTA) ABERTA.editando = true;
          var campo = editor.querySelector('.pp-coment-campo');
          if (campo) {
            campo.focus();
            campo.addEventListener('input', function () {
              if (ABERTA) ABERTA.rascunho = campo.value;
            });
          }
        }
        return;
      }

      var btnCancelar = alvo.closest('.pp-coment-cancelar');
      if (btnCancelar) {
        var caixa2 = btnCancelar.closest('.pp-coment-caixa');
        var editor2 = caixa2 && caixa2.querySelector('.pp-coment-editor');
        var btn2 = caixa2 && caixa2.querySelector('.pp-coment-editar');
        if (editor2) editor2.hidden = true;
        if (btn2) btn2.hidden = false;
        if (ABERTA) { ABERTA.editando = false; ABERTA.rascunho = null; }
        return;
      }

      var btnSalvar = alvo.closest('.pp-coment-salvar');
      if (btnSalvar) {
        var caixa3 = btnSalvar.closest('.pp-coment-caixa');
        var tr = btnSalvar.closest('tr.pp-coment-linha');
        var campo3 = caixa3 && caixa3.querySelector('.pp-coment-campo');
        if (!tr || !campo3) return;
        var equipe3 = tr.getAttribute('data-equipe');
        var dia3 = tr.getAttribute('data-dia');
        var ok = window.ppSalvarComentarioDaEquipe(equipe3, dia3, campo3.value);
        if (!ok) { alert('Não foi possível salvar o comentário.'); return; }
        var colunas3 = tr.cells && tr.cells[0] ? tr.cells[0].colSpan : 10;
        if (ABERTA) { ABERTA.editando = false; ABERTA.rascunho = null; }
        var nova3 = montarLinha(equipe3, dia3, colunas3);
        tr.parentNode.replaceChild(nova3, tr);
        try { marcarBadgesComComentario(); } catch (e) { }
        return;
      }
    } catch (e) { }
  }, true);

  function marcarBadgesComComentario() {
    try {
      var tabela = document.getElementById('mainTable');
      var dia = diaAtual();
      if (!tabela || !dia) return;
      var linhas = tabela.querySelectorAll('tbody tr');
      for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        if (linha.classList && linha.classList.contains('pp-coment-linha')) continue;
        var badge = linha.querySelector('.badge');
        var cel = linha.cells && linha.cells[1];
        if (!badge || !cel) continue;
        var nome = (cel.getAttribute('title') || cel.textContent || '').trim();
        var tem = !!(nome && window.ppComentarioDaEquipe(nome, dia));
        badge.classList.toggle('pp-tem-coment', tem);
        if (tem) badge.setAttribute('title', 'Esta equipe tem comentário neste dia. Clique para ver.');
        else badge.removeAttribute('title');
      }
    } catch (e) { }
  }

  function guardarRascunho() {
    try {
      if (!ABERTA) return;
      var tr = document.querySelector('#mainTable tr.pp-coment-linha');
      if (!tr) return;
      var editor = tr.querySelector('.pp-coment-editor');
      var campo = tr.querySelector('.pp-coment-campo');
      ABERTA.editando = !!(editor && !editor.hidden);
      ABERTA.rascunho = campo ? campo.value : null;
    } catch (e) { }
  }

  function reabrirLinhaUnica() {
    try {
      var tabela = document.getElementById('mainTable');
      var dia = diaAtual();
      if (!tabela || !dia || !ABERTA || ABERTA.dia !== dia) return;
      var linhas = tabela.querySelectorAll('tbody tr');
      for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        if (linha.classList && linha.classList.contains('pp-coment-linha')) continue;
        var cel = linha.cells && linha.cells[1];
        var badge = linha.querySelector('.badge');
        if (!cel || !badge) continue;
        var nome = (cel.getAttribute('title') || cel.textContent || '').trim();
        if (nome !== ABERTA.equipe) continue;
        if (linha.nextElementSibling
          && linha.nextElementSibling.classList
          && linha.nextElementSibling.classList.contains('pp-coment-linha')) return;
        var colunas = (linha.cells && linha.cells.length) || 10;
        linha.parentNode.insertBefore(
          montarLinha(ABERTA.equipe, dia, colunas,
            { animar: false, editando: ABERTA.editando, rascunho: ABERTA.rascunho }),
          linha.nextSibling);
        badge.classList.add('pp-coment-ativo');
        if (ABERTA.editando) {
          try {
            var campoRe = linha.nextElementSibling.querySelector('.pp-coment-campo');
            if (campoRe) { campoRe.focus(); campoRe.setSelectionRange(campoRe.value.length, campoRe.value.length); }
          } catch (e) { }
        }
        return;
      }
      /* A equipe saiu da tela (filtro de busca, troca de dia): esquece. */
      ABERTA = null;
    } catch (e) { }
  }

  try {
    if (typeof window.renderAll === 'function') {
      var anterior = window.renderAll;
      window.renderAll = function () {
        try { guardarRascunho(); } catch (e) { }
        var r = anterior.apply(this, arguments);
        try { marcarBadgesComComentario(); } catch (e) { }
        try { reabrirLinhaUnica(); } catch (e) { }
        return r;
      };
    }
    setTimeout(marcarBadgesComComentario, 400);
    setTimeout(marcarBadgesComComentario, 1500);
  } catch (e) { }
})();
