/* ═══ MODO DE OPERAÇÃO: NUVEM REAL OU DEMONSTRAÇÃO ════════════════════════════
   O painel funciona de dois jeitos:

   • NUVEM REAL: quando firebase-config.js traz a configuração de um projeto
     Firebase (window.PP_FIREBASE_CONFIG com apiKey). Este arquivo carrega as
     bibliotecas oficiais do Firebase e não interfere em mais nada.

   • DEMONSTRAÇÃO: quando não há configuração. Este arquivo instala uma nuvem
     embutida no navegador, com a mesma interface usada pelo painel (coleções,
     documentos, assinaturas em tempo real, login). Os dados de demonstração
     vêm de assets/demo/dados-ficticios.js (números inventados, já prontos no
     projeto) e ficam guardados neste navegador. Quando os dados fictícios
     são gerados de novo, o navegador troca os antigos pelos novos sozinho.

   Precisa carregar ANTES de todos os outros arquivos do painel. */
(function () {
  'use strict';
  var cfg = window.PP_FIREBASE_CONFIG;
  var nuvemReal = !!(cfg && cfg.apiKey && cfg.projectId);
  window.PP_MODO_DEMONSTRACAO = !nuvemReal;

  if (nuvemReal) {
    var versao = '10.12.5';
    ['app', 'firestore', 'auth'].forEach(function (m) {
      document.write('<script src="https://www.gstatic.com/firebasejs/' + versao + '/firebase-' + m + '-compat.js"><\/script>');
    });
    return;
  }

  /* A semente só é carregada no modo demonstração. */
  document.write('<script src="./assets/demo/dados-ficticios.js"><\/script>');

  var CHAVE_DADOS = 'pp-demo-nuvem-v1';
  var CHAVE_SESSAO = 'pp-demo-sessao-v1';
  var LIMITE_DOCUMENTO = 1048576;
  var DADOS = null;
  var ouvintes = [];
  var seq = 0;

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function depois(fn) { setTimeout(fn, 20); }
  function lerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravarLocal(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* Semente nova (dados fictícios gerados de novo): o navegador troca os
     dados antigos da demonstração pelos novos na primeira abertura. */
  var CHAVE_VERSAO = 'pp-demo-semente-gerada';
  function sementeMudou() {
    var id = String((window.PP_DEMO_SEMENTE && window.PP_DEMO_SEMENTE.gerada) || '');
    if (!id || lerLocal(CHAVE_VERSAO) === id) return false;
    try {
      var apagar = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k !== CHAVE_SESSAO && (k.indexOf('pp-demo-') === 0 || k.indexOf('painel-produtividade-') === 0 || k.indexOf('pp.') === 0 || k.indexOf('pp_') === 0)) apagar.push(k);
      }
      apagar.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { }
    gravarLocal(CHAVE_VERSAO, id);
    return true;
  }
  function carregar() {
    if (DADOS) return DADOS;
    sementeMudou();
    var salvo = lerLocal(CHAVE_DADOS);
    if (salvo) { try { DADOS = JSON.parse(salvo); } catch (e) { DADOS = null; } }
    if (!DADOS) {
      var semente = window.PP_DEMO_SEMENTE || { documentos: {} };
      DADOS = clone(semente.documentos || {});
      persistirJa();
    }
    return DADOS;
  }
  var relogioPersistir = null;
  function persistirJa() {
    if (!gravarLocal(CHAVE_DADOS, JSON.stringify(DADOS))) {
      try { console.warn('[Demonstração] Sem espaço no navegador: as edições valem até recarregar a página.'); } catch (e) { }
    }
  }
  function persistir() { clearTimeout(relogioPersistir); relogioPersistir = setTimeout(persistirJa, 150); }

  function bytesTexto(s) { try { return unescape(encodeURIComponent(String(s))).length; } catch (e) { return String(s).length; } }
  function tamValor(v) {
    if (v === null || v === undefined || typeof v === 'boolean') return 1;
    if (typeof v === 'number') return 8;
    if (typeof v === 'string') return bytesTexto(v) + 1;
    if (Array.isArray(v)) return v.reduce(function (s, x) { return s + tamValor(x); }, 0);
    if (typeof v === 'object') return Object.keys(v).reduce(function (s, k) { return s + bytesTexto(k) + 1 + tamValor(v[k]); }, 0);
    return 8;
  }
  function tamDoc(caminho, dados) { return caminho.split('/').reduce(function (s, p) { return s + bytesTexto(p) + 1; }, 16) + tamValor(dados) + 32; }

  function valorEspecial(v, antigo) {
    if (v && typeof v === 'object' && v.__fv) {
      if (v.__fv === 'ts') return new Date().toISOString();
      if (v.__fv === 'union') { var a = Array.isArray(antigo) ? antigo.slice() : []; v.a.forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); return a; }
      if (v.__fv === 'inc') return (Number(antigo) || 0) + v.n;
    }
    return v;
  }
  function mesclar(base, novo, profundo) {
    Object.keys(novo || {}).forEach(function (k) {
      var v = novo[k];
      if (v && typeof v === 'object' && v.__fv === 'del') { delete base[k]; return; }
      if (profundo && v && typeof v === 'object' && !Array.isArray(v) && !v.__fv && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        mesclar(base[k], v, true); return;
      }
      base[k] = clone(valorEspecial(v, base[k]));
    });
    return base;
  }
  function filhoDe(col, p) { return p.indexOf(col + '/') === 0 && p.slice(col.length + 1).indexOf('/') < 0; }
  function fotoDoc(caminho) {
    var d = carregar()[caminho];
    return { id: caminho.split('/').pop(), exists: d !== undefined, data: function () { return clone(d); },
      get: function (k) { return d ? d[k] : undefined; }, ref: refDoc(caminho), metadata: { hasPendingWrites: false, fromCache: false } };
  }
  function passa(d, w) {
    var v = d[w[0]], op = w[1], x = w[2];
    if (op === '==') return v === x; if (op === '>=') return v >= x; if (op === '<=') return v <= x;
    if (op === '>') return v > x; if (op === '<') return v < x; if (op === 'in') return x.indexOf(v) >= 0;
    if (op === 'array-contains') return Array.isArray(v) && v.indexOf(x) >= 0;
    return true;
  }
  function fotoConsulta(col, q) {
    var D = carregar();
    var caminhos = Object.keys(D).filter(function (p) { return filhoDe(col, p); }).sort();
    (q.where || []).forEach(function (w) { caminhos = caminhos.filter(function (p) { return passa(D[p] || {}, w); }); });
    if (q.orderBy) {
      var f = q.orderBy[0], desc = q.orderBy[1] === 'desc';
      caminhos.sort(function (a, b) { var x = (D[a] || {})[f], y = (D[b] || {})[f]; return (x > y ? 1 : x < y ? -1 : 0) * (desc ? -1 : 1); });
    }
    if (q.limit) caminhos = caminhos.slice(0, q.limit);
    var docs = caminhos.map(fotoDoc);
    return { docs: docs, empty: !docs.length, size: docs.length, forEach: function (fn) { docs.forEach(fn); },
      docChanges: function () { return docs.map(function (d) { return { type: 'added', doc: d }; }); } };
  }
  function avisar(caminho) {
    ouvintes.forEach(function (o) {
      if (o.tipo === 'doc' && o.caminho === caminho) depois(function () { o.cb(fotoDoc(caminho)); });
      if (o.tipo === 'col' && filhoDe(o.caminho, caminho)) depois(function () {
        var s = fotoConsulta(o.caminho, o.q || {});
        var mudou = { type: carregar()[caminho] === undefined ? 'removed' : 'modified', doc: fotoDoc(caminho) };
        s.docChanges = function () { return [mudou]; };
        o.cb(s);
      });
    });
  }
  function erroFirebase(codigo, msg) { var e = new Error(msg); e.code = codigo; return e; }

  function refDoc(caminho) {
    return {
      id: caminho.split('/').pop(), path: caminho,
      collection: function (n) { return refCol(caminho + '/' + n); },
      get: function () { return Promise.resolve(fotoDoc(caminho)); },
      set: function (dados, op) {
        var D = carregar();
        var merge = !!(op && op.merge);
        var futuro = mesclar(merge && D[caminho] ? clone(D[caminho]) : {}, dados, merge);
        if (tamDoc(caminho, futuro) > LIMITE_DOCUMENTO) {
          return Promise.reject(erroFirebase('invalid-argument', 'O documento "' + caminho + '" passa do limite de 1 MB.'));
        }
        D[caminho] = futuro; persistir(); avisar(caminho);
        return Promise.resolve();
      },
      update: function (dados) {
        var D = carregar();
        if (D[caminho] === undefined) return Promise.reject(erroFirebase('not-found', 'Documento inexistente.'));
        D[caminho] = mesclar(clone(D[caminho]), dados, false); persistir(); avisar(caminho);
        return Promise.resolve();
      },
      delete: function () { var D = carregar(); delete D[caminho]; persistir(); avisar(caminho); return Promise.resolve(); },
      onSnapshot: function (cb, erro) {
        var o = { tipo: 'doc', caminho: caminho, cb: cb, erro: erro }; ouvintes.push(o);
        depois(function () { cb(fotoDoc(caminho)); });
        return function () { ouvintes = ouvintes.filter(function (x) { return x !== o; }); };
      }
    };
  }
  function refCol(caminho, q) {
    q = q || {};
    function com(extra) { var n = {}; Object.keys(q).forEach(function (k) { n[k] = q[k]; }); Object.keys(extra).forEach(function (k) { n[k] = extra[k]; }); return refCol(caminho, n); }
    return {
      id: caminho.split('/').pop(), path: caminho,
      doc: function (id) { return refDoc(caminho + '/' + (id || ('demo' + Date.now().toString(36) + (++seq)))); },
      add: function (dados) { var r = refDoc(caminho + '/demo' + Date.now().toString(36) + (++seq)); return r.set(dados).then(function () { return r; }); },
      where: function (f, op, v) { return com({ where: (q.where || []).concat([[f, op, v]]) }); },
      orderBy: function (f, dir) { return com({ orderBy: [f, dir] }); },
      limit: function (n) { return com({ limit: n }); },
      get: function () { return Promise.resolve(fotoConsulta(caminho, q)); },
      onSnapshot: function (cb, erro) {
        var o = { tipo: 'col', caminho: caminho, q: q, cb: cb, erro: erro }; ouvintes.push(o);
        depois(function () { cb(fotoConsulta(caminho, q)); });
        return function () { ouvintes = ouvintes.filter(function (x) { return x !== o; }); };
      }
    };
  }
  var banco = { collection: function (n) { return refCol(n); }, doc: function (p) { return refDoc(p); },
    settings: function () { }, enablePersistence: function () { return Promise.resolve(); } };

  /* ── Login de demonstração ──────────────────────────────────────────── */
  function contas() {
    var D = carregar();
    if (!D.__contasDemo) D.__contasDemo = clone((window.PP_DEMO_SEMENTE && window.PP_DEMO_SEMENTE.contas) || {});
    return D.__contasDemo;
  }
  function usuarioPorUid(uid) {
    var c = contas();
    var email = Object.keys(c).find(function (e) { return c[e].uid === uid; });
    return email ? { uid: uid, email: email, displayName: (carregar()['users/' + uid] || {}).nome || email } : null;
  }
  var ouvintesLogin = [];
  var login = {
    currentUser: null,
    onAuthStateChanged: function (cb) { ouvintesLogin.push(cb); depois(function () { restaurarSessao(); cb(login.currentUser); }); return function () { ouvintesLogin = ouvintesLogin.filter(function (x) { return x !== cb; }); }; },
    signInWithEmailAndPassword: function (email, senha) {
      var c = contas()[String(email || '').trim().toLowerCase()];
      if (!c || c.senha !== String(senha || '')) return Promise.reject(erroFirebase('auth/invalid-credential', 'E-mail ou senha inválidos.'));
      login.currentUser = usuarioPorUid(c.uid);
      gravarLocal(CHAVE_SESSAO, c.uid);
      ouvintesLogin.forEach(function (cb) { depois(function () { cb(login.currentUser); }); });
      return Promise.resolve({ user: login.currentUser });
    },
    signOut: function () {
      login.currentUser = null;
      try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) { }
      /* Igual à nuvem de verdade: ao sair, toda escuta aberta é encerrada com
         'permission-denied' (as regras exigem login). O painel já trata esse
         aviso e volta a escutar no próximo login: sem isso, trocar de usuário
         sem recarregar a página deixava as escutas antigas e os dados novos
         não chegavam. */
      var encerradas = ouvintes; ouvintes = [];
      encerradas.forEach(function (o) {
        if (typeof o.erro === 'function') depois(function () { try { o.erro(erroFirebase('permission-denied', 'Sessão encerrada.')); } catch (e) { } });
      });
      ouvintesLogin.forEach(function (cb) { depois(function () { cb(null); }); });
      return Promise.resolve();
    },
    sendPasswordResetEmail: function () { return Promise.resolve(); },
    setPersistence: function () { return Promise.resolve(); }
  };
  /* Sessão guardada: como no Firebase de verdade, o login volta um instante
     depois de a página carregar, e não no primeiro momento. Voltar cedo demais
     fazia um trecho antigo do painel abrir as escutas dos contratos antes da
     hora, e depois de recarregar a página (F5) os contratos ficavam em
     "carregando" para sempre. */
  var sessaoGuardada = lerLocal(CHAVE_SESSAO);
  var sessaoRestaurada = false;
  function restaurarSessao() {
    if (sessaoRestaurada) return;
    sessaoRestaurada = true;
    if (sessaoGuardada && !login.currentUser) login.currentUser = usuarioPorUid(sessaoGuardada);
  }
  document.addEventListener('DOMContentLoaded', function () { depois(restaurarSessao); });

  var app = { name: '[DEFAULT]', options: { projectId: 'demonstracao' }, auth: function () { return login; }, firestore: function () { return banco; } };
  var fb = {
    apps: [],
    initializeApp: function (c, nome) {
      if (nome) {
        return { name: nome, firestore: function () { return banco; }, delete: function () { return Promise.resolve(); }, auth: function () {
          return {
            createUserWithEmailAndPassword: function (email, senha) {
              var k = String(email || '').trim().toLowerCase();
              if (contas()[k]) return Promise.reject(erroFirebase('auth/email-already-in-use', 'E-mail já cadastrado.'));
              var uid = 'demo-' + Date.now().toString(36);
              contas()[k] = { uid: uid, senha: String(senha || '') }; persistir();
              return Promise.resolve({ user: { uid: uid, email: k } });
            },
            signOut: function () { return Promise.resolve(); }
          };
        } };
      }
      if (fb.apps.indexOf(app) < 0) fb.apps.push(app);
      return app;
    },
    app: function () { return app; }
  };
  fb.auth = function () { return login; };
  fb.auth.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };
  fb.firestore = function () { return banco; };
  fb.firestore.FieldValue = {
    serverTimestamp: function () { return { __fv: 'ts' }; },
    delete: function () { return { __fv: 'del' }; },
    arrayUnion: function () { return { __fv: 'union', a: Array.prototype.slice.call(arguments) }; },
    increment: function (n) { return { __fv: 'inc', n: n }; }
  };
  window.firebase = fb;
  /* O painel exige uma configuração para considerar a nuvem "configurada". */
  window.PP_FIREBASE_CONFIG = { apiKey: 'demonstracao', authDomain: 'demonstracao.local', projectId: 'demonstracao', appId: 'demonstracao' };

  document.addEventListener('DOMContentLoaded', function () { document.body.classList.add('pp-demo'); });

  /* ── Ferramentas da demonstração ────────────────────────────────────── */
  window.ppDemo = {
    contas: function () {
      var c = window.PP_DEMO_SEMENTE && window.PP_DEMO_SEMENTE.contas || {};
      var D = carregar();
      return Object.keys(c).map(function (email) { var u = D['users/' + c[email].uid] || {}; return { email: email, senha: c[email].senha, nome: u.nome || email, perfil: u.role || '' }; });
    },
    entrar: function (email) {
      var c = contas()[email];
      return c ? login.signInWithEmailAndPassword(email, c.senha) : Promise.reject(new Error('conta inexistente'));
    },
    restaurar: function () {
      try {
        var apagar = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.indexOf('pp-demo-') === 0 || k.indexOf('painel-produtividade-') === 0 || k.indexOf('pp.') === 0 || k.indexOf('pp_') === 0)) apagar.push(k);
        }
        apagar.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { }
      location.reload();
    }
  };
})();
