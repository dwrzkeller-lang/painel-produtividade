(function () {
  'use strict';

  var RAIZ = (typeof PP_FIRESTORE_ROOT !== 'undefined') ? PP_FIRESTORE_ROOT : 'painel_produtividade';
  var LIMITE_DOC = 1048576;
  var DIA_MS = 86400000;
  var ROTULO_PERFIL = { admin: 'Administrador', ceo: 'CEO / Presidente', diretor: 'Diretor', gerente: 'Gerente', coordenador: 'Coordenador', controller: 'Controller' };
  var EDITAM = ['controller', 'coordenador'];

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function banco() {
    try {
      if (typeof ppInitFirebase === 'function' && !ppInitFirebase()) return null;
      return (window.firebase && firebase.firestore) ? firebase.firestore() : null;
    } catch (e) { return null; }
  }
  function colBase(nome) { var b = banco(); return b ? b.collection(RAIZ).doc('base').collection(nome) : null; }
  function projetos() { return (typeof PROJECTS !== 'undefined' && Array.isArray(PROJECTS)) ? PROJECTS : []; }
  function haQuanto(ms) { return (typeof window.ppAdmHaQuanto === 'function') ? window.ppAdmHaQuanto(ms) : ''; }
  function msDe(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && typeof v.toMillis === 'function') return v.toMillis();
    var t = Date.parse(v); return isNaN(t) ? 0 : t;
  }
  function dataHora(ms) {
    if (!ms) return '-';
    var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function kb(bytes) { return (bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' KB'; }
  function bytesDe(obj) {
    var s = JSON.stringify(obj || {});
    try { return new Blob([s]).size; } catch (e) { return s.length; }
  }
  function texto(id, v) { var e = el(id); if (e) e.textContent = v; }

  var _cache = {};
  function lerUmaVez(chave, ler) {
    var c = _cache[chave];
    if (c && Date.now() - c.em < 30000) return c.promessa;
    var promessa = ler().catch(function () { return null; });
    _cache[chave] = { em: Date.now(), promessa: promessa };
    return promessa;
  }
  function lerUsuarios() {
    return lerUmaVez('usuarios', function () {
      var b = banco(); if (!b) return Promise.resolve(null);
      return b.collection('users').get().then(function (snap) {
        var out = []; snap.forEach(function (d) { var x = d.data() || {}; x.__uid = d.id; out.push(x); }); return out;
      });
    });
  }
  function lerPresenca() {
    return lerUmaVez('presenca', function () {
      var c = colBase('presence'); if (!c) return Promise.resolve(null);
      return c.get().then(function (snap) { var out = []; snap.forEach(function (d) { out.push(d.data() || {}); }); return out; });
    });
  }
  function lerEdicoes() {
    return lerUmaVez('edicoes', function () {
      var c = colBase('editLog'); if (!c) return Promise.resolve(null);
      return c.orderBy('atMs', 'desc').limit(500).get().then(function (snap) { var out = []; snap.forEach(function (d) { out.push(d.data() || {}); }); return out; });
    });
  }
  function lerContrato(pid) {
    var b = banco(); if (!b) return Promise.resolve(null);
    return b.collection(RAIZ).doc('base').collection('projects').doc(pid).get()
      .then(function (snap) { return snap.exists ? (snap.data() || {}) : null; })
      .catch(function () { return null; });
  }
  function lerMeses(pid) {
    var b = banco(); if (!b) return Promise.resolve(null);
    return b.collection(RAIZ).doc('base').collection('projects').doc(pid).collection('history').get()
      .then(function (snap) { var out = []; snap.forEach(function (d) { out.push({ id: d.id, data: d.data() || {} }); }); return out; })
      .catch(function () { return null; });
  }

  function nomePorEmail(usuarios) {
    var m = {};
    (usuarios || []).forEach(function (u) { if (u.email) m[String(u.email).toLowerCase()] = u.nome || u.email; });
    return function (email) { return m[String(email || '').toLowerCase()] || email || '-'; };
  }
  function editoresDe(usuarios, pid) {
    return (usuarios || []).filter(function (u) {
      return u.ativo !== false && EDITAM.indexOf(u.role) >= 0 && u.somenteLeitura !== true &&
        Array.isArray(u.projectIds) && u.projectIds.indexOf(pid) >= 0;
    });
  }

  window.adminRenderVisaoGeral = function (forcar) {
    if (forcar === true) _cache = {};
    Promise.all([lerUsuarios(), lerPresenca(), lerEdicoes()]).then(function (r) {
      var usuarios = r[0] || [], presenca = r[1] || [], edicoes = r[2] || [];
      var agora = Date.now();
      var ativos = usuarios.filter(function (u) { return u.ativo !== false; });
      var inativos = usuarios.length - ativos.length;
      var nome = nomePorEmail(usuarios);

      var online = presenca.filter(function (p) { return agora - (Number(p.atMs) || 0) <= 90000; });
      texto('admKpiAtivos', String(ativos.length));
      texto('admKpiAtivosSub', 'de ' + usuarios.length + ' cadastrados' + (inativos ? ' · ' + inativos + ' inativo(s)' : ''));
      texto('admKpiOnline', String(online.length));
      texto('admPulsoN', String(online.length));
      texto('admKpiOnlineSub', online.length ? online.slice(0, 3).map(function (p) { return nome(p.user); }).join(', ') : 'ninguém com o painel aberto');

      var ultimo = {};
      function marca(email, ms) { var k = String(email || '').toLowerCase(); if (k && ms > (ultimo[k] || 0)) ultimo[k] = ms; }
      usuarios.forEach(function (u) { marca(u.email, Number(u.ultimoAcessoMs) || 0); });
      presenca.forEach(function (p) { marca(p.user, Number(p.atMs) || 0); });
      edicoes.forEach(function (e) { marca(e.user, Number(e.atMs) || 0); });
      var semana = ativos.filter(function (u) { return agora - (ultimo[String(u.email || '').toLowerCase()] || 0) <= 7 * DIA_MS; });
      texto('admKpiSemana', String(semana.length));
      texto('admKpiSemanaSub', 'de ' + ativos.length + ' usuário(s) ativo(s)');

      var edSemana = edicoes.filter(function (e) { return agora - (Number(e.atMs) || 0) <= 7 * DIA_MS; });
      var contratosEd = {}; edSemana.forEach(function (e) { if (e.projectId) contratosEd[e.projectId] = true; });
      texto('admKpiEdicoes', String(edSemana.length));
      texto('admKpiEdicoesSub', edSemana.length ? 'em ' + Object.keys(contratosEd).length + ' contrato(s)' : 'nenhum salvamento na semana');

      var alertas = [];
      var semEditor = projetos().filter(function (p) { return !editoresDe(usuarios, p.id).length; });
      if (semEditor.length) alertas.push(['atencao', '<b>Só o administrador pode editar:</b> ' + semEditor.map(function (p) { return esc(p.nome); }).join(', ') +
        '. Para um controller ou coordenador editar, marque o contrato no cadastro dele (Usuários → Editar perfil e status).']);
      var semContrato = ativos.filter(function (u) { return EDITAM.indexOf(u.role) >= 0 && !(Array.isArray(u.projectIds) && u.projectIds.length); });
      if (semContrato.length) alertas.push(['atencao', '<b>Sem nenhum contrato marcado:</b> ' + semContrato.map(function (u) { return esc(u.nome || u.email); }).join(', ') +
        ': entra no painel, mas não tem contrato para abrir.']);
      var sumidos = ativos.filter(function (u) { return agora - (ultimo[String(u.email || '').toLowerCase()] || 0) > 30 * DIA_MS; });
      if (sumidos.length) alertas.push(['neutro', '<b>' + sumidos.length + ' pessoa(s) ativa(s) sem entrar há mais de 30 dias:</b> ' +
        sumidos.slice(0, 6).map(function (u) { return esc(u.nome || u.email); }).join(', ') + (sumidos.length > 6 ? '…' : '') + '.']);
      if (inativos) alertas.push(['neutro', '<b>' + inativos + ' usuário(s) desativado(s)</b>: não conseguem entrar. Veja em Usuários → filtro "Inativos".']);
      if (!semEditor.length && !semContrato.length) alertas.unshift(['ok', '<b>Todos os contratos têm quem os edite</b> e todo controller/coordenador tem contrato marcado.']);
      var ul = el('admAlertas');
      if (ul) ul.innerHTML = alertas.map(function (a) {
        var cls = a[0] === 'ok' ? ' adm-alerta-ok' : a[0] === 'atencao' ? ' adm-alerta-atencao' : a[0] === 'critico' ? ' adm-alerta-critico' : '';
        return '<li class="adm-alerta' + cls + '"><span class="adm-alerta-sinal"></span><span>' + a[1] + '</span></li>';
      }).join('');

      var cont = {};
      ativos.forEach(function (u) { cont[u.role] = (cont[u.role] || 0) + 1; });
      var maior = Math.max.apply(null, [1].concat(Object.keys(cont).map(function (k) { return cont[k]; })));
      var boxPerfis = el('admPerfis');
      if (boxPerfis) boxPerfis.innerHTML = Object.keys(ROTULO_PERFIL).filter(function (k) { return cont[k]; }).map(function (k) {
        return '<div class="adm-perfil"><span>' + esc(ROTULO_PERFIL[k]) + '</span><div class="adm-trilho"><i style="width:' + Math.round(100 * cont[k] / maior) + '%"></i></div><em>' + cont[k] + '</em></div>';
      }).join('') || '<p class="adm-vazio">Nenhum usuário ativo.</p>';

      var boxRec = el('admRecentes');
      if (boxRec) {
        if (!edicoes.length) boxRec.innerHTML = '<p class="adm-vazio">Nenhum salvamento registrado ainda.</p>';
        else boxRec.innerHTML = '<table class="adm-tabela"><thead><tr><th>Contrato</th><th>Quem salvou</th><th>Perfil</th><th>Quando</th></tr></thead><tbody>' +
          edicoes.slice(0, 8).map(function (e) {
            return '<tr><td>' + esc(e.projectName || e.projectId || '-') + '</td><td>' + esc(nome(e.user)) + '</td>' +
              '<td class="adm-suave">' + esc(ROTULO_PERFIL[e.role] || e.role || '') + '</td>' +
              '<td class="adm-suave" style="white-space:nowrap">' + esc(haQuanto(e.atMs)) + ' · ' + esc(dataHora(Number(e.atMs) || 0)) + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
    });
  };

  var _meses = null;
  var _conferindo = false;

  function desenharContratos(usuarios, docs) {
    var box = el('admContratosLista'); if (!box) return;
    var nome = nomePorEmail(usuarios);
    box.innerHTML = projetos().map(function (p, i) {
      var doc = docs[i];
      var editores = editoresDe(usuarios, p.id);
      var gerentes = (usuarios || []).filter(function (u) { return u.ativo !== false && u.role === 'gerente' && Array.isArray(u.projectIds) && u.projectIds.indexOf(p.id) >= 0; });
      var salvoMs = doc ? (msDe(doc.lastUpdatedAt) || msDe(doc.updatedAt)) : 0;
      var equipes = doc && Array.isArray(doc.equipes) ? doc.equipes.length : 0;
      var linhas = '';
      linhas += '<div class="adm-linha"><span>Quem edita</span><div>' + (editores.length
        ? editores.map(function (u) { return '<span class="adm-contrato-chip" style="background:#E2F3E8;color:#065F46;border-color:#BFE3CC">' + esc(u.nome || u.email) + '</span>'; }).join('')
        : '<span style="color:#8A5D00">só o administrador</span>') + '</div></div>';
      if (gerentes.length) linhas += '<div class="adm-linha"><span>Gerente</span><div>' + gerentes.map(function (u) { return esc(u.nome || u.email); }).join(', ') + '</div></div>';
      linhas += '<div class="adm-linha"><span>Último salvamento</span><div>' + (doc
        ? esc(dataHora(salvoMs)) + (doc.updatedBy ? ' <span class="adm-suave">por ' + esc(nome(doc.updatedBy)) + '</span>' : '')
        : '<span class="adm-suave">nada salvo na nuvem ainda</span>') + '</div></div>';
      linhas += '<div class="adm-linha"><span>Equipes</span><div>' + equipes + '</div></div>';
      var meses = _meses && _meses[p.id];
      var blocoMeses;
      if (!_meses) blocoMeses = '<p class="adm-nota" style="margin:10px 0 0">' + (_conferindo ? 'Lendo os meses na nuvem…' : 'Clique em "Conferir meses na nuvem" para ver cada mês guardado.') + '</p>';
      else if (!meses) blocoMeses = '<p class="adm-nota" style="margin:10px 0 0;color:#B3321F">Não foi possível ler os meses deste contrato.</p>';
      else if (!meses.length) blocoMeses = '<p class="adm-nota" style="margin:10px 0 0">Nenhum mês de produção guardado na nuvem.</p>';
      else {
        var anoAtual = new Date().getFullYear();
        blocoMeses = '<div class="adm-meses">' + meses.slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; }).map(function (m) {
          var dias = Object.keys((m.data && m.data.days) || {});
          var bytes = bytesDe(m.data);
          var pct = Math.min(100, Math.round(100 * bytes / LIMITE_DOC));
          var cls = pct >= 85 ? ' adm-mes-critico' : pct >= 60 ? ' adm-mes-atencao' : '';
          var partes = String(m.id).split('-');
          var rotulo = partes.length === 2 ? partes[1] + '/' + partes[0] : m.id;
          var estranho = partes.length === 2 && Math.abs(Number(partes[0]) - anoAtual) > 1;
          var quando = msDe(m.data && m.data.updatedAt);
          var dica = 'Gravado ' + (quando ? 'em ' + dataHora(quando) : '') + (m.data && m.data.updatedBy ? ' por ' + nome(m.data.updatedBy) : '');
          return '<div class="adm-mes' + cls + '" title="' + esc(dica) + '"><span>' + esc(rotulo) + (estranho ? ' <b style="color:#8A5D00" title="Ano fora do período dos contratos, provável data digitada errada numa planilha">?</b>' : '') + '</span>' +
            '<div class="adm-trilho"><i style="width:' + Math.max(2, pct) + '%"></i></div>' +
            '<small>' + dias.length + ' dia(s) · ' + kb(bytes) + ' (' + pct + '%)</small></div>';
        }).join('') + '</div>';
      }
      return '<article class="adm-contrato"><div class="adm-contrato-topo"><div><h5>' + esc(p.nome) + '</h5>' +
        '<div class="adm-contrato-sub">' + esc(p.id) + '</div></div>' +
        (doc ? '<span class="adm-pilula adm-pilula-verde">na nuvem</span>' : '<span class="adm-pilula">vazio</span>') + '</div>' +
        linhas + blocoMeses + '</article>';
    }).join('');
  }

  var _docsContratos = [];
  window.adminRenderContratos = function () {
    var box = el('admContratosLista'); if (!box) return;
    if (!_docsContratos.length) box.innerHTML = '<p class="adm-vazio">Lendo os contratos na nuvem…</p>';
    Promise.all([lerUsuarios(), Promise.all(projetos().map(function (p) { return lerContrato(p.id); }))]).then(function (r) {
      _docsContratos = r[1] || [];
      desenharContratos(r[0] || [], _docsContratos);
      if (!_meses && !_conferindo) window.adminConferirNuvem();
    });
  };

  window.adminConferirNuvem = function () {
    if (_conferindo) return;
    _conferindo = true;
    delete _cache.usuarios;
    var status = el('admNuvemStatus');
    if (status) status.textContent = 'Lendo cada mês guardado na nuvem…';
    lerUsuarios().then(function (usuarios) {
      desenharContratos(usuarios || [], _docsContratos);
      return Promise.all(projetos().map(function (p) { return lerMeses(p.id); })).then(function (lista) {
        var mapa = {}, totalMeses = 0, totalDias = 0, maior = null;
        projetos().forEach(function (p, i) {
          mapa[p.id] = lista[i];
          (lista[i] || []).forEach(function (m) {
            totalMeses++;
            totalDias += Object.keys((m.data && m.data.days) || {}).length;
            var b = bytesDe(m.data);
            if (!maior || b > maior.bytes) maior = { bytes: b, pid: p.nome, mes: m.id };
          });
        });
        _meses = mapa;
        _conferindo = false;
        desenharContratos(usuarios || [], _docsContratos);
        if (status) status.textContent = 'Conferido às ' + dataHora(Date.now()).slice(11) + ': ' + totalMeses + ' mês(es) e ' + totalDias +
          ' dia(s) guardados na nuvem.' + (maior ? ' Maior mês: ' + maior.pid + ' ' + maior.mes.split('-').reverse().join('/') + ' com ' + kb(maior.bytes) +
          ' (' + Math.round(100 * maior.bytes / LIMITE_DOC) + '% do limite de 1 MB).' : '');
      });
    }).catch(function () {
      _conferindo = false;
      if (status) status.textContent = 'Não foi possível ler a nuvem agora. Tente de novo em instantes.';
    });
  };

  var _baixando = false;
  window.adminBaixarCopia = function () {
    if (_baixando) return;
    _baixando = true;
    var status = el('admNuvemStatus');
    if (status) status.textContent = 'Lendo a nuvem para montar a cópia…';
    var lista = projetos();
    Promise.all(lista.map(function (p) { return Promise.all([lerContrato(p.id), lerMeses(p.id)]); })).then(function (r) {
      var copia = { tipo: 'pp-dash-copia-de-seguranca', geradaEm: new Date().toISOString(), raiz: RAIZ, contratos: {} };
      var meses = 0, falhas = [];
      lista.forEach(function (p, i) {
        var doc = r[i][0], hist = r[i][1];
        if (hist === null) falhas.push(p.nome);
        var historico = {};
        (hist || []).forEach(function (m) { historico[m.id] = m.data; meses++; });
        copia.contratos[p.id] = { nome: p.nome, documento: doc, historico: historico };
      });
      var json = JSON.stringify(copia);
      var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var nomeArq = 'pp-copia-de-seguranca-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + 'h' + pad(d.getMinutes()) + '.json';
      var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nomeArq;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { } }, 1000);
      window.__ppUltimaCopia = { arquivo: nomeArq, contratos: lista.length, meses: meses, bytes: blob.size, falhas: falhas };
      if (status) status.textContent = 'Cópia baixada: ' + nomeArq + ' · ' + lista.length + ' contratos, ' + meses + ' mês(es), ' +
        (blob.size / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB.' +
        (falhas.length ? ' Atenção: não consegui ler o histórico de ' + falhas.join(', ') + '.' : '');
      _baixando = false;
    }).catch(function () {
      _baixando = false;
      if (status) status.textContent = 'Não foi possível montar a cópia agora. Tente de novo em instantes.';
    });
  };

  window.adminLimparCentral = function () { _cache = {}; _meses = null; _docsContratos = []; };
})();
