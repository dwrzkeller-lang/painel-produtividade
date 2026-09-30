(function () {
  'use strict';
  if (window.__ppArmazenamentoSeguro) return;
  window.__ppArmazenamentoSeguro = true;

  var PREFIXO = 'painel-produtividade-';
  var memoria = {};
  var avisou = false;
  var proto;
  try { proto = window.Storage && Storage.prototype; } catch (e) { proto = null; }
  if (!proto) return;
  var gravarOriginal = proto.setItem;
  var lerOriginal = proto.getItem;
  var apagarOriginal = proto.removeItem;

  function local() { try { return window.localStorage; } catch (e) { return null; } }
  function vigiada(armazem, chave) {
    return armazem === local() && typeof chave === 'string' && chave.indexOf(PREFIXO) === 0;
  }
  function semEspaco(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message || '')));
  }

  proto.setItem = function (chave, valor) {
    if (!vigiada(this, chave)) return gravarOriginal.apply(this, arguments);
    var texto = String(valor);
    try {
      gravarOriginal.call(this, chave, texto);
      delete memoria[chave];
      return;
    } catch (e) {
      if (!semEspaco(e)) throw e;
    }
    try { apagarOriginal.call(this, chave); } catch (e) { }
    try {
      gravarOriginal.call(this, chave, texto);
      delete memoria[chave];
      return;
    } catch (e) {
      if (!semEspaco(e)) throw e;
    }
    memoria[chave] = texto;
    if (!avisou) {
      avisou = true;
      try { console.warn('[Painel] Espaço do navegador cheio: parte dos dados fica só na memória desta página (a nuvem continua completa).'); } catch (e) { }
    }
  };

  proto.getItem = function (chave) {
    if (vigiada(this, chave) && Object.prototype.hasOwnProperty.call(memoria, chave)) return memoria[chave];
    return lerOriginal.apply(this, arguments);
  };

  proto.removeItem = function (chave) {
    if (vigiada(this, chave)) delete memoria[chave];
    return apagarOriginal.apply(this, arguments);
  };

  window.ppMemoriaDoNavegador = {
    chaves: function () { return Object.keys(memoria); },
    limpar: function () { memoria = {}; }
  };
})();
