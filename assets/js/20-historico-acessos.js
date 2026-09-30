(function () {
  'use strict';

  var COLECAO = 'accessLog';
  var DIAS_HISTORICO = 30;

  var _sessaoId = null;
  var _telaGravada = null;
  var _encerrando = false;

  function db() {
    try {
      if (typeof ppInitFirebase === 'function' && !ppInitFirebase()) return null;
      if (!(window.firebase && firebase.firestore)) return null;
      var raiz = (typeof PP_FIRESTORE_ROOT !== 'undefined')
        ? PP_FIRESTORE_ROOT : 'painel_produtividade';
      return firebase.firestore().collection(raiz).doc('base').collection(COLECAO);
    } catch (e) { return null; }
  }

  function colBase(nome) {
    try {
      if (typeof ppInitFirebase === 'function' && !ppInitFirebase()) return null;
      if (!(window.firebase && firebase.firestore)) return null;
      var raiz = (typeof PP_FIRESTORE_ROOT !== 'undefined')
        ? PP_FIRESTORE_ROOT : 'painel_produtividade';
      return firebase.firestore().collection(raiz).doc('base').collection(nome);
    } catch (e) { return null; }
  }

  function colUsuarios() {
    try {
      if (typeof ppInitFirebase === 'function' && !ppInitFirebase()) return null;
      if (!(window.firebase && firebase.firestore)) return null;
      return firebase.firestore().collection('users');
    } catch (e) { return null; }
  }

  function usuarioAtual() {
    try {
      var u = (window.firebase && firebase.auth && firebase.auth().currentUser)
        ? firebase.auth().currentUser : null;
      if (!u || !u.email) return null;
      return { uid: u.uid, email: u.email };
    } catch (e) { return null; }
  }

  function visivel(id) {
    try {
      var el = document.getElementById(id);
      if (!el) return false;
      var d = (el.style && el.style.display) || '';
      if (d === 'none') return false;
      return el.offsetParent !== null || d === 'flex' || d === 'block';
    } catch (e) { return false; }
  }

  function aberto(id) {
    try {
      var el = document.getElementById(id);
      return !!(el && el.classList && el.classList.contains('open'));
    } catch (e) { return false; }
  }

  function telaAtual() {
    try {
      if (document.body.classList.contains('app-locked')) return 'Tela de login';
      if (visivel('adminPanelBg')) return 'Administração';
      if (aberto('allTeamCardPage')) return 'Cards de equipes';
      if (aberto('teamCardPage')) return 'Card de equipe';
      if (visivel('projectFinanceBg')) return 'Editor Budget / Forecast';
      if (aberto('modalBg')) return 'Editor Projeto';
      if (document.body.classList.contains('executive-mode')) return 'Acompanhamento Gerencial';
      var pid = window.currentProjectId;
      if (pid) {
        var nome = pid;
        try {
          if (typeof projectById === 'function' && projectById(pid)) nome = projectById(pid).nome;
        } catch (e) { }
        return 'Produtividade · ' + nome;
      }
      return 'Seleção de contratos';
    } catch (e) { return 'Indefinida'; }
  }

  window.ppAcessoIniciar = function () {
    try {
      if (_sessaoId) return;
      var u = usuarioAtual(); if (!u) return;
      var col = db(); if (!col) return;
      var agora = Date.now();
      _sessaoId = u.uid + '_' + agora;
      var tela = telaAtual();
      _telaGravada = tela;
      col.doc(_sessaoId).set({
        uid: u.uid,
        user: u.email,
        role: (window.currentUserRole || ''),
        entradaMs: agora,
        entradaISO: new Date(agora).toISOString(),
        telaNome: tela,
        telasVisitadas: [tela],
        ultimaAtividadeMs: agora,
        saidaMs: 0
      }).catch(function () { _sessaoId = null; });

      try {
        var cu = colUsuarios();
        if (cu) {
          cu.doc(u.uid).set({
            ultimoAcessoMs: agora,
            ultimoAcessoISO: new Date(agora).toISOString()
          }, { merge: true }).catch(function () { });
        }
      } catch (e) { }
    } catch (e) { }
  };

  window.ppAcessoAtualizar = function () {
    try {
      if (!_sessaoId || _encerrando) return;
      var col = db(); if (!col) return;
      var tela = telaAtual();
      var agora = Date.now();
      if (tela === _telaGravada) {
        col.doc(_sessaoId).set({ ultimaAtividadeMs: agora }, { merge: true }).catch(function () { });
        return;
      }
      _telaGravada = tela;
      var add = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.arrayUnion(tela) : null;
      var dados = { telaNome: tela, ultimaAtividadeMs: agora };
      if (add) dados.telasVisitadas = add;
      col.doc(_sessaoId).set(dados, { merge: true }).catch(function () { });
    } catch (e) { }
  };

  window.ppAcessoEncerrar = function () {
    try {
      if (!_sessaoId) return;
      _encerrando = true;
      var col = db(); if (!col) return;
      col.doc(_sessaoId).set({ saidaMs: Date.now() }, { merge: true }).catch(function () { });
    } catch (e) { }
  };

  try {
    if (typeof window.ppPresenceBeat === 'function') {
      var _beatOriginal = window.ppPresenceBeat;
      window.ppPresenceBeat = function () {
        try { _beatOriginal.apply(this, arguments); } catch (e) { }
        try {
          if (!_sessaoId) window.ppAcessoIniciar();
          else window.ppAcessoAtualizar();
        } catch (e) { }
      };
    }
  } catch (e) { }

  try {
    window.addEventListener('beforeunload', function () { try { window.ppAcessoEncerrar(); } catch (e) { } });
    document.addEventListener('visibilitychange', function () {
      try { if (document.visibilityState === 'hidden') window.ppAcessoAtualizar(); } catch (e) { }
    });
  } catch (e) { }

  var _linhas = [];

  function fmtData(ms) {
    if (!ms) return '-';
    try {
      var d = new Date(Number(ms));
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return '-'; }
  }

  function duracao(l) {
    var fim = Number(l.saidaMs) || Number(l.ultimaAtividadeMs) || 0;
    var ini = Number(l.entradaMs) || 0;
    if (!fim || !ini || fim <= ini) return '-';
    var min = Math.round((fim - ini) / 60000);
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + 'h ' + (min % 60) + 'min';
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var _porUsuario = [];

  function renderUltimoAcesso() {
    var box = document.getElementById('adminUltimoAcessoList');
    if (!box) return;
    var cu = colUsuarios(), cp = colBase('presence'), ce = colBase('editLog');
    if (!cu) { box.innerHTML = '<p class="pv-vazio">Sem conexão com a nuvem.</p>'; return; }

    var leituras = [
      cu.get().catch(function () { return null; }),
      cp ? cp.get().catch(function () { return null; }) : Promise.resolve(null),
      ce ? ce.orderBy('atMs', 'desc').limit(500).get().catch(function () { return null; }) : Promise.resolve(null)
    ];

    Promise.all(leituras).then(function (r) {
      var usuarios = [], presenca = {}, edicao = {};
      try { if (r[0]) r[0].forEach(function (d) { var x = d.data() || {}; x.__uid = d.id; usuarios.push(x); }); } catch (e) { }
      try { if (r[1]) r[1].forEach(function (d) { var x = d.data() || {}; if (x.user) presenca[String(x.user).toLowerCase()] = x; }); } catch (e) { }
      try {
        if (r[2]) r[2].forEach(function (d) {
          var x = d.data() || {}; var k = String(x.user || '').toLowerCase();
          if (k && (!edicao[k] || Number(x.atMs || 0) > Number(edicao[k].atMs || 0))) edicao[k] = x;
        });
      } catch (e) { }

      _porUsuario = usuarios.map(function (u) {
        var chave = String(u.email || '').toLowerCase();
        var cand = [];
        if (Number(u.ultimoAcessoMs)) cand.push({ ms: Number(u.ultimoAcessoMs), fonte: 'login' });
        if (presenca[chave] && Number(presenca[chave].atMs)) cand.push({ ms: Number(presenca[chave].atMs), fonte: 'presença' });
        if (edicao[chave] && Number(edicao[chave].atMs)) cand.push({ ms: Number(edicao[chave].atMs), fonte: 'edição' });
        cand.sort(function (a, b) { return b.ms - a.ms; });
        var melhor = cand[0] || null;
        return {
          nome: u.nome || '-', email: u.email || '-', role: u.role || '-',
          ativo: u.ativo !== false,
          ms: melhor ? melhor.ms : 0, fonte: melhor ? melhor.fonte : '',
          ondeEstava: (presenca[chave] && presenca[chave].projectName) || ''
        };
      }).sort(function (a, b) { return b.ms - a.ms; });

      desenharUltimoAcesso();
    });
  }

  function desenharUltimoAcesso() {
    var box = document.getElementById('adminUltimoAcessoList');
    if (!box) return;
    var lista = usuariosFiltrados();
    var cnt = document.getElementById('adminUltimoAcessoCount');
    if (cnt) cnt.textContent = lista.length + ' de ' + _porUsuario.length + ' usuário(s)';
    if (!lista.length) { box.innerHTML = '<p class="pv-vazio">Nenhum usuário para o filtro informado.</p>'; return; }
    var th = 'padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#545C67;border-bottom:2px solid #E3E6EA;white-space:nowrap';
    var td = 'padding:7px 8px;font-size:11.5px;font-weight:700;color:#161B24;border-bottom:1px solid #EEF0F3';
    var selo = function (f) {
      if (!f) return '<span style="font-size:9.5px;font-weight:900;color:#67707C;background:#F2F3F5;border:1px solid #CDD2D9;border-radius:999px;padding:2px 8px">sem registro</span>';
      var cor = f === 'login' ? ['#1E8A4C', '#E2F3E8', '#BFE3CC'] : f === 'presença' ? ['#1F6FB2', '#E7F0F9', '#BFDBFE'] : ['#B7791F', '#FFF3D2', '#F2D98A'];
      return '<span style="font-size:9.5px;font-weight:900;color:' + cor[0] + ';background:' + cor[1] + ';border:1px solid ' + cor[2] + ';border-radius:999px;padding:2px 8px">' + esc(f) + '</span>';
    };
    box.innerHTML = '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr>'
      + '<th style="' + th + '">Usuário</th><th style="' + th + '">E-mail</th><th style="' + th + '">Perfil</th>'
      + '<th style="' + th + '">Último acesso</th><th style="' + th + '">Fonte</th><th style="' + th + '">Situação</th>'
      + '</tr></thead><tbody>'
      + lista.map(function (u) {
        return '<tr>'
          + '<td style="' + td + '">' + esc(u.nome) + '</td>'
          + '<td style="' + td + ';color:#545C67">' + esc(u.email) + '</td>'
          + '<td style="' + td + '">' + esc(u.role) + '</td>'
          + '<td style="' + td + '">' + (u.ms ? esc(fmtData(u.ms)) : '-') + '</td>'
          + '<td style="' + td + '">' + selo(u.fonte) + '</td>'
          + '<td style="' + td + ';color:' + (u.ativo ? '#1E8A4C' : '#B3321F') + '">' + (u.ativo ? 'ativo' : 'inativo') + '</td>'
          + '</tr>';
      }).join('') + '</tbody></table>';
  }

  window.adminRenderAcessos = function () {
    var box = document.getElementById('adminAcessosList');
    if (!box) return;
    box.innerHTML = '<p style="color:#67707C;font-size:13px;font-weight:800;text-align:center;padding:20px 0">Carregando…</p>';
    var col = db();
    if (!col) { box.innerHTML = '<p style="color:#B3321F;font-size:12px;font-weight:800;padding:14px 0">Sem conexão com a nuvem.</p>'; return; }
    try { renderUltimoAcesso(); } catch (e) { }
    var corte = Date.now() - DIAS_HISTORICO * 24 * 60 * 60 * 1000;
    col.where('entradaMs', '>=', corte).orderBy('entradaMs', 'desc').limit(1000).get()
      .then(function (snap) {
        _linhas = [];
        snap.forEach(function (d) { _linhas.push(d.data() || {}); });
        desenhar();
      })
      .catch(function (err) {
        box.innerHTML = '<p style="color:#B3321F;font-size:12px;font-weight:800;padding:14px 0">Não foi possível ler o histórico: '
          + esc(err && err.message ? err.message : err) + '</p>';
      });
  };

  function filtradas() {
    var f = document.getElementById('adminAcessosFiltro');
    var termo = (f && f.value ? f.value : '').trim().toLowerCase();
    if (!termo) return _linhas;
    return _linhas.filter(function (l) {
      return String(l.user || '').toLowerCase().indexOf(termo) >= 0
        || String(l.telaNome || '').toLowerCase().indexOf(termo) >= 0
        || String(l.role || '').toLowerCase().indexOf(termo) >= 0;
    });
  }

  function desenhar() {
    var box = document.getElementById('adminAcessosList');
    if (!box) return;
    var lista = filtradas();
    var cnt = document.getElementById('adminAcessosCount');
    if (cnt) cnt.textContent = lista.length + ' acesso(s) · ' + DIAS_HISTORICO + ' dias';
    if (!lista.length) {
      box.innerHTML = '<p style="color:#67707C;font-size:13px;font-weight:800;text-align:center;padding:20px 0">Nenhum acesso registrado no período.</p>';
      return;
    }
    var th = 'padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#545C67;border-bottom:2px solid #E3E6EA;white-space:nowrap';
    var td = 'padding:7px 8px;font-size:11.5px;font-weight:700;color:#161B24;border-bottom:1px solid #EEF0F3';
    box.innerHTML = '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr>'
      + '<th style="' + th + '">Usuário</th>'
      + '<th style="' + th + '">Perfil</th>'
      + '<th style="' + th + '">Entrada</th>'
      + '<th style="' + th + '">Última atividade</th>'
      + '<th style="' + th + '">Permanência</th>'
      + '<th style="' + th + '">Tela final</th>'
      + '<th style="' + th + '">Telas visitadas</th>'
      + '</tr></thead><tbody>'
      + lista.map(function (l) {
        var visitadas = Array.isArray(l.telasVisitadas) ? l.telasVisitadas.join(' · ') : (l.telaNome || '-');
        return '<tr>'
          + '<td style="' + td + '">' + esc(l.user || '-') + '</td>'
          + '<td style="' + td + '">' + esc(l.role || '-') + '</td>'
          + '<td style="' + td + '">' + esc(fmtData(l.entradaMs)) + '</td>'
          + '<td style="' + td + '">' + esc(fmtData(l.saidaMs || l.ultimaAtividadeMs)) + '</td>'
          + '<td style="' + td + '">' + esc(duracao(l)) + '</td>'
          + '<td style="' + td + '">' + esc(l.telaNome || '-') + '</td>'
          + '<td style="' + td + ';color:#545C67;font-weight:600">' + esc(visitadas) + '</td>'
          + '</tr>';
      }).join('')
      + '</tbody></table>';
  }

  window.adminFiltrarAcessos = function () {
    try { desenhar(); } catch (e) { }
    try { desenharUltimoAcesso(); } catch (e) { }
  };

  function filtroTermo() {
    var f = document.getElementById('adminAcessosFiltro');
    return (f && f.value ? f.value : '').trim().toLowerCase();
  }

  function usuariosFiltrados() {
    var t = filtroTermo();
    if (!t) return _porUsuario;
    return _porUsuario.filter(function (u) {
      return String(u.nome || '').toLowerCase().indexOf(t) >= 0
        || String(u.email || '').toLowerCase().indexOf(t) >= 0
        || String(u.role || '').toLowerCase().indexOf(t) >= 0;
    });
  }

  function baixarCsv(nomeBase, cabecalho, linhas) {
    var campo = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var csv = '﻿' + cabecalho.map(campo).join(';') + '\r\n'
      + linhas.map(function (l) { return l.map(campo).join(';'); }).join('\r\n');
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var nome = nomeBase + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { } }, 400);
  }

  window.adminExportarUltimoAcessoCsv = function () {
    try {
      var lista = usuariosFiltrados();
      if (!lista.length) { alert('Não há usuários para exportar.'); return; }
      baixarCsv('pp-ultimo-acesso-por-usuario',
        ['Usuario', 'E-mail', 'Perfil', 'Ultimo acesso', 'Fonte do registro', 'Situacao'],
        lista.map(function (u) {
          return [u.nome || '', u.email || '', u.role || '',
            u.ms ? fmtData(u.ms) : 'sem registro',
            u.fonte || 'sem registro',
            u.ativo ? 'ativo' : 'inativo'];
        }));
    } catch (e) {
      alert('Não foi possível gerar o arquivo: ' + (e && e.message ? e.message : e));
    }
  };

  window.adminExportarAcessosCsv = function () {
    try {
      var lista = filtradas();
      if (!lista.length) { alert('Não há acessos no período para exportar.'); return; }
      var cab = ['Usuario', 'Perfil', 'Entrada', 'Ultima atividade', 'Permanencia', 'Tela final', 'Telas visitadas'];
      var campo = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
      var linhas = lista.map(function (l) {
        return [
          l.user || '', l.role || '',
          fmtData(l.entradaMs), fmtData(l.saidaMs || l.ultimaAtividadeMs),
          duracao(l), l.telaNome || '',
          Array.isArray(l.telasVisitadas) ? l.telasVisitadas.join(' | ') : ''
        ].map(campo).join(';');
      });
      var csv = '﻿' + cab.map(campo).join(';') + '\r\n' + linhas.join('\r\n');
      var d = new Date();
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      var nome = 'pp-acessos-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.csv';
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { } }, 400);
    } catch (e) {
      alert('Não foi possível gerar o arquivo: ' + (e && e.message ? e.message : e));
    }
  };
})();
