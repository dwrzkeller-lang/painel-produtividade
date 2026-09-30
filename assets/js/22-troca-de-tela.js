(function () {
  "use strict";

  var geracao = 0;

  var relogios = [];

  function agendar(fn, ms) {
    var t = setTimeout(fn, ms);
    relogios.push(t);
    return t;
  }

  function cancelarRelogios() {
    for (var i = 0; i < relogios.length; i++) {
      try { clearTimeout(relogios[i]); } catch (e) { }
    }
    relogios = [];
  }

  function capa() { return document.getElementById("execLoadingOverlay"); }

  var LIMITE_CAO_DE_GUARDA_MS = 15000;

  var subirOriginal = window.ppShowLoading;

  window.ppShowLoading = function (subtitulo, legenda) {
    geracao++;
    cancelarRelogios();

    var r;
    try {
      if (typeof subirOriginal === "function") r = subirOriginal.apply(this, arguments);
    } catch (e) {
      console.warn("[Painel] Falha ao montar a tela de carregamento.", e);
    }

    try {
      var ov = capa();
      if (ov) {
        ov.style.display = "flex";
        ov.style.opacity = "1";
        ov.style.pointerEvents = "auto";
      }
    } catch (e) { }

    var minhaGeracao = geracao;
    agendar(function () {
      if (geracao !== minhaGeracao) return;
      console.warn("[Painel] A troca de tela nao terminou em " +
        (LIMITE_CAO_DE_GUARDA_MS / 1000) + "s. Descendo a tela de carregamento " +
        "para o painel nao ficar preso. Se os numeros aparecerem vazios, recarregue a pagina.");
      try { window.__ppRestoringCardScreen = false; } catch (e) { }
      try { window.ppHideLoading(); } catch (e) { }
    }, LIMITE_CAO_DE_GUARDA_MS);

    return r;
  };

  window.ppHideLoading = function () {
    if (window.__ppRestoringCardScreen) return;

    var ov = capa();
    if (!ov) return;

    var minhaGeracao = geracao;

    var minMs = Number(window.PP_LOADING_MIN_MS || 0);
    var mostradaEm = Number(ov.dataset ? (ov.dataset.shownAt || 0) : 0);
    var decorrido = mostradaEm ? (Date.now() - mostradaEm) : minMs;
    var esperar = Math.max(0, minMs - decorrido);

    cancelarRelogios();

    agendar(function () {
      if (geracao !== minhaGeracao) return;
      var el = capa();
      if (!el) return;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";

      agendar(function () {
        if (geracao !== minhaGeracao) return;
        var el2 = capa();
        if (el2) el2.style.display = "none";
      }, 260);

      try {
        if (document.documentElement.dataset.ppLoadingScrollLock) {
          delete document.documentElement.dataset.ppLoadingScrollLock;
          var cardAberto = document.querySelector(".team-card-page.open, .all-team-card-page.open");
          if (!cardAberto) document.documentElement.style.overflow = "";
        }
      } catch (e) { }
    }, esperar);
  };

  function protegerAberturaDeContrato() {
    if (typeof window._pickProject !== "function") return false;
    if (window._pickProject.__ppProtegido) return true;

    var original = window._pickProject;
    var protegido = function (projectId) {
      try {
        return original.apply(this, arguments);
      } catch (e) {
        console.error("[Painel] Falha ao abrir o contrato '" + projectId +
          "'. A tela de carregamento foi liberada para o painel nao ficar preso.", e);
        try { window.__ppRestoringCardScreen = false; } catch (e2) { }
        try { window.ppHideLoading(); } catch (e2) { }
        try {
          if (typeof window.renderAll === "function") window.renderAll();
        } catch (e2) { }
        return undefined;
      }
    };
    protegido.__ppProtegido = true;
    window._pickProject = protegido;
    return true;
  }

  if (!protegerAberturaDeContrato()) {
    var tentativas = 0;
    var relogioProtecao = setInterval(function () {
      tentativas++;
      if (protegerAberturaDeContrato() || tentativas > 40) clearInterval(relogioProtecao);
    }, 50);
  }
})();
