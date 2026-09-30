    const CONFIG_ORIGINAL = {
      "titulo": "PAINEL DE PRODUTIVIDADE",
      "clienteContrato": "",
      "identificacaoContrato": "",
      "basePadrao": "BASE NORTE",
      "baseAlternativa": "BASE NORTE AVANÇADA",
      "marcadorBaseAlternativa": "-AV",
      "rotuloRelatorio": "RELATÓRIO DIÁRIO",
      "textoCardAcompanhamento": "Ficha de acompanhamento",
      "textoCardOperacional": "Resumo para a equipe de campo",
      "subtitulo": "Metas, produção, desvios e status por equipe",
      "diasUteisMes": 21,
      "diasLancados": 0,
      "dataReferencia": "",
      "metaDiariaProjeto": null,
      "limiteAtencao": 0.5,
      "limiteExcelente": 1.0,
      "financeiroExecutivo": {
        "_init": false,
        "budgetAno": 0,
        "forecastAtual": 0,
        "projecaoProducao": 0,
        "ytd": 0,
        "ytg": 0,
        "backlog": 0,
        "custosAtuais": 0,
        "custosFechamento": 0,
        "avancoFisicoPlanejado": 80,
        "avancoFisicoReal": 0,
        "checkAtualizado": false,
        "dataHoraAtualizacao": "",
        "observacaoExecutiva": ""
      }
    };
    const EQUIPES_ORIGINAIS = [];
    const HISTORICO_ORIGINAL = [
      {
        "data": "01/06/2026",
        "total": 0
      },
      {
        "data": "02/06/2026",
        "total": 0
      },
      {
        "data": "03/06/2026",
        "total": 0
      },
      {
        "data": "04/06/2026",
        "total": 0
      },
      {
        "data": "05/06/2026",
        "total": 0
      },
      {
        "data": "06/06/2026",
        "total": 0
      },
      {
        "data": "07/06/2026",
        "total": 0
      },
      {
        "data": "08/06/2026",
        "total": 0
      },
      {
        "data": "09/06/2026",
        "total": 0
      },
      {
        "data": "10/06/2026",
        "total": 0
      },
      {
        "data": "11/06/2026",
        "total": 0
      },
      {
        "data": "12/06/2026",
        "total": 0
      },
      {
        "data": "13/06/2026",
        "total": 0
      },
      {
        "data": "14/06/2026",
        "total": 0
      },
      {
        "data": "15/06/2026",
        "total": 0
      },
      {
        "data": "16/06/2026",
        "total": 0
      },
      {
        "data": "17/06/2026",
        "total": 0
      },
      {
        "data": "18/06/2026",
        "total": 0
      },
      {
        "data": "19/06/2026",
        "total": 0
      }
    ];
    const STORAGE_KEY_BASE = "painel-produtividade-produtividade-editavel-v8-projetos";
    const DAILY_BANK_KEY_BASE = "painel-produtividade-banco-diario-editavel-v3-projetos";
    let currentProjectId = "contrato-alfa";
    let currentLoginTargetId = "executivo-consolidado";
    let currentUserRole = "locked";
    let currentUserLogin = "";
    function storageKey() { return STORAGE_KEY_BASE + "::" + currentProjectId; }
    function dailyBankKey() { return DAILY_BANK_KEY_BASE + "::" + currentProjectId; }

    function parsePeriodo(dateStr) {
      if (!dateStr) return "";
      const s = String(dateStr).trim();
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return m[2] + "/" + m[3];
      const m2 = s.match(/^(\d{2})\/(\d{4})$/);
      if (m2) return s;
      return "";
    }
    function histLabel(data) {
      return String(data || "").slice(0, 5);
    }
    function normalizeHistoricoDate(data, refYear) {
      const s = String(data || "").trim();
      if (/^\d{2}\/\d{2}$/.test(s)) return s + "/" + (refYear || new Date().getFullYear());
      return s;
    }

    const TEAM_CARD_THEME_ORIGINAL = {
      topo: "#161B24",
      destaque: "#1F6FB2",
      fundoInterno: "#F7F8FA",
      fundoTela: "#F2F3F5",
      borda: "#D8DCE2"
    };
    const TEAM_CARD_THEME_PRESETS = {
      padrao: { topo: "#161B24", destaque: "#1F6FB2", fundoInterno: "#F7F8FA", fundoTela: "#F2F3F5", borda: "#D8DCE2" },
      navy: { topo: "#161B24", destaque: "#1F6FB2", fundoInterno: "#F7F8FA", fundoTela: "#F2F3F5", borda: "#D8DCE2" },
      clean: { topo: "#3F4752", destaque: "#1F6FB2", fundoInterno: "#F7F8FA", fundoTela: "#F2F3F5", borda: "#D8DCE2" }
    };

    const EXECUTIVE_PROJECT_DEFAULTS = {
      "contrato-alfa": {
        "id": "contrato-alfa",
        "name": "CONTRATO ALFA · REGIONAL NORTE",
        "short": "Contrato Alfa",
        "region": "Norte",
        "contract": "Manutenção de redes",
        "manager": "Gerência Regional Norte",
        "_init": true
      },
      "contrato-beta": {
        "id": "contrato-beta",
        "name": "CONTRATO BETA · REGIONAL SUL",
        "short": "Contrato Beta",
        "region": "Sul",
        "contract": "Expansão e ligações",
        "manager": "Gerência Regional Sul",
        "_init": true
      },
      "contrato-gama": {
        "id": "contrato-gama",
        "name": "CONTRATO GAMA · REGIONAL OESTE",
        "short": "Contrato Gama",
        "region": "Oeste",
        "contract": "Poda e roçada",
        "manager": "Gerência Regional Oeste",
        "_init": true
      },
      "contrato-delta": {
        "id": "contrato-delta",
        "name": "CONTRATO DELTA · REGIONAL LESTE",
        "short": "Contrato Delta",
        "region": "Leste",
        "contract": "Inspeção e religação",
        "manager": "Gerência Regional Leste",
        "_init": true
      }
    };
    Object.keys(EXECUTIVE_PROJECT_DEFAULTS).forEach(function (projectId) {
      var item = EXECUTIVE_PROJECT_DEFAULTS[projectId];
      ['budgetAno', 'forecastAtual', 'projecaoProducao', 'ytd', 'ytg', 'backlog',
        'custosAtuais', 'custosFechamento', 'avancoFisicoPlanejado', 'avancoFisicoReal',
        'receitaLiquidaProjetada', 'custosProjetados', 'ebitdaForecastMeta', 'qm']
        .forEach(function (campo) { item[campo] = 0; });
      item.observacaoExecutiva = '';
      item._init = true;
    });
    function defaultFinanceForProject(projectId) {
      return {
        _init: true,
        movimentos: [],
        budgetAno: 0, forecastAtual: 0, projecaoProducao: 0,
        receitaLiquidaAtual: 0, ytd: 0, ytg: 0, backlog: 0, qm: 0,
        custosAtuais: 0, custosFechamento: 0, receitaBrutaForecast: 0,
        avancoFisicoPlanejado: 0, avancoFisicoReal: 0,
        receitaLiquidaProjetada: 0, custosProjetados: 0, ebitdaForecastMeta: 0,
        wipArranque: 0, custosDiferimentos: 0,
        faturamentoProjetado: 0, valorFatBi: 0, diaLimiteFaturamento: 0,
        checkAtualizado: false,
        dataHoraAtualizacao: "",
        observacaoExecutiva: ""
      };
    }
    function mergeProjectFinanceDefaults(projectId = currentProjectId) {
      config = normalizeConfigObject(config);
      const fin = config.financeiroExecutivo || {};
      if (!fin._init) {
        config.financeiroExecutivo = { ...defaultFinanceForProject(projectId), ...fin, _init: true };
      }
    }
    function executiveProjectMeta(projectId) { return EXECUTIVE_PROJECT_DEFAULTS[projectId] || {}; }

    let config = normalizeConfigObject(clone(CONFIG_ORIGINAL));
    let equipes = [];
    let historico = [];
    let charts = {};
    let captureCharts = {};
    let teamCardChart = null;
    let allTeamCardsPreviewChart = null;
    const TEAM_CARDS_ORIGINAIS = {};
    let teamCards = JSON.parse(JSON.stringify(TEAM_CARDS_ORIGINAIS));
    let teamCardTheme = clone(TEAM_CARD_THEME_ORIGINAL);
    let selectedCardTeam = "";

    const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
    function n(v) {
      if (typeof v === "string") {
        const raw = v.trim();
        if (!raw) return 0;
        const cleaned = raw.replace(/R\$|\s/g, "");
        const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
        const x = Number(normalized);
        return Number.isFinite(x) ? x : 0;
      }
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    }
    function round2(v) { return Math.round((n(v) + Number.EPSILON) * 100) / 100; }
    function inputValue(v) { return round2(v).toFixed(2); }
    if (window.Chart) {
      Chart.defaults.font.family = "Segoe UI, Arial, sans-serif";
      Chart.defaults.color = "#3F4752";
    }
    function money(v) { return BRL.format(n(v)); }
    function percent(v) { return NUM.format(n(v) * 100) + "%"; }
    function percentRaw(v) { return (n(v) > 0 ? "+" : "") + NUM.format(n(v)) + "%"; }
    function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, n(v))); }
    function deltaClass(v) { return n(v) > 0 ? "pos" : n(v) < 0 ? "neg" : "neu"; }
    function descontoLiquido() { return Math.max(0, Math.min(1, n(config.descontoLiquido ?? 0))); }
    function fatorLiquido() {
      try {
        var fin = (config && config.financeiroExecutivo) || {};
        var doForecast = n(fin.taxaImposto);
        if (doForecast > 0) return doForecast;
      } catch (e) { }
      if (config && config.taxaLiquida != null && config.taxaLiquida !== '') {
        var f = n(config.taxaLiquida); if (f > 0) return f;
      }
      return 1 - descontoLiquido();
    }
    function normalizeConfigObject(obj = {}) {
      const base = clone(CONFIG_ORIGINAL);
      const incoming = obj || {};
      const merged = { ...base, ...incoming };
      merged.financeiroExecutivo = { ...(base.financeiroExecutivo || {}), ...((incoming && incoming.financeiroExecutivo) || {}) };
      merged.mesAno = parsePeriodo(merged.dataReferencia || "");
      return merged;
    }
    function cfgText(key, fallback = "") {
      const value = String((config && config[key]) ?? "").trim();
      return value || fallback;
    }
    function defaultDashboardTitle() {
      return "PAINEL DE PRODUTIVIDADE - " + cfgText("clienteContrato", "CONTRATO").toUpperCase();
    }
    function dashboardTitle() { return cfgText("titulo", defaultDashboardTitle()); }
    function reportLabel() { return cfgText("rotuloRelatorio", "RELATÓRIO DIÁRIO").toUpperCase(); }
    function contractLabel() { return cfgText("identificacaoContrato", cfgText("clienteContrato", "CONTRATO")).toUpperCase(); }
    function cardAcompanhamentoSubtitle() { return cfgText("textoCardAcompanhamento", "Ficha de acompanhamento") + " · " + contractLabel(); }
    function cardOperacionalSubtitle() { return cfgText("textoCardOperacional", "Resumo para a equipe de campo") + " · " + contractLabel(); }
    function updateDocumentTitle() { document.title = dashboardTitle(); }

    const PROJECTS = [
      { id: "contrato-alfa", nome: "Contrato Alfa" },
      { id: "contrato-beta", nome: "Contrato Beta" },
      { id: "contrato-gama", nome: "Contrato Gama" },
      { id: "contrato-delta", nome: "Contrato Delta" }
    ];
    const EXECUTIVE_PANEL = { id: "executivo-consolidado", nome: "Acompanhamento Gerencial" };
    const CEO_ACCOUNT = null;
    function projectById(id) { return PROJECTS.find(p => p.id === id) || PROJECTS[0]; }
    function projectConfig(project) {
      const p = project || projectById(currentProjectId);
      const cfg = normalizeConfigObject(clone(CONFIG_ORIGINAL));
      cfg.clienteContrato = p.nome;
      cfg.identificacaoContrato = p.nome;
      cfg.titulo = "PAINEL DE PRODUTIVIDADE - " + p.nome.toUpperCase();
      cfg.textoCardAcompanhamento = "Ficha de acompanhamento";
      cfg.textoCardOperacional = "Resumo para a equipe de campo";
      const bases = { "contrato-beta": "BASE SUL", "contrato-gama": "BASE OESTE", "contrato-delta": "BASE LESTE" };
      if (bases[p.id]) {
        cfg.basePadrao = bases[p.id];
        cfg.baseAlternativa = bases[p.id];
      }
      cfg.financeiroExecutivo = defaultFinanceForProject(p.id);
      return cfg;
    }
    function defaultProjectState(projectId = currentProjectId) {
      const p = projectById(projectId);
      return {
        config: projectConfig(p),
        equipes: [],
        historico: [],
        teamCards: {},
        teamCardTheme: clone(TEAM_CARD_THEME_ORIGINAL)
      };
    }
    function setState(state) {
      config = normalizeConfigObject(state.config || CONFIG_ORIGINAL);
      equipes = clone(Array.isArray(state.equipes) ? state.equipes : []);
      const refYear = String((state.config || {}).dataReferencia || "").match(/(\d{4})$/)?.[1] || String(new Date().getFullYear());
      historico = (Array.isArray(state.historico) ? state.historico : []).filter(h => h && String(h.data || "").trim()).map(h => ({ ...h, data: normalizeHistoricoDate(h.data, refYear) }));
      teamCards = clone(state.teamCards || {});
      teamCardTheme = normalizeTeamCardTheme(state.teamCardTheme || TEAM_CARD_THEME_ORIGINAL);
      selectedCardTeam = "";
    }
    function isExecutiveTarget(id) { return id === EXECUTIVE_PANEL.id; }
    function initLoginScreen() {
      const pill = document.getElementById("currentProjectPill");
      if (pill) pill.textContent = "Painel: aguardando login";
    }
    let ppStorageDebounceTimer = null;
    window.addEventListener("storage", (event) => {
      if (document.body.classList.contains("app-locked")) return;
      if (event.key === storageKey() || event.key === dailyBankKey()) {
        clearTimeout(ppStorageDebounceTimer);
        ppStorageDebounceTimer = setTimeout(() => {
          try {
            loadLocal();
            renderAll();
            if (document.getElementById("modalBg")?.classList.contains("open")) editorRows();
          } catch (e) { console.warn("Atualização local ignorada por falha de leitura.", e); }
        }, 120);
      }
    });

    function calcStatus(d) {
      const limiteAtencao = n(config.limiteAtencao ?? 0.5);
      const limiteExcelente = n(config.limiteExcelente ?? 1.0);
      if (d.produzidoAcumulado <= 0 || d.percentualAcumulado < limiteAtencao) return { text: "ALERTA", cls: "alr", color: "#D0402B" };
      if (d.percentualAcumulado >= limiteExcelente) return { text: "EXCELENTE", cls: "ok", color: "#1E8A4C" };
      return { text: "ATENÇÃO", cls: "att", color: "#E0A100" };
    }

    function ppMetaAcumCalculada(equipe) {
      try {
        if (typeof window.ppMetaAcumuladaDaEquipe === "function") {
          const v = window.ppMetaAcumuladaDaEquipe(equipe);
          if (v !== null && v !== undefined && isFinite(v)) return v;
        }
      } catch (e) { }
      return null;
    }

    function ppMetaAcumExibida(equipe) {
      const calculada = ppMetaAcumCalculada(equipe);
      return calculada === null ? n(equipe && equipe.metaAcumulada) : calculada;
    }

    function ppProdAcumSomada(equipe) {
      try {
        if (typeof window.ppProducaoAcumuladaDaEquipe === "function") {
          const v = window.ppProducaoAcumuladaDaEquipe(equipe);
          if (v !== null && v !== undefined && isFinite(v)) return v;
        }
      } catch (e) { }
      return null;
    }

    function ppProdAcumExibida(equipe) {
      const somada = ppProdAcumSomada(equipe);
      return somada === null ? n(equipe && equipe.produzidoAcumulado) : somada;
    }

    function data() {
      const list = equipes.map((d, i) => {
        let metaAcum = n(d.metaAcumulada);
        try {
          if (typeof window.ppMetaAcumuladaDaEquipe === "function") {
            const calculada = window.ppMetaAcumuladaDaEquipe(d);
            if (calculada !== null && calculada !== undefined && isFinite(calculada)) metaAcum = calculada;
          }
        } catch (e) { }

        let prodAcum = n(d.produzidoAcumulado);
        try {
          if (typeof window.ppProducaoAcumuladaDaEquipe === "function") {
            const somada = window.ppProducaoAcumuladaDaEquipe(d);
            if (somada !== null && somada !== undefined && isFinite(somada)) prodAcum = somada;
          }
        } catch (e) { }

        let metaDiaDoDia = n(d.metaDia);
        try {
          if (typeof window.ppMetaDiaDoDiaSelecionado === "function") {
            const md = window.ppMetaDiaDoDiaSelecionado(d);
            if (md !== null && md !== undefined && isFinite(md)) metaDiaDoDia = md;
          }
        } catch (e) { }

        const item = {
          equipe: String(d.equipe || ""),
          metaMes: n(d.metaMes),
          metaAcumulada: metaAcum,
          metaDia: metaDiaDoDia,
          produzidoDia: n(d.produzidoDia),
          produzidoAcumulado: prodAcum,
          idx: i
        };
        item.desvioDia = item.produzidoDia - item.metaDia;
        item.desvioAcumulado = item.produzidoAcumulado - item.metaAcumulada;
        item.percentualDia = item.metaDia > 0 ? item.produzidoDia / item.metaDia : 1;
        item.percentualAcumulado = item.metaAcumulada > 0 ? item.produzidoAcumulado / item.metaAcumulada : 0;
        item.percentualMetaMes = item.metaMes > 0 ? item.produzidoAcumulado / item.metaMes : 0;
        item.desvioDiaPct = item.percentualDia - 1;
        item.desvioAcumuladoPct = item.percentualAcumulado - 1;
        item.status = calcStatus(item);
        return item;
      });
      const total = list.reduce((a, d) => {
        a.metaMes += d.metaMes;
        a.metaAcumulada += d.metaAcumulada;
        a.metaDia += d.metaDia;
        a.produzidoDia += d.produzidoDia;
        a.produzidoAcumulado += d.produzidoAcumulado;
        a.desvioDia += d.desvioDia;
        a.desvioAcumulado += d.desvioAcumulado;
        a.status[d.status.text] = (a.status[d.status.text] || 0) + 1;
        return a;
      }, { metaMes: 0, metaAcumulada: 0, metaDia: 0, produzidoDia: 0, produzidoAcumulado: 0, desvioDia: 0, desvioAcumulado: 0, status: { "EXCELENTE": 0, "ATENÇÃO": 0, "ALERTA": 0 } });
      total.percentualMetaMes = total.metaMes ? total.produzidoAcumulado / total.metaMes : 0;
      total.percentualMetaAcumMes = total.metaMes ? total.metaAcumulada / total.metaMes : 0;
      total.percentualDia = total.metaDia ? total.produzidoDia / total.metaDia : 1;
      total.percentualAcumulado = total.metaAcumulada ? total.produzidoAcumulado / total.metaAcumulada : 0;
      total.desvioDiaPct = total.percentualDia - 1;
      total.desvioAcumuladoPct = total.percentualAcumulado - 1;
      total.produzidoBruto = total.produzidoAcumulado;
      total.produzidoLiquido = total.produzidoBruto * fatorLiquido();
      total.produzidoDiaLiquido = total.produzidoDia * fatorLiquido();
      total.projecaoBruta = (config.diasLancados > 0 && config.diasUteisMes > 0 ? (total.produzidoBruto / config.diasLancados) * config.diasUteisMes : 0);
      total.projecaoLiquida = total.projecaoBruta * fatorLiquido();
      total.percentualProjecaoMeta = total.metaMes ? total.projecaoBruta / total.metaMes : 0;
      const sorted = [...list].sort((a, b) => b.desvioAcumuladoPct - a.desvioAcumuladoPct);
      return { list, sorted, total };
    }

    function kpiHtml(label, value, subLeft, subRight, pctValue, color, icon, valueClass = "") {
      return `<article class="kpi" style="--accent:${color}">
    <div class="icon">${icon}</div>
    <div>
      <div class="label">${label}</div>
      <span class="value ${valueClass}">${value}</span>
      <div class="sub"><span>${subLeft}</span><b>${subRight}</b></div>
      <div class="progress"><span style="width:${clamp(pctValue)}%"></span></div>
    </div>
  </article>`;
    }

    function renderKpis(target, total) {
      target.innerHTML = [
        kpiHtml("Meta mês bruto", money(total.metaMes), percent(total.percentualMetaMes) + " realizado", percent(total.percentualMetaMes), total.percentualMetaMes * 100, "#3F4752", "◎"),
        kpiHtml("Meta acumulada bruto", money(total.metaAcumulada), (function () {
          try {
            if (typeof window.ppResumoDiasContados === "function") {
              const r = window.ppResumoDiasContados();
              if (r) return r;
            }
          } catch (e) { }
          return percent(total.percentualMetaAcumMes) + " da meta mês";
        })(), percent(total.percentualMetaAcumMes), total.percentualMetaAcumMes * 100, "#3F4752", "$"),
        kpiHtml("Produzido dia bruto", money(total.produzidoDia), percent(total.percentualDia) + " da meta dia", percent(total.percentualDia), total.percentualDia * 100, "#1F6FB2", "▥"),
        kpiHtml("Acumulado bruto", money(total.produzidoBruto), (function () {
          try {
            if (typeof window.ppResumoProducaoAcumulada === "function") {
              const r = window.ppResumoProducaoAcumulada();
              if (r) return r;
            }
          } catch (e) { }
          return percent(total.percentualAcumulado) + " da meta acum.";
        })(), "Bruto", total.percentualAcumulado * 100, "#1F6FB2", "A"),
        kpiHtml("Líquido", money(total.produzidoLiquido), "Valor líquido estimado", "NF", total.percentualAcumulado * 100, "#185A92", "L"),
        kpiHtml("Desvio acum.", money(total.desvioAcumulado), "Geral do projeto", percent(total.desvioAcumuladoPct), Math.abs(total.desvioAcumuladoPct) * 100, total.desvioAcumulado >= 0 ? "#1E8A4C" : "#D0402B", "◷", deltaClass(total.desvioAcumulado))
      ].join("");
    }

    function ppFiltroEquipeTexto() {
      try {
        var dono = window.ppFiltroEquipeProjeto;
        var atual = (typeof currentProjectId !== "undefined") ? currentProjectId : "";
        if (dono !== undefined && dono !== atual) {
          window.ppFiltroEquipe = "";
          window.ppFiltroEquipeProjeto = atual;
          var campo = document.getElementById("buscaEquipe");
          if (campo) campo.value = "";
        }
      } catch (e) { }
      return String(window.ppFiltroEquipe || "").trim().toLowerCase();
    }

    function ppEquipeCasaFiltro(nome) {
      const alvo = ppFiltroEquipeTexto();
      if (!alvo) return true;
      return String(nome || "").toLowerCase().indexOf(alvo) >= 0;
    }

    function tableHtml(rows, total) {
      if (ppFiltroEquipeTexto()) rows = rows.filter(d => ppEquipeCasaFiltro(d.equipe));
      return `<colgroup><col><col><col><col><col><col><col><col><col><col></colgroup>
    <thead><tr>
      <th>#</th><th>Equipe</th><th>Meta mês</th><th>Meta acum.</th><th>Meta dia</th><th>Prod. dia</th><th>Prod. acum.</th><th>Desv. dia</th><th>Desv. acum.</th><th>Status</th>
    </tr></thead>
    <tbody>${rows.map((d, i) => `<tr>
      <td><span class="idx">${i + 1}</span></td>
      <td title="${escapeAttr(d.equipe)}">${escapeHtml(d.equipe)}</td>
      <td>${money(d.metaMes)}</td>
      <td>${money(d.metaAcumulada)}</td>
      <td>${money(d.metaDia)}</td>
      <td>${money(d.produzidoDia)}</td>
      <td><b>${money(d.produzidoAcumulado)}</b></td>
      <td class="${deltaClass(d.desvioDia)}">${percent(d.desvioDiaPct)}</td>
      <td class="${deltaClass(d.desvioAcumulado)}">${percent(d.desvioAcumuladoPct)}</td>
      <td><span class="badge ${d.status.cls}">${d.status.text}</span></td>
    </tr>`).join("")}</tbody>
    <tfoot><tr>
      <td colspan="2">TOTAL GERAL</td>
      <td>${money(total.metaMes)}</td>
      <td>${money(total.metaAcumulada)}</td>
      <td>${money(total.metaDia)}</td>
      <td>${money(total.produzidoDia)}</td>
      <td>${money(total.produzidoAcumulado)}</td>
      <td class="${deltaClass(total.desvioDia)}">${percent(total.desvioDiaPct)}</td>
      <td class="${deltaClass(total.desvioAcumulado)}">${percent(total.desvioAcumuladoPct)}</td>
      <td></td>
    </tr></tfoot>`;
    }

    function destroyCharts(bucket) {
      Object.keys(bucket).forEach(k => { if (bucket[k]) { bucket[k].destroy(); bucket[k] = null; } });
    }

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false }, tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              if (typeof v !== "number") return ctx.parsed.x ?? ctx.parsed.y ?? v;
              if (ctx.dataset && ctx.dataset.valueFormat === "percent") return percentRaw(v);
              return money(v);
            }
          }
        }
      },
    };

    const barValuePlugin = {
      id: "barValuePlugin",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta || meta.hidden || !meta.data || meta.type !== "bar") return;
          meta.data.forEach((element, i) => {
            const raw = Number(dataset.data[i]);
            if (!Number.isFinite(raw)) return;
            const isHorizontal = chart.options.indexAxis === "y";
            const format = dataset.valueFormat || "currencyK";
            let label = "";
            if (format === "percent") label = percentRaw(raw);
            else label = NUM.format(raw / 1000).replace(",00", "");
            const fontSize = Number(dataset.valueFontSize || (isHorizontal ? 8.8 : 10.5));
            ctx.save();
            ctx.font = `900 ${fontSize}px Segoe UI`;
            ctx.textBaseline = "middle";
            if (isHorizontal) {
              const area = chart.chartArea || { left: 0, right: chart.width };
              const baseX = Number.isFinite(element.base) ? element.base : chart.scales.x.getPixelForValue(0);
              const barWidth = Math.abs(baseX - element.x);
              let x, align, fill;
              if (raw < 0) {
                if (barWidth >= 34) {
                  x = element.x + 6;
                  align = "left";
                  fill = "#FFFFFF";
                } else {
                  x = element.x - 6;
                  align = "right";
                  fill = "#3F4752";
                }
              } else {
                if (barWidth >= 42 && element.x > area.right - 48) {
                  x = element.x - 6;
                  align = "right";
                  fill = "#FFFFFF";
                } else {
                  x = element.x + 6;
                  align = "left";
                  fill = "#3F4752";
                }
              }
              if (x < area.left + 4) { x = area.left + 4; align = "left"; fill = raw < 0 ? "#FFFFFF" : "#3F4752"; }
              if (x > area.right - 4) { x = area.right - 4; align = "right"; }
              ctx.textAlign = align;
              ctx.fillStyle = fill;
              ctx.fillText(label, x, element.y);
            } else {
              const area = chart.chartArea || { top: 0, bottom: chart.height };
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.lineWidth = 3;
              ctx.strokeStyle = "rgba(255,255,255,.92)";
              ctx.fillStyle = "#243147";
              const y = Math.max(area.top + fontSize + 2, element.y - 7);
              ctx.strokeText(label, element.x, y);
              ctx.fillText(label, element.x, y);
            }
            ctx.restore();
          });
        });
      }
    };

    function upsertChart(bucket, key, canvas, config, dynamic) {
      if (!canvas) return null;
      let chart = bucket[key];
      if (!chart || chart.canvas !== canvas) {
        if (chart) { try { chart.destroy(); } catch (e) {} }
        chart = new Chart(canvas, config);
        chart.$dyn = dynamic || {};
        bucket[key] = chart;
        return chart;
      }
      chart.$dyn = dynamic || {};
      chart.data.labels = config.data.labels;
      config.data.datasets.forEach((ds, i) => {
        const cur = chart.data.datasets[i];
        if (!cur) { chart.data.datasets[i] = ds; return; }
        cur.data = ds.data;
        if ("backgroundColor" in ds) cur.backgroundColor = ds.backgroundColor;
      });
      chart.data.datasets.length = config.data.datasets.length;
      if (config.options && config.options.scales) {
        const os = config.options.scales, cs = chart.options.scales || {};
        ["x", "y"].forEach(ax => {
          if (os[ax] && cs[ax]) {
            if ("min" in os[ax]) cs[ax].min = os[ax].min;
            if ("max" in os[ax]) cs[ax].max = os[ax].max;
          }
        });
      }
      try {
        const cv = chart.canvas;
        if (cv && cv.clientWidth && cv.clientHeight) {
          const dpr = window.devicePixelRatio || 1;
          const expW = Math.round(cv.clientWidth * dpr);
          const expH = Math.round(cv.clientHeight * dpr);
          if (Math.abs(cv.width - expW) > 1 || Math.abs(cv.height - expH) > 1) {
            chart.resize();
          }
        }
      } catch (e) { }
      chart.update("none");
      return chart;
    }

    function mesDoHistoricoExibido() {
      let ref = "";
      try {
        ref = typeof window.dailyKey === "function" ? String(window.dailyKey() || "") : "";
      } catch (e) { }
      if (!ref) ref = String(config.dataReferencia || "").trim();
      const m = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      return m ? { mes: Number(m[2]), ano: Number(m[3]) } : null;
    }

    function historicoDoMesExibido() {
      const lista = Array.isArray(historico) ? historico : [];
      const alvo = mesDoHistoricoExibido();
      if (!alvo) return lista;
      const doMes = [];
      lista.forEach((h) => {
        const p = String((h && h.data) || "").trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (!p || Number(p[2]) !== alvo.mes) return;
        if (p[3]) {
          const ano = Number(p[3]) < 100 ? 2000 + Number(p[3]) : Number(p[3]);
          if (ano !== alvo.ano) return;
        }
        doMes.push({ item: h, dia: Number(p[1]) });
      });
      if (!doMes.length) return lista;
      doMes.sort((a, b) => a.dia - b.dia);
      return doMes.map((x) => x.item);
    }

    function renderCharts(prefix, list, sorted, total, bucket) {
      if (!window.Chart) return;
      const histSerie = historicoDoMesExibido();
      const id = (name) => document.getElementById(prefix + name);
      const topDia = [...list].filter(d => d.produzidoDia > 0).sort((a, b) => b.produzidoDia - a.produzidoDia).slice(0, 12);
      const ranking = [...list].sort((a, b) => a.desvioAcumuladoPct - b.desvioAcumuladoPct);
      const rankingValues = ranking.map(d => d.desvioAcumuladoPct * 100);
      const rankMin = Math.min(0, ...rankingValues);
      const rankMax = Math.max(0, ...rankingValues);
      const rankPassoBaixo = Math.ceil((Math.abs(rankMin) + 6) / 10) * 10;
      const rankPassoCima = Math.ceil((rankMax + 6) / 10) * 10;
      const rankingMin = rankMin < 0 ? -rankPassoBaixo : 0;
      const rankingMax = rankMax > 0 ? rankPassoCima : 0;
      const histMax = Math.max(0, ...histSerie.map(h => n(h.total)));
      const histYMax = Math.ceil((histMax * 1.18) / 10000) * 10000 || 10000;

      upsertChart(bucket, "ranking", id("Ranking"), {
        type: "bar",
        data: {
          labels: ranking.map(d => d.equipe),
          datasets: [{
            data: rankingValues,
            backgroundColor: ranking.map(d => d.desvioAcumuladoPct >= 0 ? "#1E8A4C" : "#D0402B"),
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 26,
            categoryPercentage: 0.94,
            barPercentage: 0.92,
            valueFormat: "percent",
            valueFontSize: 8.8
          }]
        },
        options: {
          ...baseOptions,
          indexAxis: "y",
          layout: { padding: { right: 46, left: 46, top: 4, bottom: 4 } },
          scales: {
            x: {
              min: rankingMin,
              max: rankingMax,
              grid: {
                color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? "#99A1AC" : "#E3E6EA"),
                lineWidth: (ctx) => (ctx.tick && ctx.tick.value === 0 ? 1.4 : 1)
              },
              ticks: {
                font: { size: 8.5 },
                callback: v => v + "%"
              }
            },
            y: {
              grid: { display: false },
              ticks: {
                autoSkip: false,
                font: { size: 8.2, weight: "700" }
              }
            }
          }
        },
        plugins: [barValuePlugin]
      });

      upsertChart(bucket, "status", id("Status"), {
        type: "doughnut",
        data: { labels: ["Excelente", "Atenção", "Alerta"], datasets: [{ data: [total.status["EXCELENTE"], total.status["ATENÇÃO"], total.status["ALERTA"]], backgroundColor: ["#1E8A4C", "#E0A100", "#D0402B"], borderWidth: 0 }] },
        options: {
          ...baseOptions,
          cutout: "62%",
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const q = Number(ctx.raw) || 0;
                  return ` ${ctx.label}: ${q} equipe${q === 1 ? "" : "s"}`;
                }
              }
            }
          }
        }
      });

      upsertChart(bucket, "historico", id("Historico"), {
        type: "bar",
        data: {
          labels: histSerie.map(h => histLabel(h.data)),
          datasets: [
            {
              label: "Produção do dia",
              data: histSerie.map(h => n(h.total)),
              backgroundColor: "#1F6FB2",
              borderRadius: 6,
              maxBarThickness: 42,
              valueFormat: "currencyK",
              valueFontSize: 10.8,
              order: 1
            }
          ]
        },
        options: {
          ...baseOptions,
          layout: { padding: { top: 24, right: 6 } },
          plugins: {
            ...baseOptions.plugins,
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, weight: "700" } }
            },
            y: {
              beginAtZero: true,
              min: 0,
              max: histYMax,
              grid: { color: "#EDEFF2" },
              ticks: { font: { size: 8.5 }, callback: v => "R$ " + Math.round(v / 1000) + " mil" }
            }
          }
        },
        plugins: [barValuePlugin]
      });

      upsertChart(bucket, "equipeDia", id("EquipeDia"), {
        type: "bar",
        data: { labels: topDia.map(d => d.equipe), datasets: [{ data: topDia.map(d => d.produzidoDia), backgroundColor: "#1F6FB2", borderRadius: 5, maxBarThickness: 34, valueFormat: "currencyK", valueFontSize: 10.8 }] },
        options: { ...baseOptions, layout: { padding: { top: 26, right: 4 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 8.7, weight: "800" }, maxRotation: 45, minRotation: 45 } }, y: { grid: { color: "#EDEFF2" }, ticks: { font: { size: 8.5 }, callback: v => "R$ " + Math.round(v / 1000) + " mil" } } } },
        plugins: [barValuePlugin]
      });

      const gaugeValue = clamp(total.percentualMetaMes * 100, 0, 100);
      upsertChart(bucket, "gauge", id("Gauge"), {
        type: "doughnut",
        data: { labels: ["Realizado", "Falta"], datasets: [{ data: [gaugeValue, 100 - gaugeValue], backgroundColor: ["#1F6FB2", "#E3E6EA"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, rotation: -90, circumference: 180, cutout: "70%", plugins: { legend: { display: false }, tooltip: { enabled: false } } },
        plugins: [{
          id: "centerGaugeText", afterDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const pct = (chart.$dyn && typeof chart.$dyn.pct === "number") ? chart.$dyn.pct : total.percentualMetaMes;
            ctx.save();
            ctx.textAlign = "center";
            ctx.fillStyle = "#1F6FB2";
            ctx.font = "900 20px Segoe UI";
            ctx.fillText(percent(pct), (chartArea.left + chartArea.right) / 2, chartArea.top + chartArea.height * 0.70);
            ctx.fillStyle = "#6B7280";
            ctx.font = "800 9px Segoe UI";
            ctx.fillText("da meta mensal", (chartArea.left + chartArea.right) / 2, chartArea.top + chartArea.height * 0.82);
            ctx.restore();
          }
        }]
      }, { pct: total.percentualMetaMes });
    }

    function renderAll() {
      config = normalizeConfigObject(config);
      const { list, sorted, total } = data();
      updateDocumentTitle();
      document.getElementById("mainTitle").textContent = dashboardTitle();
      document.getElementById("mainDate").textContent = reportLabel() + " • " + (config.dataReferencia || "");
      renderKpis(document.getElementById("kpiGrid"), total);
      document.getElementById("mainTable").innerHTML = tableHtml(sorted, total);
      (function () {
        const alvo = ppFiltroEquipeTexto();
        const achadas = alvo ? list.filter(d => ppEquipeCasaFiltro(d.equipe)).length : list.length;
        document.getElementById("countMain").textContent = alvo
          ? achadas + " de " + list.length + " equipes"
          : list.length + " equipes";
      })();
      document.getElementById("statusTotal").textContent = list.length + " equipes";
      document.getElementById("statusOk").textContent = `${total.status["EXCELENTE"]} equipe(s)`;
      document.getElementById("statusAtt").textContent = `${total.status["ATENÇÃO"]} equipe(s)`;
      document.getElementById("statusAlr").textContent = `${total.status["ALERTA"]} equipe(s)`;
      document.getElementById("dataEquipe").textContent = config.dataReferencia;
      renderCharts("chart", list, sorted, total, charts);

      if (document.getElementById("teamCardPage")?.classList.contains("open")) renderTeamCard();
      if (document.getElementById("captureBg").classList.contains("open")) renderCapture(false);
    }

    function financeCfg() {
      config = normalizeConfigObject(config);
      mergeProjectFinanceDefaults(currentProjectId);
      return config.financeiroExecutivo;
    }
    function formatDateTimeBR(value) {
      if (!value) return "";
      try {
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      } catch (e) { return String(value); }
    }
    function setFinanceEditorFields() {
      const f = financeCfg();
      const pairs = [
        ["edFinBudget", f.budgetAno], ["edFinForecast", f.forecastAtual], ["edFinProjecao", f.projecaoProducao],
        ["edFinYtd", f.ytd], ["edFinYtg", f.ytg], ["edFinBacklog", f.backlog],
        ["edFinCustos", f.custosAtuais], ["edFinCustosFech", f.custosFechamento],
        ["edFinAvancoPlan", f.avancoFisicoPlanejado], ["edFinAvancoReal", f.avancoFisicoReal],
        ["edFinReceitaLiq", f.receitaLiquidaProjetada], ["edFinCustosProj", f.custosProjetados], ["edFinEbitdaFC", f.ebitdaForecastMeta]
      ];
      pairs.forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = inputValue(val); });
      const obs = document.getElementById("edFinObs"); if (obs) obs.value = f.observacaoExecutiva || "";
      const chk = document.getElementById("edFinCheck"); if (chk) chk.checked = !!f.checkAtualizado;
      const upd = document.getElementById("edFinUpdatedAt"); if (upd) upd.value = f.dataHoraAtualizacao ? formatDateTimeBR(f.dataHoraAtualizacao) : "Ainda não marcado";
    }
    function collectFinanceEditor() {
      config = normalizeConfigObject(config);
      const f = { ...(config.financeiroExecutivo || {}) };
      f._init = true;
      f.budgetAno = parseMoneyInput(document.getElementById("edFinBudget")?.value);
      f.forecastAtual = parseMoneyInput(document.getElementById("edFinForecast")?.value);
      f.projecaoProducao = parseMoneyInput(document.getElementById("edFinProjecao")?.value);
      f.ytd = parseMoneyInput(document.getElementById("edFinYtd")?.value);
      f.ytg = parseMoneyInput(document.getElementById("edFinYtg")?.value);
      f.backlog = parseMoneyInput(document.getElementById("edFinBacklog")?.value);
      f.custosAtuais = parseMoneyInput(document.getElementById("edFinCustos")?.value);
      f.custosFechamento = parseMoneyInput(document.getElementById("edFinCustosFech")?.value);
      f.avancoFisicoPlanejado = parseMoneyInput(document.getElementById("edFinAvancoPlan")?.value);
      f.avancoFisicoReal = parseMoneyInput(document.getElementById("edFinAvancoReal")?.value);
      f.receitaLiquidaProjetada = parseMoneyInput(document.getElementById("edFinReceitaLiq")?.value);
      f.custosProjetados = parseMoneyInput(document.getElementById("edFinCustosProj")?.value);
      f.ebitdaForecastMeta = parseMoneyInput(document.getElementById("edFinEbitdaFC")?.value);
      f.observacaoExecutiva = document.getElementById("edFinObs")?.value.trim() || "";
      f.checkAtualizado = !!document.getElementById("edFinCheck")?.checked;
      config.financeiroExecutivo = f;
    }

    function editorRows() {
      config = normalizeConfigObject(config);
      (document.getElementById("edTitulo") || {}).value = config.titulo || defaultDashboardTitle();
      (document.getElementById("edClienteContrato") || {}).value = config.clienteContrato || "";
      (document.getElementById("edIdentificacaoContrato") || {}).value = config.identificacaoContrato || "";
      (document.getElementById("edBasePadrao") || {}).value = config.basePadrao || "";
      (document.getElementById("edBaseAlternativa") || {}).value = config.baseAlternativa || "";
      (document.getElementById("edMarcadorBase") || {}).value = config.marcadorBaseAlternativa || "";
      (document.getElementById("edRotuloRelatorio") || {}).value = config.rotuloRelatorio || "";
      (document.getElementById("edTextoCardAcompanhamento") || {}).value = config.textoCardAcompanhamento || "";
      (document.getElementById("edTextoCardOperacional") || {}).value = config.textoCardOperacional || "";
      (document.getElementById("edData") || {}).value = config.dataReferencia;
      const _edMesAno = document.getElementById("edMesAno");
      if (_edMesAno) _edMesAno.value = config.mesAno || parsePeriodo(config.dataReferencia || "") || "";
      (document.getElementById("edDiasMes") || {}).value = config.diasUteisMes;
      (document.getElementById("edDiasLancados") || {}).value = config.diasLancados;
      setFinanceEditorFields();
      document.getElementById("historyEditor").innerHTML = historico.map((h, i) => `<span><input id="histData${i}" value="${escapeAttr(h.data)}"><input type="number" step="0.01" id="histTotal${i}" value="${inputValue(h.total)}"><button class="btn btn-red" style="padding:4px 6px;font-size:9px;box-shadow:none" onclick="removeHistory(${i})">×</button></span>`).join("");
      document.getElementById("editRows").innerHTML = equipes.map((d, i) => `<tr>
    <td>${i + 1}</td>
    <td><input id="eqNome${i}" value="${escapeAttr(d.equipe)}"></td>
    <td><input type="number" step="0.01" id="eqMetaMes${i}" value="${inputValue(d.metaMes)}"></td>
    <td><input type="number" step="0.01" id="eqMetaAcum${i}" value="${inputValue(ppMetaAcumExibida(d))}"${ppMetaAcumCalculada(d) === null ? ` title="Valor que veio do CSV. Este contrato não tem meta de sábado/domingo marcada, então o painel não recalcula nada aqui."` : ` readonly title="Calculado automaticamente: dias úteis × meta dia + sábados/domingos × a cota marcada em 'Como este contrato conta a meta'. Para mudar, ajuste a meta dia (vem do CSV) ou os dias no calendário." style="background:#F2F3F5;color:#67707C;cursor:not-allowed"`}></td>
    <td><input type="number" step="0.01" id="eqMetaDia${i}" value="${inputValue(d.metaDia)}"></td>
    <td><input type="number" step="0.01" id="eqProdDia${i}" value="${inputValue(d.produzidoDia)}"></td>
    <td><input type="number" step="0.01" id="eqProdAcum${i}" value="${inputValue(ppProdAcumExibida(d))}"${ppProdAcumSomada(d) === null ? "" : ` readonly title="Somado automaticamente dos dias lançados no banco diário deste mês. Para mudar, corrija o produzido do dia em PRODUÇÃO POR MÊS E DIA." style="background:#F2F3F5;color:#67707C;cursor:not-allowed"`}></td>
    <td><button class="btn btn-red" style="padding:5px 7px;font-size:9px;box-shadow:none" onclick="removeTeam(${i})">Remover</button></td>
  </tr>`).join("");
      updateDailyBankSelect();
    }

    function collectEditor() {
      config = normalizeConfigObject(config);
      config.titulo = (document.getElementById("edTitulo")?.value || "").trim() || config.titulo || defaultDashboardTitle();
      config.clienteContrato = (document.getElementById("edClienteContrato")?.value || "").trim() || config.clienteContrato;
      config.identificacaoContrato = (document.getElementById("edIdentificacaoContrato")?.value || "").trim() || config.identificacaoContrato;
      config.basePadrao = (document.getElementById("edBasePadrao")?.value || "").trim() || config.basePadrao;
      config.baseAlternativa = (document.getElementById("edBaseAlternativa")?.value || "").trim() || config.baseAlternativa;
      config.marcadorBaseAlternativa = (document.getElementById("edMarcadorBase")?.value || "").trim() || config.marcadorBaseAlternativa;
      config.rotuloRelatorio = (document.getElementById("edRotuloRelatorio")?.value || "").trim() || config.rotuloRelatorio;
      config.textoCardAcompanhamento = (document.getElementById("edTextoCardAcompanhamento")?.value || "").trim() || config.textoCardAcompanhamento;
      config.textoCardOperacional = (document.getElementById("edTextoCardOperacional")?.value || "").trim() || config.textoCardOperacional;
      config.dataReferencia = (document.getElementById("edData")?.value || "").trim() || config.dataReferencia;
      config.diasUteisMes = n(document.getElementById("edDiasMes")?.value) || config.diasUteisMes || 21;
      config.diasLancados = n(document.getElementById("edDiasLancados")?.value) || config.diasLancados || 1;
      historico = historico.map((h, i) => ({ data: document.getElementById("histData" + i)?.value.trim() || h.data, total: parseMoneyInput(document.getElementById("histTotal" + i)?.value) }));
      equipes = equipes.map((d, i) => {
        const metaCalculada = (typeof ppMetaAcumCalculada === "function")
          ? ppMetaAcumCalculada(d) : null;
        const prodCalculada = (typeof ppProdAcumSomada === "function")
          ? ppProdAcumSomada(d) : null;
        return {
          equipe: document.getElementById("eqNome" + i)?.value.trim() || d.equipe,
          metaMes: parseMoneyInput(document.getElementById("eqMetaMes" + i)?.value),
          metaAcumulada: metaCalculada === null
            ? parseMoneyInput(document.getElementById("eqMetaAcum" + i)?.value)
            : n(d.metaAcumulada),
          metaDia: parseMoneyInput(document.getElementById("eqMetaDia" + i)?.value),
          produzidoDia: parseMoneyInput(document.getElementById("eqProdDia" + i)?.value),
          produzidoAcumulado: prodCalculada === null
            ? parseMoneyInput(document.getElementById("eqProdAcum" + i)?.value)
            : n(d.produzidoAcumulado)
        };
      });
    }

    let livePreviewTimer = null;

    let editorAutoSaveTimer = null;

    function bindEditorRealtime() {
      const modal = document.getElementById("modalBg");
      if (!modal || modal.dataset.liveBound === "1") return;
      const handler = (event) => {
        const target = event.target;
        if (!target) return;
        if (target.id === "jsonBox" || target.id === "csvFile") return;
        if (target.closest(".modal-body")) { scheduleEditorPreview(); scheduleEditorAutoSave(); }
      };
      modal.addEventListener("input", handler);
      modal.addEventListener("change", handler);
      modal.dataset.liveBound = "1";
    }

    function openEditor() { editorRows(); document.getElementById("modalBg").classList.add("open"); bindEditorRealtime(); }

    function togglePpMenu(evt) {
      if (evt) evt.stopPropagation();
      var panel = document.getElementById('ppMenuPanel');
      if (!panel) return;
      if (panel.style.display !== 'none' && panel.style.display !== '') {
        panel.style.display = 'none';
        return;
      }
      var btn = (evt && evt.target && evt.target.closest('.pp-menu-btn')) || document.getElementById('ppMenuBtn');
      if (btn) {
        var r = btn.getBoundingClientRect();
        panel.style.top = (r.bottom + 6) + 'px';
        panel.style.left = r.left + 'px';
      }
      panel.style.display = 'block';
    }
    function closePpMenu() {
      var panel = document.getElementById('ppMenuPanel');
      if (panel) panel.style.display = 'none';
    }
    (function () {
      function hideActionsDiv() {
        var a = document.querySelector('.actions');
        if (a) { a.style.setProperty('display', 'none', 'important'); }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideActionsDiv);
      } else {
        hideActionsDiv();
      }
      setTimeout(hideActionsDiv, 800);
    })();

    document.addEventListener('click', function (e) {
      ['ppMenuPanel', 'execMenuPanel'].forEach(function (panelId) {
        var panel = document.getElementById(panelId);
        if (panel && panel.style.display !== 'none' && !panel.contains(e.target)) {
          var btns = document.querySelectorAll('.pp-menu-btn');
          var onBtn = false;
          btns.forEach(function (b) { if (b.contains(e.target)) onBtn = true; });
          if (!onBtn) panel.style.display = 'none';
        }
      });
    });

    (function () {
      function fecharMenusAoRolar() {
        ['ppMenuPanel', 'execMenuPanel'].forEach(function (id) {
          var p = document.getElementById(id);
          if (p && p.style.display !== 'none' && p.style.display !== '') p.style.display = 'none';
        });
      }
      window.addEventListener('scroll', fecharMenusAoRolar, { capture: true, passive: true });
      window.addEventListener('resize', fecharMenusAoRolar, { passive: true });

      window.ppLigarRolagemDoQuadro = function () {
        try {
          var quadro = document.getElementById('executiveFrame');
          var janelaDeDentro = quadro && quadro.contentWindow;
          if (!janelaDeDentro || janelaDeDentro.__ppRolagemLigada) return;
          janelaDeDentro.addEventListener('scroll', fecharMenusAoRolar, { capture: true, passive: true });
          janelaDeDentro.addEventListener('click', fecharMenusAoRolar, { capture: true, passive: true });
          janelaDeDentro.__ppRolagemLigada = true;
        } catch (e) { }
      };

      var quadroInicial = document.getElementById('executiveFrame');
      if (quadroInicial) quadroInicial.addEventListener('load', window.ppLigarRolagemDoQuadro);
      window.ppLigarRolagemDoQuadro();
    })();

    function toggleExecMenu(evt) {
      if (evt) evt.stopPropagation();
      var panel = document.getElementById('execMenuPanel');
      if (!panel) return;
      if (panel.style.display !== 'none' && panel.style.display !== '') {
        panel.style.display = 'none';
        return;
      }
      if (typeof window.ppLigarRolagemDoQuadro === 'function') window.ppLigarRolagemDoQuadro();
      var btn = (evt && evt.target && evt.target.closest('.pp-menu-btn')) || null;
      if (btn) {
        var r = btn.getBoundingClientRect();
        panel.style.top = (r.bottom + 6) + 'px';
        panel.style.left = r.left + 'px';
      }
      panel.style.display = 'block';
    }
    function closeExecMenu() {
      var panel = document.getElementById('execMenuPanel');
      if (panel) panel.style.display = 'none';
    }
    function execOpenFinanceEditor() {
      try {
        var frame = document.getElementById('executiveFrame');
        if (frame && frame.contentWindow && typeof frame.contentWindow.openExecutiveFinanceEditor === 'function') {
          frame.contentWindow.openExecutiveFinanceEditor();
        }
      } catch (e) { console.error('execOpenFinanceEditor:', e); }
    }
    var PP_MOV_CAMPOS = ['budgetAno', 'forecastAtual', 'projecaoProducao', 'receitaLiquidaAtual', 'custosAtuais', 'custosFechamento', 'receitaBrutaForecast', 'taxaImposto', 'avancoFisicoPlanejado', 'avancoFisicoReal', 'receitaLiquidaProjetada', 'custosProjetados', 'custosProjetadosEstim', 'ebitdaForecastMeta', 'receitaLiquidaEbitdaFC', 'projRecLiqEstimativa', 'diasProjecaoFechamento', 'diasProjecaoUsarCalc', 'diasProjecaoMediaDias', 'projCalMetaSabado', 'projCalMetaDomingo', 'wipArranque', 'custosDiferimentos', 'faturamentoProjetado', 'valorFatBi', 'diaLimiteFaturamento', 'wipMensalDesconto', 'wipDescontoAtivo', 'comentarioProjRecLiq', 'comentarioCustosProj', 'diasUteisForecast', 'statusLimiteVerde', 'statusLimiteAmarelo', 'accumForecastNetManual', 'accumForecastNetManualAtivo', 'observacaoExecutiva', 'checkAtualizado', 'dataHoraAtualizacao'];
    var PP_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    window.PP_MOV_CAMPOS = PP_MOV_CAMPOS;
    function financeMovLabel(mov) { return (PP_MESES[(Number(mov.mes) || 1) - 1] || mov.mes) + ' / ' + mov.ano; }
    function financeMovRank(mov) { return (Number(mov.ano) || 0) * 12 + (Number(mov.mes) || 0); }
    function financeMovimentos() {
      var f = (typeof financeCfg === 'function' ? financeCfg() : (config && config.financeiroExecutivo)) || {};
      if (!Array.isArray(f.movimentos)) f.movimentos = [];
      return f.movimentos;
    }
    function financeMostRecenteMovimento(f) {
      var movs = (f && Array.isArray(f.movimentos)) ? f.movimentos : [];
      if (!movs.length) return null;
      return movs.slice().sort(function (a, b) { return financeMovRank(b) - financeMovRank(a); })[0];
    }
    function financeMirrorRootFromMovimento(f, mov) {
      if (!f || !mov) return;
      PP_MOV_CAMPOS.forEach(function (k) { f[k] = mov[k]; });
    }
    function financePersistFinance() {
      window.__ppSaveExplicito = true;
      if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true);
      else if (typeof saveLocalSilent === 'function') saveLocalSilent();
      if (typeof renderAll === 'function') renderAll();
    }

    function openFinanceEditor() {
      var bg = document.getElementById('projectFinanceBg'); if (!bg) return;
      var nameEl = document.getElementById('pfinProjectName');
      if (nameEl) { var p = (typeof projectById === 'function' && currentProjectId) ? projectById(currentProjectId) : null; nameEl.textContent = p ? p.nome : (currentProjectId || ''); }
      if (typeof normalizeConfigObject === 'function') config = normalizeConfigObject(config);
      financeEditorRenderList();
      bg.style.display = 'flex';
      bindFinanceEditorAutoSave();
    }
    function financeEditorRenderList() {
      var form = document.getElementById('pfin-form');
      var listWrap = document.getElementById('pfin-list-wrap');
      var foot = document.getElementById('pfin-foot');
      if (form) form.style.display = 'none';
      if (listWrap) listWrap.style.display = 'block';
      if (foot) foot.style.display = 'none';
      var movs = financeMovimentos().slice().sort(function (a, b) { return financeMovRank(b) - financeMovRank(a); });
      var listEl = document.getElementById('pfin-list');
      if (!listEl) return;
      if (!movs.length) {
        listEl.innerHTML = '<div style="padding:14px;color:#99A1AC;font-weight:700;font-size:12px;">Nenhum movimento cadastrado. Clique em Adicionar Movimento.</div>';
        return;
      }
      listEl.innerHTML = movs.map(function (m) {
        var val = (typeof money === 'function') ? money(m.forecastAtual) : m.forecastAtual;
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #E3E6EA;border-radius:10px;margin-bottom:8px;">'
          + '<div><b style="font-size:13px;color:#1B2433;">' + financeMovLabel(m) + '</b>'
          + '<small style="display:block;font-size:10px;color:#67707C;font-weight:700;">Forecast ' + val + '</small></div>'
          + '<div style="display:flex;gap:6px;">'
          + '<button class="btn btn-white" onclick="financeEditorEditMovimento(' + Number(m.ano) + ',' + Number(m.mes) + ')">Editar</button>'
          + '<button class="btn btn-red" onclick="financeEditorDeleteMovimento(' + Number(m.ano) + ',' + Number(m.mes) + ')">Excluir</button>'
          + '</div></div>';
      }).join('');
    }
    function financeEditorShowForm() {
      var form = document.getElementById('pfin-form');
      var listWrap = document.getElementById('pfin-list-wrap');
      var foot = document.getElementById('pfin-foot');
      if (listWrap) listWrap.style.display = 'none';
      if (form) form.style.display = 'block';
      if (foot) foot.style.display = 'flex';
      try {
        if (typeof aplReinitSelects === 'function') aplReinitSelects();
        if (typeof aplSyncSelectEl === 'function') {
          aplSyncSelectEl(document.getElementById('pfin-ano'));
          aplSyncSelectEl(document.getElementById('pfin-mes'));
        }
      } catch (e) { }
    }
    function financeEditorBackToList() { financeEditorRenderList(); }
    function financePopulateYearSelect(selectedYear) {
      var sel = document.getElementById('pfin-ano'); if (!sel) return;
      var cur = new Date().getFullYear();
      var years = {};
      for (var y = cur - 2; y <= cur + 1; y++) years[y] = true;
      financeMovimentos().forEach(function (m) { if (m.ano) years[m.ano] = true; });
      if (selectedYear) years[selectedYear] = true;
      var list = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
      sel.innerHTML = list.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      sel.value = String(selectedYear || cur);
    }
    function financeEditorFillForm(mov) {
      var f = mov || {};
      var numVal = function (v) { return (v != null && v !== 0) ? v : ''; };
      var fields = {
        'pfin-budget': f.budgetAno, 'pfin-forecast': f.forecastAtual, 'pfin-projecao': f.projecaoProducao,
        'pfin-receitaAtual': f.receitaLiquidaAtual, 'pfin-custos': f.custosAtuais, 'pfin-custosFech': f.custosFechamento,
        'pfin-receitaBrutaFC': f.receitaBrutaForecast, 'pfin-taxaImposto': f.taxaImposto,
        'pfin-avancoPlan': f.avancoFisicoPlanejado, 'pfin-avancoReal': f.avancoFisicoReal,
        'pfin-receitaLiq': f.receitaLiquidaProjetada, 'pfin-custosProj': f.custosProjetados, 'pfin-ebitdaFC': f.ebitdaForecastMeta,
        'pfin-receitaLiqEbitdaFC': f.receitaLiquidaEbitdaFC,
        'pfin-projRecLiqEstimativa': f.projRecLiqEstimativa,
        'pfin-custosProjEstim': f.custosProjetadosEstim,
        'pfin-wipArranque': f.wipArranque, 'pfin-custosDiferimentos': f.custosDiferimentos,
        'pfin-faturamentoProjetado': f.faturamentoProjetado, 'pfin-valorFatBi': f.valorFatBi,
        'pfin-diaLimiteFaturamento': f.diaLimiteFaturamento,
        'pfin-wipMensalDesconto': f.wipMensalDesconto,
        'pfin-diasUteisForecast': (n(config && config.diasUteisMes) > 0 ? n(config.diasUteisMes) : f.diasUteisForecast),
        'pfin-statusLimiteVerde': f.statusLimiteVerde, 'pfin-statusLimiteAmarelo': f.statusLimiteAmarelo,
        'pfin-accumForecastNetManual': f.accumForecastNetManual
      };
      Object.keys(fields).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = numVal(fields[id]); });
      var accumManualChk = document.getElementById('pfin-accumManualAtivo');
      if (accumManualChk) accumManualChk.checked = !!f.accumForecastNetManualAtivo;
      var obs = document.getElementById('pfin-obs'); if (obs) obs.value = f.observacaoExecutiva || '';
      var chk = document.getElementById('pfin-check'); if (chk) chk.checked = !!f.checkAtualizado;
      var wipChk = document.getElementById('pfin-wipDescontoAtivo'); if (wipChk) wipChk.checked = (f.wipDescontoAtivo !== false);
      var cRL = document.getElementById('pfin-comentarioProjRecLiq'); if (cRL) cRL.value = f.comentarioProjRecLiq || '';
      var cCP = document.getElementById('pfin-comentarioCustosProj'); if (cCP) cCP.value = f.comentarioCustosProj || '';
      var upd = document.getElementById('pfin-updatedAt');
      if (upd) upd.textContent = f.dataHoraAtualizacao ? 'Última atualização: ' + (typeof formatDateTimeBR === 'function' ? formatDateTimeBR(f.dataHoraAtualizacao) : f.dataHoraAtualizacao) : 'Movimento novo.';
      try { ppProjCalLoad(mov); } catch (e) { }
    }
    function financeEditorAddMovimento() {
      financePopulateYearSelect(new Date().getFullYear());
      var mSel = document.getElementById('pfin-mes'); if (mSel) mSel.value = String(new Date().getMonth() + 1);
      financeEditorFillForm(null);
      financeEditorShowForm();
    }
    function financeEditorEditMovimento(ano, mes) {
      var mov = financeMovimentos().filter(function (m) { return Number(m.ano) === Number(ano) && Number(m.mes) === Number(mes); })[0];
      financePopulateYearSelect(ano);
      var mSel = document.getElementById('pfin-mes'); if (mSel) mSel.value = String(mes);
      financeEditorFillForm(mov);
      financeEditorShowForm();
    }
    function financeEditorDeleteMovimento(ano, mes) {
      if (!confirm('Excluir o movimento de ' + (PP_MESES[Number(mes) - 1] || mes) + ' / ' + ano + '?')) return;
      window.__ppExclusaoMovimento = { ano: Number(ano), mes: Number(mes) };
      var f = (typeof financeCfg === 'function') ? financeCfg() : config.financeiroExecutivo;
      f.movimentos = financeMovimentos().filter(function (m) { return !(Number(m.ano) === Number(ano) && Number(m.mes) === Number(mes)); });
      var recente = financeMostRecenteMovimento(f);
      if (recente) financeMirrorRootFromMovimento(f, recente);
      else {
        PP_MOV_CAMPOS.forEach(function (campo) {
          if (campo === 'observacaoExecutiva' || campo === 'dataHoraAtualizacao') f[campo] = '';
          else if (campo === 'checkAtualizado') f[campo] = false;
          else f[campo] = 0;
        });
      }
      f._init = true;
      config.financeiroExecutivo = f;
      financePersistFinance();
      setTimeout(function () { try { window.__ppExclusaoMovimento = null; } catch (e) { } }, 0);
      financeEditorRenderList();
    }
    function closeFinanceEditor() {
      var bg = document.getElementById('projectFinanceBg'); if (bg) bg.style.display = 'none';
    }
    function collectAndPersistFinanceEditor() {
      var anoSel = document.getElementById('pfin-ano');
      var mesSel = document.getElementById('pfin-mes');
      var ano = anoSel ? Number(anoSel.value) : 0;
      var mes = mesSel ? Number(mesSel.value) : 0;
      if (!ano || !mes) return false;
      if (typeof normalizeConfigObject === 'function') config = normalizeConfigObject(config);
      var f = (typeof financeCfg === 'function') ? financeCfg() : (config.financeiroExecutivo = config.financeiroExecutivo || {});
      if (!Array.isArray(f.movimentos)) f.movimentos = [];
      var mov0 = f.movimentos.filter(function (m) { return Number(m.ano) === ano && Number(m.mes) === mes; })[0] || null;
      var getMoney = function (id, atual) {
        var el = document.getElementById(id);
        if (!el) return (atual === undefined || atual === null) ? 0 : Number(atual) || 0;
        return (typeof parseMoneyInput === 'function') ? parseMoneyInput(el.value) : Number(el.value || 0);
      };
      var receitaAtualEl = document.getElementById('pfin-receitaAtual');
      var projRecLiqEstimativaEl = document.getElementById('pfin-projRecLiqEstimativa');
      var wipMensalDescontoEl = document.getElementById('pfin-wipMensalDesconto');
      var diasUteisForecastEl = document.getElementById('pfin-diasUteisForecast');
      var statusLimiteVerdeEl = document.getElementById('pfin-statusLimiteVerde');
      var statusLimiteAmareloEl = document.getElementById('pfin-statusLimiteAmarelo');
      var obsEl = document.getElementById('pfin-obs');
      var chkEl = document.getElementById('pfin-check');
      var mov = {
        ano: ano, mes: mes,
        projectId: (typeof currentProjectId !== 'undefined' ? currentProjectId : ''),
        budgetAno: getMoney('pfin-budget', f.budgetAno),
        forecastAtual: getMoney('pfin-forecast', f.forecastAtual),
        projecaoProducao: getMoney('pfin-projecao', f.projecaoProducao),
        receitaLiquidaAtual: (receitaAtualEl && receitaAtualEl.value.trim() !== '') ? getMoney('pfin-receitaAtual') : null,
        custosAtuais: getMoney('pfin-custos'),
        custosFechamento: getMoney('pfin-custosFech'),
        receitaBrutaForecast: getMoney('pfin-receitaBrutaFC'),
        taxaImposto: getMoney('pfin-taxaImposto'),
        avancoFisicoPlanejado: getMoney('pfin-avancoPlan'),
        avancoFisicoReal: getMoney('pfin-avancoReal'),
        receitaLiquidaProjetada: getMoney('pfin-receitaLiq'),
        custosProjetados: getMoney('pfin-custosProj'),
        custosProjetadosEstim: (function () { var e = document.getElementById('pfin-custosProjEstim'); return (e && e.value.trim() !== '') ? getMoney('pfin-custosProjEstim') : null; })(),
        ebitdaForecastMeta: getMoney('pfin-ebitdaFC'),
        receitaLiquidaEbitdaFC: getMoney('pfin-receitaLiqEbitdaFC'),
        projRecLiqEstimativa: (projRecLiqEstimativaEl && projRecLiqEstimativaEl.value.trim() !== '') ? getMoney('pfin-projRecLiqEstimativa') : null,
        diasProjecaoFechamento: (function () {
          try {
            if (Number(PP_PROJCAL.ano) !== ano || Number(PP_PROJCAL.mes) !== mes) return (mov0 && mov0.diasProjecaoFechamento) || null;
            var m = PP_PROJCAL.marks || {};
            var keys = Object.keys(m);
            if (!keys.length) return null;
            var o = {}; keys.forEach(function (k) { o[k] = Number(m[k]); });
            return o;
          } catch (e) { return null; }
        })(),
        diasProjecaoUsarCalc: !!(document.getElementById('pfin-projcal-usar') && document.getElementById('pfin-projcal-usar').checked),
        diasProjecaoMediaDias: (function () {
          try {
            if (Number(PP_PROJCAL.ano) !== ano || Number(PP_PROJCAL.mes) !== mes) return (mov0 && mov0.diasProjecaoMediaDias != null) ? mov0.diasProjecaoMediaDias : null;
            return (PP_PROJCAL.mediaDiasManual != null && Number(PP_PROJCAL.mediaDiasManual) > 0) ? Number(PP_PROJCAL.mediaDiasManual) : null;
          } catch (e) { return null; }
        })(),
        projCalMetaSabado: (function () {
          try {
            if (Number(PP_PROJCAL.ano) !== ano || Number(PP_PROJCAL.mes) !== mes) return (mov0 && mov0.projCalMetaSabado != null) ? mov0.projCalMetaSabado : null;
            var el = document.getElementById('pfin-projcal-meta-sab');
            return (el && el.value.trim() !== '') ? (Math.round((parseFloat(el.value) || 0) * 100) / 100) : null;
          } catch (e) { return null; }
        })(),
        projCalMetaDomingo: (function () {
          try {
            if (Number(PP_PROJCAL.ano) !== ano || Number(PP_PROJCAL.mes) !== mes) return (mov0 && mov0.projCalMetaDomingo != null) ? mov0.projCalMetaDomingo : null;
            var el = document.getElementById('pfin-projcal-meta-dom');
            return (el && el.value.trim() !== '') ? (Math.round((parseFloat(el.value) || 0) * 100) / 100) : null;
          } catch (e) { return null; }
        })(),
        wipArranque: getMoney('pfin-wipArranque'),
        custosDiferimentos: Math.abs(getMoney('pfin-custosDiferimentos', f.custosDiferimentos)),
        faturamentoProjetado: getMoney('pfin-faturamentoProjetado'),
        valorFatBi: getMoney('pfin-valorFatBi'),
        diaLimiteFaturamento: Math.max(0, Math.min(31, Math.round(getMoney('pfin-diaLimiteFaturamento')))),
        wipMensalDesconto: (wipMensalDescontoEl && wipMensalDescontoEl.value.trim() !== '') ? getMoney('pfin-wipMensalDesconto') : null,
        wipDescontoAtivo: (function () { var c = document.getElementById('pfin-wipDescontoAtivo'); return c ? !!c.checked : true; })(),
        comentarioProjRecLiq: (function () { var t = document.getElementById('pfin-comentarioProjRecLiq'); return t ? t.value.trim() : ''; })(),
        comentarioCustosProj: (function () { var t = document.getElementById('pfin-comentarioCustosProj'); return t ? t.value.trim() : ''; })(),
        diasUteisForecast: (diasUteisForecastEl && diasUteisForecastEl.value.trim() !== '') ? Math.max(0, Math.round(getMoney('pfin-diasUteisForecast'))) : null,
        statusLimiteVerde: (statusLimiteVerdeEl && statusLimiteVerdeEl.value.trim() !== '') ? getMoney('pfin-statusLimiteVerde') : null,
        statusLimiteAmarelo: (statusLimiteAmareloEl && statusLimiteAmareloEl.value.trim() !== '') ? getMoney('pfin-statusLimiteAmarelo') : null,
        accumForecastNetManualAtivo: !!(document.getElementById('pfin-accumManualAtivo') && document.getElementById('pfin-accumManualAtivo').checked),
        accumForecastNetManual: getMoney('pfin-accumForecastNetManual'),
        observacaoExecutiva: obsEl ? obsEl.value.trim() : '',
        checkAtualizado: chkEl ? !!chkEl.checked : false,
        dataHoraAtualizacao: new Date().toISOString()
      };
      var idx = -1;
      for (var i = 0; i < f.movimentos.length; i++) { if (Number(f.movimentos[i].ano) === ano && Number(f.movimentos[i].mes) === mes) { idx = i; break; } }
      if (idx >= 0) f.movimentos[idx] = mov; else f.movimentos.push(mov);
      var _pid = (typeof currentProjectId !== 'undefined') ? currentProjectId : '';
      f.movimentos.forEach(function (mv) { if (mv && !mv.projectId) mv.projectId = _pid; });
      f._init = true;
      financeMirrorRootFromMovimento(f, financeMostRecenteMovimento(f));
      config.financeiroExecutivo = f;
      try {
        if (typeof window.ppSetSelectedFinanceMonth === 'function') {
          window.ppSetSelectedFinanceMonth(ano + '-' + (mes < 10 ? '0' + mes : mes));
        } else {
          window.ppSelectedFinanceMonth = { ano: ano, mes: mes };
        }
      } catch (e) { }
      financePersistFinance();
      try { if (typeof ppRefreshExecutiveFrame === 'function') ppRefreshExecutiveFrame(); } catch (e) { }
      return true;
    }
    function saveFinanceEditor() {
      var anoSel = document.getElementById('pfin-ano');
      var mesSel = document.getElementById('pfin-mes');
      var ano = anoSel ? Number(anoSel.value) : 0;
      var mes = mesSel ? Number(mesSel.value) : 0;
      if (!ano || !mes) { alert('Selecione o ano e o mês do movimento.'); return; }
      collectAndPersistFinanceEditor();
      financeEditorRenderList();
    }
    var pfinAutoSaveTimer = null;
    function scheduleFinanceEditorAutoSave() {
      clearTimeout(pfinAutoSaveTimer);
    }
    function bindFinanceEditorAutoSave() {
      var bg = document.getElementById('projectFinanceBg');
      if (!bg || bg.dataset.autoSaveBound === '1') return;
      bg.dataset.autoSaveBound = '1';
      bg.addEventListener('input', function (event) {
        if (!(event.target && event.target.closest('#pfin-form'))) return;
        if (event.target.id === 'pfin-projcal-dias-input') {
          var v = event.target.value.trim();
          PP_PROJCAL.mediaDiasManual = (v !== '' && Number(v) > 0) ? Number(v) : null;
          try { ppProjCalRecompute(); } catch (e) { }
        }
        if (event.target.id === 'pfin-projcal-meta-sab') {
          var vs = event.target.value.trim();
          PP_PROJCAL.metaSabado = (vs !== '') ? (parseFloat(vs) || 0) : 0;
          try { ppProjCalRecompute(); } catch (e) { }
        }
        if (event.target.id === 'pfin-projcal-meta-dom') {
          var vd = event.target.value.trim();
          PP_PROJCAL.metaDomingo = (vd !== '') ? (parseFloat(vd) || 0) : 0;
          try { ppProjCalRecompute(); } catch (e) { }
        }
        scheduleFinanceEditorAutoSave();
      });
      bg.addEventListener('change', function (event) {
        if (!(event.target && event.target.closest('#pfin-form'))) return;
        var id = event.target.id;
        if (id === 'pfin-projcal-usar' || id === 'pfin-ano' || id === 'pfin-mes') {
          try { ppProjCalRender(); } catch (e) { }
        }
        scheduleFinanceEditorAutoSave();
      });
      bg.addEventListener('click', function (event) {
        var btn = event.target && event.target.closest ? event.target.closest('#pfin-projcal-dias-reset') : null;
        if (!btn) return;
        event.preventDefault();
        PP_PROJCAL.mediaDiasManual = null;
        try { ppProjCalRender(); } catch (e) { }
        scheduleFinanceEditorAutoSave();
      });
    }
    var PP_PROJCAL = {
      marks: {},
      ano: 0, mes: 0,
      bankAccumLiq: 0,
      diasLancados: 0,
      lancadoSet: {},
      mediaDiasManual: null,
      metaSabado: 0,
      metaDomingo: 0
    };
    function ppProjCalDiasPadrao() {
      var uteis = Number(PP_PROJCAL.diasLancadosUteis) || 0;
      if (uteis > 0) return uteis;
      var d = 0;
      try { if (typeof config !== 'undefined' && config) d = Number(config.diasLancados) || 0; } catch (e) { }
      if (!d) d = Number(PP_PROJCAL.diasLancados) || 0;
      return d;
    }
    function ppProjCalDiasEfetivo() {
      var m = PP_PROJCAL.mediaDiasManual;
      if (m != null && Number(m) > 0) return Number(m);
      return ppProjCalDiasPadrao();
    }
    function ppProjCalKey(ano, mes, dia) { return dia + '/' + mes + '/' + ano; }
    function ppProjCalMoney(v) {
      try { if (typeof money === 'function') return money(v); } catch (e) { }
      return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function ppProjCalReadBank(ano, mes) {
      var out = { accumLiq: 0, diasLancados: 0, diasLancadosUteis: 0, lancadoSet: {} };
      try {
        var base = (typeof DAILY_BANK_KEY_BASE !== 'undefined') ? DAILY_BANK_KEY_BASE : 'painel-produtividade-banco-diario-editavel-v3-projetos';
        var pid = (typeof currentProjectId !== 'undefined') ? currentProjectId : '';
        if (!pid) return out;
        var raw = localStorage.getItem(base + '::' + pid);
        if (!raw) return out;
        var bank = JSON.parse(raw);
        if (!bank || typeof bank !== 'object') return out;
        var keys = Object.keys(bank).filter(function (k) { return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k); });
        keys = keys.filter(function (k) { var p = k.split('/'); return (+p[1]) === mes && (+p[2]) === ano; });
        if (!keys.length) return out;
        keys.forEach(function (k) { out.lancadoSet[k] = true; });
        out.diasLancados = keys.length;
        function ehDiaUtil(k) {
          var p = k.split('/'); var dow = new Date(+p[2], +p[1] - 1, +p[0]).getDay();
          return dow !== 0 && dow !== 6;
        }
        out.diasLancadosUteis = keys.filter(ehDiaUtil).length;
        keys.sort(function (a, b) {
          var pa = a.split('/'), pb = b.split('/');
          return new Date(+pa[2], +pa[1] - 1, +pa[0]) - new Date(+pb[2], +pb[1] - 1, +pb[0]);
        });
        var fator = (typeof fatorLiquido === 'function') ? fatorLiquido() : 1;
        fator = (fator > 0 ? fator : 1);
        var lastDay = bank[keys[keys.length - 1]];
        var acumBruto = Number(lastDay && lastDay.totalProduzidoAcumulado) || 0;
        out.accumLiq = acumBruto * fator;
        var brutoUteis = 0;
        keys.forEach(function (k) {
          if (!ehDiaUtil(k)) return;
          var dd = bank[k];
          brutoUteis += Number(dd && dd.totalProduzidoDia) || 0;
        });
        out.accumLiqUteis = brutoUteis * fator;
      } catch (e) { }
      return out;
    }
    function ppProjCalCurrentMonth() {
      var anoEl = document.getElementById('pfin-ano');
      var mesEl = document.getElementById('pfin-mes');
      var hoje = new Date();
      var ano = anoEl && anoEl.value ? Number(anoEl.value) : hoje.getFullYear();
      var mes = mesEl && mesEl.value ? Number(mesEl.value) : (hoje.getMonth() + 1);
      return { ano: ano, mes: mes };
    }
    function ppProjCalLoad(mov) {
      var mm = ppProjCalCurrentMonth();
      PP_PROJCAL.ano = mm.ano; PP_PROJCAL.mes = mm.mes;
      var marks = (mov && mov.diasProjecaoFechamento && typeof mov.diasProjecaoFechamento === 'object') ? mov.diasProjecaoFechamento : null;
      PP_PROJCAL.marks = {};
      if (marks) Object.keys(marks).forEach(function (k) {
        var v = Number(marks[k]);
        if (v === 1 || v === 0.5) PP_PROJCAL.marks[k] = v;
      });
      var usarEl = document.getElementById('pfin-projcal-usar');
      if (usarEl) usarEl.checked = mov ? !!mov.diasProjecaoUsarCalc : false;
      var md = mov && mov.diasProjecaoMediaDias != null && Number(mov.diasProjecaoMediaDias) > 0 ? Number(mov.diasProjecaoMediaDias) : null;
      PP_PROJCAL.mediaDiasManual = md;
      PP_PROJCAL.metaSabado = (mov && mov.projCalMetaSabado != null) ? Number(mov.projCalMetaSabado) : 0;
      PP_PROJCAL.metaDomingo = (mov && mov.projCalMetaDomingo != null) ? Number(mov.projCalMetaDomingo) : 0;
      var sabEl = document.getElementById('pfin-projcal-meta-sab');
      if (sabEl) sabEl.value = PP_PROJCAL.metaSabado ? PP_PROJCAL.metaSabado : '';
      var domEl = document.getElementById('pfin-projcal-meta-dom');
      if (domEl) domEl.value = PP_PROJCAL.metaDomingo ? PP_PROJCAL.metaDomingo : '';
      ppProjCalRender();
    }
    function ppProjCalRender() {
      var grid = document.getElementById('pfin-projcal-grid');
      var wrap = document.getElementById('pfin-projcal');
      if (!grid || !wrap) return;
      var mm = ppProjCalCurrentMonth();
      PP_PROJCAL.ano = mm.ano; PP_PROJCAL.mes = mm.mes;
      var bank = ppProjCalReadBank(mm.ano, mm.mes);
      PP_PROJCAL.bankAccumLiq = bank.accumLiq;
      PP_PROJCAL.bankAccumLiqUteis = bank.accumLiqUteis;
      PP_PROJCAL.diasLancados = bank.diasLancados;
      PP_PROJCAL.diasLancadosUteis = bank.diasLancadosUteis;
      PP_PROJCAL.lancadoSet = bank.lancadoSet;

      var usarEl = document.getElementById('pfin-projcal-usar');
      wrap.classList.toggle('is-off', !(usarEl && usarEl.checked));

      var monthEl = document.getElementById('pfin-projcal-month');
      if (monthEl) monthEl.textContent = (PP_MESES[mm.mes - 1] || mm.mes) + ' / ' + mm.ano;

      var hoje = new Date();
      var mesmoMes = (mm.ano === hoje.getFullYear() && mm.mes === (hoje.getMonth() + 1));
      var diasNoMes = new Date(mm.ano, mm.mes, 0).getDate();
      var primeiroDow = new Date(mm.ano, mm.mes - 1, 1).getDay();
      var WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      var html = WD.map(function (w) { return '<div class="pfin-projcal-wd">' + w + '</div>'; }).join('');
      for (var b = 0; b < primeiroDow; b++) html += '<div class="pfin-projcal-cell is-empty-day"></div>';
      for (var d = 1; d <= diasNoMes; d++) {
        var dow = new Date(mm.ano, mm.mes - 1, d).getDay();
        var isWeekend = (dow === 0 || dow === 6);
        var key = ppProjCalKey(mm.ano, mm.mes, d);
        var lancado = !!PP_PROJCAL.lancadoSet[key];
        var isToday = mesmoMes && d === hoje.getDate();
        var mark = PP_PROJCAL.marks[key];
        var cls = 'pfin-projcal-cell';
        if (isWeekend) cls += ' is-weekend';
        var markTxt = '';
        if (mark === 1) { cls += ' mark-full'; markTxt = '1'; }
        else if (mark === 0.5) { cls += ' mark-half'; markTxt = '½'; }
        if (lancado) cls += ' is-past';
        if (isToday) cls += ' is-today';
        html += '<div class="' + cls + '" data-dia="' + d + '" onclick="ppProjCalCycle(' + d + ')" title="'
          + (lancado ? 'Dia já lançado no banco diário' : 'Clique para marcar dia cheio / meio dia') + '">'
          + '<span class="d-num">' + d + '</span><span class="d-mark">' + markTxt + '</span></div>';
      }
      grid.innerHTML = html;
      var diasInput = document.getElementById('pfin-projcal-dias-input');
      if (diasInput && document.activeElement !== diasInput) {
        diasInput.value = ppProjCalDiasEfetivo() || '';
        diasInput.placeholder = String(ppProjCalDiasPadrao() || 0);
      }
      ppProjCalRecompute();
    }
    function ppProjCalCycle(dia) {
      var usarEl = document.getElementById('pfin-projcal-usar');
      if (!(usarEl && usarEl.checked)) return;
      var key = ppProjCalKey(PP_PROJCAL.ano, PP_PROJCAL.mes, dia);
      var cur = PP_PROJCAL.marks[key];
      if (cur === 1) PP_PROJCAL.marks[key] = 0.5;
      else if (cur === 0.5) delete PP_PROJCAL.marks[key];
      else PP_PROJCAL.marks[key] = 1;
      ppProjCalRender();
      if (typeof scheduleFinanceEditorAutoSave === 'function') scheduleFinanceEditorAutoSave();
    }
    function ppProjCalDow(k) {
      var p = String(k).split('/');
      if (p.length !== 3) return -1;
      var d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      return isNaN(d.getTime()) ? -1 : d.getDay();
    }
    function ppProjCalSomaPesos() {
      var total = 0, restante = 0, jaMarcado = 0;
      var utilRestante = 0, sabRestante = 0, domRestante = 0;
      Object.keys(PP_PROJCAL.marks).forEach(function (k) {
        var v = Number(PP_PROJCAL.marks[k]) || 0;
        total += v;
        var lancado = !!PP_PROJCAL.lancadoSet[k];
        if (lancado) { jaMarcado += v; return; }
        restante += v;
        var dow = ppProjCalDow(k);
        if (dow === 6) sabRestante += v;
        else if (dow === 0) domRestante += v;
        else utilRestante += v;
      });
      return { total: total, restante: restante, jaMarcado: jaMarcado, utilRestante: utilRestante, sabRestante: sabRestante, domRestante: domRestante };
    }
    function ppProjCalRecompute() {
      var metricsEl = document.getElementById('pfin-projcal-metrics');
      var usarEl = document.getElementById('pfin-projcal-usar');
      var usar = !!(usarEl && usarEl.checked);
      var accumLiq = PP_PROJCAL.bankAccumLiq;
      var accumLiqUteis = (PP_PROJCAL.bankAccumLiqUteis != null) ? PP_PROJCAL.bankAccumLiqUteis : accumLiq;
      var diasMedia = ppProjCalDiasEfetivo();
      var mediaDia = diasMedia > 0 ? (accumLiqUteis / diasMedia) : 0;
      var pesos = ppProjCalSomaPesos();
      var metaSab = Number(PP_PROJCAL.metaSabado) || 0;
      var metaDom = Number(PP_PROJCAL.metaDomingo) || 0;
      var utilRest = pesos.utilRestante + (metaSab > 0 ? 0 : pesos.sabRestante) + (metaDom > 0 ? 0 : pesos.domRestante);
      var projecao = accumLiq + (mediaDia * utilRest)
        + (metaSab > 0 ? metaSab * pesos.sabRestante : 0)
        + (metaDom > 0 ? metaDom * pesos.domRestante : 0);
      if (metricsEl) {
        var diasMediaTxt = (diasMedia % 1 === 0) ? diasMedia : diasMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        metricsEl.innerHTML =
          '<div class="pfin-projcal-metric"><span class="m-label">Líquido produzido (acum.)</span><span class="m-value">' + ppProjCalMoney(accumLiq) + '</span></div>'
          + '<div class="pfin-projcal-metric"><span class="m-label">Média líquida / dia (' + diasMediaTxt + (diasMedia === 1 ? ' dia útil' : ' dias úteis') + ')</span><span class="m-value">' + ppProjCalMoney(mediaDia) + '</span></div>'
          + '<div class="pfin-projcal-metric"><span class="m-label">Dias marcados restantes</span><span class="m-value">' + (pesos.restante).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '</span></div>'
          + '<div class="pfin-projcal-metric is-result"><span class="m-label">Projeção Receita Líquida (fechamento)</span><span class="m-value">' + ppProjCalMoney(projecao) + '</span></div>';
      }
      var alvo = document.getElementById('pfin-projRecLiqEstimativa');
      if (alvo) {
        if (usar) {
          var novo = (Math.round(projecao * 100) / 100);
          var antigo = alvo.value === '' ? null : (Math.round((parseFloat(alvo.value) || 0) * 100) / 100);
          alvo.value = novo;
          alvo.readOnly = true;
          alvo.style.background = '#EEF4FB';
          alvo.title = 'Calculado automaticamente pelo calendário de dias úteis. Desligue o cálculo para editar manualmente.';
          if (antigo === null || Math.abs(antigo - novo) > 0.01) {
            if (typeof scheduleFinanceEditorAutoSave === 'function') scheduleFinanceEditorAutoSave();
          }
        } else {
          alvo.readOnly = false;
          alvo.style.background = '';
          alvo.title = '';
        }
      }
      return projecao;
    }
    function closeEditor() { document.getElementById("modalBg").classList.remove("open"); }
    function recalcTargets() {
      collectEditor();
      const diasMes = n(config.diasUteisMes) || 21;
      const diasLancados = n(config.diasLancados) || 1;
      equipes = equipes.map(d => {
        const metaDia = round2(n(d.metaMes) / diasMes);
        return { ...d, metaDia, metaAcumulada: round2((n(d.metaMes) / diasMes) * diasLancados) };
      });
      editorRows();
      renderAll();
    }
    function syncHistoricoAtual() {
      collectEditor();
      const totalDia = equipes.reduce((s, d) => s + n(d.produzidoDia), 0);
      const label = config.dataReferencia || "Atual";
      const idx = historico.findIndex(h => h.data === label || h.data === label.slice(0, 5));
      if (idx >= 0) historico[idx] = { ...historico[idx], data: label, total: totalDia };
      else historico.push({ data: label, total: totalDia });
      editorRows();
      renderAll();
    }
    function clearProdDia() {
      collectEditor();
      equipes = equipes.map(d => ({ ...d, produzidoDia: 0 }));
      editorRows();
      renderAll();
    }
    function addTeam() {
      collectEditor();
      equipes.push({ equipe: "NOVA-EQUIPE", metaMes: 0, metaAcumulada: 0, metaDia: 0, produzidoDia: 0, produzidoAcumulado: 0 });
      editorRows();
      renderAll();
    }
    function ppDateKeyForDelete(value) {
      const refYear = String(config?.dataReferencia || "").match(/(\d{4})$/)?.[1] || String(new Date().getFullYear());
      const normalized = normalizeHistoricoDate(String(value || "").trim(), refYear);
      const m = String(normalized || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      return m ? String(Number(m[1])).padStart(2, "0") + "/" + String(Number(m[2])).padStart(2, "0") + "/" + m[3] : "";
    }
    function ppRecalculateStoredSnapshot(snap) {
      if (!snap || !Array.isArray(snap.equipes)) return snap;
      const totals = snap.equipes.reduce((sum, team) => {
        sum.dia += n(team.produzidoDia);
        sum.acum += n(team.produzidoAcumulado);
        sum.metaDia += n(team.metaDia);
        sum.metaAcum += n(team.metaAcumulada);
        return sum;
      }, { dia: 0, acum: 0, metaDia: 0, metaAcum: 0 });
      snap.totalProduzidoDia = round2(totals.dia);
      snap.totalProduzidoAcumulado = round2(totals.acum);
      snap.totalMetaDia = round2(totals.metaDia);
      snap.totalMetaAcumulada = round2(totals.metaAcum);
      return snap;
    }
    function ppWriteDailyBankAfterDelete(bank) {
      try {
        if (typeof window.setDailyBank === "function") window.setDailyBank(bank);
        else if (typeof setDailyBank === "function") setDailyBank(bank);
        else localStorage.setItem(dailyBankKey(), JSON.stringify(bank));
      } catch (e) { console.warn("Não foi possível sincronizar a exclusão diária.", e); }
      try { localStorage.setItem("painel-produtividade-view-dia-graficos-v1-projetos::" + currentProjectId, "__current"); } catch (e) { }
      try { if (typeof selectedViewMode !== "undefined") selectedViewMode = "__current"; } catch (e) { }
    }
    function ppRemoveTeamFromStoredSources(teamName, clearProject) {
      const target = String(teamName || "").trim().toUpperCase();
      const bank = clearProject ? {} : getDailyBank();
      if (!clearProject && target) {
        Object.keys(bank).forEach(key => {
          const snap = bank[key];
          if (!snap || !Array.isArray(snap.equipes)) return;
          snap.equipes = snap.equipes.filter(team => String(team?.equipe || "").trim().toUpperCase() !== target);
          if (snap.teamCards && typeof snap.teamCards === "object") delete snap.teamCards[teamName];
          ppRecalculateStoredSnapshot(snap);
        });
      }
      ppWriteDailyBankAfterDelete(bank);
      const ledgerKey = "painel-produtividade-csv-producao-ledger-v1-projetos::" + currentProjectId;
      try {
        if (clearProject) localStorage.removeItem(ledgerKey);
        else {
          const ledger = JSON.parse(localStorage.getItem(ledgerKey) || "{}");
          if (Array.isArray(ledger.rows)) ledger.rows = ledger.rows.filter(row => String(row?.equipe || "").trim().toUpperCase() !== target);
          localStorage.setItem(ledgerKey, JSON.stringify(ledger));
        }
      } catch (e) { }
    }
    function ppRemoveDateFromStoredSources(dateValue) {
      const target = ppDateKeyForDelete(dateValue);
      if (!target) return;
      const bank = getDailyBank();
      Object.keys(bank).forEach(key => { if (ppDateKeyForDelete(key) === target) delete bank[key]; });
      ppWriteDailyBankAfterDelete(bank);
      const ledgerKey = "painel-produtividade-csv-producao-ledger-v1-projetos::" + currentProjectId;
      try {
        const ledger = JSON.parse(localStorage.getItem(ledgerKey) || "{}");
        if (Array.isArray(ledger.rows)) ledger.rows = ledger.rows.filter(row => ppDateKeyForDelete(row?.dateKey || row?.dataOriginal || row?.data) !== target);
        localStorage.setItem(ledgerKey, JSON.stringify(ledger));
      } catch (e) { }
    }
    function removeTeam(i) {
      collectEditor();
      const removedName = equipes[i]?.equipe || "";
      equipes.splice(i, 1);
      if (teamCards && removedName) delete teamCards[removedName];
      if (equipes.length === 0) {
        historico = [];
        config.dataReferencia = "";
        config.diasLancados = 0;
        teamCards = {};
      }
      ppRemoveTeamFromStoredSources(removedName, false);
      editorRows();
      renderAll();
    }
    function addHistory() {
      collectEditor();
      historico.push({ data: "", total: 0 });
      editorRows();
      renderAll();
    }
    function addHistoryFromFields() {
      collectEditor();
      const dataInput = document.getElementById("newHistData");
      const totalInput = document.getElementById("newHistTotal");
      const label = (dataInput?.value || "").trim();
      const total = parseMoneyInput(totalInput?.value);
      if (!label) { alert("Informe a data da produção no formato dd/mm/aaaa, por exemplo 04/06/2026."); return; }
      const idx = historico.findIndex(h => String(h.data).trim() === label);
      if (idx >= 0) historico[idx].total = total;
      else historico.push({ data: label, total });
      if (dataInput) dataInput.value = "";
      if (totalInput) totalInput.value = "";
      editorRows();
      renderAll();
    }
    function removeHistory(i) {
      collectEditor();
      const removedDate = historico[i]?.data || "";
      historico.splice(i, 1);
      ppRemoveDateFromStoredSources(removedDate);
      editorRows();
      renderAll();
    }
    function csvHeaders() {
      return ["Equipe", "Meta mês", "Meta acum.", "Meta dia", "Prod. dia", "Prod. acum."];
    }
    function csvEscape(value) {
      const s = String(value ?? "");
      return /[;,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function csvNumber(value) {
      return NUM.format(n(value));
    }
    function exportCsv() {
      collectEditor();
      const rows = [csvHeaders(), ...equipes.map(d => [d.equipe, csvNumber(d.metaMes), csvNumber(d.metaAcumulada), csvNumber(d.metaDia), csvNumber(d.produzidoDia), csvNumber(d.produzidoAcumulado)])];
      const csv = rows.map(row => row.map(csvEscape).join(";")).join("\r\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "base-dados-dashboard-pp.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    }
    function triggerImportCsv() {
      const input = document.getElementById("csvFile");
      if (input) input.click();
    }
    function splitCsvLine(line, delimiter) {
      const out = [];
      let cur = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"') {
          if (quoted && next === '"') { cur += '"'; i++; }
          else quoted = !quoted;
        } else if (ch === delimiter && !quoted) {
          out.push(cur.trim()); cur = "";
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    }
    function parseCsv(text) {
      const clean = String(text || "").replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      if (!clean) return [];
      const first = clean.split("\n")[0] || "";
      const counts = { ";": first.split(";").length, ",": first.split(",").length, "\t": first.split("\t").length };
      let delimiter = ";";
      if (counts["\t"] > counts[";"] && counts["\t"] > counts[","]) delimiter = "\t";
      else if (counts[","] > counts[";"]) delimiter = ",";
      return clean.split("\n").filter(l => l.trim()).map(line => splitCsvLine(line, delimiter));
    }
    function normalizeHeader(s) {
      return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").trim();
    }
    function parseMoneyInput(v) {
      let s = String(v ?? "").trim();
      if (!s) return 0;
      s = s.replace(/R\$/gi, "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
      const hasComma = s.includes(",");
      const hasDot = s.includes(".");
      if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
      else if (hasComma) s = s.replace(",", ".");
      const value = Number(s);
      return Number.isFinite(value) ? value : 0;
    }
    function importCsvText(text) {
      const matrix = parseCsv(text);
      if (!matrix.length) { alert("CSV vazio ou inválido."); return; }
      const firstNormalized = matrix[0].map(normalizeHeader);

      if (firstNormalized[0] === "data" || firstNormalized.includes("valorbruto")) {
        importProducaoCsvText(matrix.slice(1), matrix[0]);
        return;
      }

      const expected = csvHeaders().map(normalizeHeader);
      const hasHeader = expected.some(h => firstNormalized.includes(h));
      const rows = hasHeader ? matrix.slice(1) : matrix;
      const index = {};
      if (hasHeader) {
        expected.forEach((h, i) => { const found = firstNormalized.indexOf(h); index[i] = found >= 0 ? found : i; });
      } else {
        expected.forEach((_, i) => index[i] = i);
      }
      const imported = rows.map(row => ({
        equipe: String(row[index[0]] || "").trim(),
        metaMes: parseMoneyInput(row[index[1]]),
        metaAcumulada: parseMoneyInput(row[index[2]]),
        metaDia: parseMoneyInput(row[index[3]]),
        produzidoDia: parseMoneyInput(row[index[4]]),
        produzidoAcumulado: parseMoneyInput(row[index[5]])
      })).filter(d => d.equipe);
      if (!imported.length) { alert("Nenhuma equipe válida encontrada no CSV."); return; }
      equipes = imported;
      editorRows();
      renderAll();
      if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true);
      else localStorage.setItem(storageKey(), JSON.stringify({ config, equipes, historico, teamCards, teamCardTheme }));
      alert(imported.length + " equipe(s) importada(s). Desvios e status recalculados automaticamente.");
    }

    function importProducaoCsvText(dataRows, headerRow) {
      const hIdx = {};
      headerRow.map(normalizeHeader).forEach((h, i) => { hIdx[h] = i; });
      const iData = hIdx["data"] ?? 0;
      const iEquipe = hIdx["equipe"] ?? 1;
      const iValor = hIdx["valorbruto"] ?? 4;
      const iMetaMes = hIdx["metames"] ?? 5;
      const iMetaDia = hIdx["metadia"] ?? 6;

      const allDates = new Set();
      dataRows.forEach(row => { const d = String(row[iData] || "").trim(); if (d) allDates.add(d); });
      const sortedDates = [...allDates].sort((a, b) => {
        const parseD = s => { const [dd, mm, yyyy] = s.split('/'); return new Date(+yyyy, +mm - 1, +dd); };
        return parseD(a) - parseD(b);
      });

      let refDate = (config.dataReferencia || "").trim();
      if (!refDate || !allDates.has(refDate)) {
        refDate = sortedDates[sortedDates.length - 1] || refDate;
      }

      if (refDate) {
        config = normalizeConfigObject(config);
        config.dataReferencia = refDate;
        if (typeof parsePeriodo === 'function') config.mesAno = parsePeriodo(refDate) || config.mesAno || "";
      }

      const byEquipe = {};
      const byDate = {};
      dataRows.forEach(row => {
        const equipe = String(row[iEquipe] || "").trim();
        if (!equipe || equipe === "-") return;
        const rowDate = String(row[iData] || "").trim();
        const valor = parseMoneyInput(row[iValor]);
        const metaMes = parseMoneyInput(row[iMetaMes]);
        const metaDia = parseMoneyInput(row[iMetaDia]);
        if (!byEquipe[equipe]) byEquipe[equipe] = { equipe, acum: 0, dia: 0, metaMes: 0, metaDia: 0, dates: new Set() };
        const e = byEquipe[equipe];
        e.acum += valor;
        if (refDate && rowDate === refDate) e.dia += valor;
        if (metaMes > 0) e.metaMes = metaMes;
        if (metaDia > 0) e.metaDia = metaDia;
        if (rowDate) {
          e.dates.add(rowDate);
          byDate[rowDate] = (byDate[rowDate] || 0) + valor;
        }
      });

      const newHistorico = sortedDates.map(d => ({ data: d, total: byDate[d] || 0 }));
      if (newHistorico.length) historico = newHistorico;

      const diasLancados = n(config.diasLancados) || allDates.size;

      const existing = {};
      equipes.forEach(e => { existing[e.equipe] = e; });

      const updated = Object.values(byEquipe).map(e => ({
        ...(existing[e.equipe] || {}),
        equipe: e.equipe,
        metaMes: e.metaMes || (existing[e.equipe] || {}).metaMes || 0,
        metaDia: e.metaDia || (existing[e.equipe] || {}).metaDia || 0,
        metaAcumulada: (e.metaDia || (existing[e.equipe] || {}).metaDia || 0) * diasLancados,
        produzidoDia: e.dia,
        produzidoAcumulado: e.acum
      }));

      if (!updated.length) { alert("Nenhuma equipe válida encontrada no CSV."); return; }
      equipes = updated;
      editorRows();
      renderAll();

      if (typeof ppPersistCurrentProject === 'function') ppPersistCurrentProject(true);
      else localStorage.setItem(storageKey(), JSON.stringify({ config, equipes, historico, teamCards, teamCardTheme }));

      alert(updated.length + " equipe(s) importada(s) do banco de produção.\n"
        + "Acumulado e histórico recalculados. Dia de referência: " + (refDate || "não definida") + ".\n"
        + "Dados salvos na plataforma.");
    }

    function dailyKey() {
      return String(config.dataReferencia || "").trim();
    }
    function ppIsFullDateKey(k) {
      const s = String(k || "").trim();
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return false;
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]);
    }
    function getDailyBank() {
      try {
        const raw = localStorage.getItem(dailyBankKey());
        const bank = raw ? JSON.parse(raw) : {};
        if (!bank || typeof bank !== "object" || Array.isArray(bank)) return {};
        const clean = {};
        Object.keys(bank).forEach(k => { if (ppIsFullDateKey(k)) clean[k] = bank[k]; });
        return clean;
      } catch (e) {
        return {};
      }
    }
    function setDailyBank(bank) {
      localStorage.setItem(dailyBankKey(), JSON.stringify(bank));
    }
    function ppPurgeInvalidBankKeys() {
      try {
        const base = DAILY_BANK_KEY_BASE;
        for (let i = 0; i < localStorage.length; i++) {
          const lk = localStorage.key(i);
          if (!lk || lk.indexOf(base) !== 0) continue;
          let obj;
          try { obj = JSON.parse(localStorage.getItem(lk) || "{}"); } catch (e) { continue; }
          if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
          let changed = false;
          Object.keys(obj).forEach(dk => { if (!ppIsFullDateKey(dk)) { delete obj[dk]; changed = true; } });
          if (changed) localStorage.setItem(lk, JSON.stringify(obj));
        }
      } catch (e) { console.warn("[BankPurge]", e); }
    }
    try { ppPurgeInvalidBankKeys(); } catch (e) { }
    function saveDaySnapshot(showAlert = true) {
      if (document.getElementById("modalBg")?.classList.contains("open")) collectEditor();
      const key = dailyKey();
      if (!ppIsFullDateKey(key)) {
        if (showAlert) alert("Data de referência inválida. Preencha no formato DD/MM/AAAA antes de salvar o dia.");
        return;
      }
      const bank = getDailyBank();
      const totals = data().total;
      bank[key] = {
        savedAt: new Date().toISOString(),
        title: config.titulo || "",
        mesAno: parsePeriodo(key) || parsePeriodo(config.dataReferencia || ""),
        totalProduzidoDia: totals.produzidoDia,
        totalProduzidoAcumulado: totals.produzidoAcumulado,
        totalMetaDia: totals.metaDia,
        totalMetaAcumulada: totals.metaAcumulada,
        config: clone(config),
        equipes: clone(equipes),
        historico: clone(historico),
        teamCards: clone(teamCards),
        teamCardTheme: clone(teamCardTheme)
      };
      setDailyBank(bank);
      updateDailyBankSelect(key);
      if (showAlert) alert("Fechamento de " + key + " salvo no banco diário.");
    }
    function getBankPeriods() {
      const bank = getDailyBank();
      const periods = new Set();
      Object.keys(bank).forEach(k => {
        const p = parsePeriodo(k) || (bank[k] && bank[k].mesAno) || "";
        if (p) periods.add(p);
      });
      return [...periods].sort((a, b) => {
        const [ma, ya] = a.split("/"); const [mb, yb] = b.split("/");
        return Number(yb) - Number(ya) || Number(mb) - Number(ma);
      });
    }
    function updateBankPeriodFilter() {
      const sel = document.getElementById("bankPeriodFilter");
      if (!sel) return;
      const periods = getBankPeriods();
      const current = sel.value;
      sel.innerHTML = '<option value="">Todos os períodos</option>'
        + periods.map(p => `<option value="${p}">${p}</option>`).join("");
      if (periods.includes(current)) sel.value = current;
    }
    function filterBankSelect() {
      const period = document.getElementById("bankPeriodFilter")?.value || "";
      const bank = getDailyBank();
      const select = document.getElementById("dailyBankSelect");
      const info = document.getElementById("bankInfo");
      if (!select) return;
      let keys = Object.keys(bank).sort((a, b) => String(bank[b].savedAt || "").localeCompare(String(bank[a].savedAt || "")));
      if (period) {
        keys = keys.filter(k => {
          const p = parsePeriodo(k) || (bank[k] && bank[k].mesAno) || "";
          return p === period;
        });
      }
      select.innerHTML = keys.length
        ? '<option value="">Selecione um dia salvo</option>' + keys.map(k => {
          const snap = bank[k] || {};
          const total = snap.totalProduzidoAcumulado ? " · " + money(snap.totalProduzidoAcumulado) : "";
          return `<option value="${k.replace(/"/g, '&quot;')}">${k}${total}</option>`;
        }).join("")
        : '<option value="">Nenhum dia salvo neste período</option>';
      if (info) info.textContent = keys.length + " registro(s)" + (period ? " em " + period : "") + " no banco local.";
    }
    function updateDailyBankSelect(selectedKey = null) {
      updateBankPeriodFilter();
      filterBankSelect();
      if (selectedKey) {
        const select = document.getElementById("dailyBankSelect");
        if (select) {
          const exists = [...select.options].some(o => o.value === selectedKey);
          if (!exists) {
            const periodSel = document.getElementById("bankPeriodFilter");
            if (periodSel) { periodSel.value = ""; filterBankSelect(); }
          }
          if ([...select.options].some(o => o.value === selectedKey)) select.value = selectedKey;
        }
      }
    }

    function loadLocal() {
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
    }
    function sanitizeInputText(value) { return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim(); }
    function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
    function isSafeDataImage(src) { return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(String(src || "")); }
    function safeCardPhoto(src) { return isSafeDataImage(src) ? src : null; }
    function safeHexColor(value, fallback) {
      const v = String(value || "").trim();
      return /^#[0-9A-F]{6}$/i.test(v) ? v.toUpperCase() : fallback;
    }
    function normalizeTeamCardTheme(theme = {}) {
      return {
        topo: safeHexColor(theme.topo, TEAM_CARD_THEME_ORIGINAL.topo),
        destaque: safeHexColor(theme.destaque, TEAM_CARD_THEME_ORIGINAL.destaque),
        fundoInterno: safeHexColor(theme.fundoInterno, TEAM_CARD_THEME_ORIGINAL.fundoInterno),
        fundoTela: safeHexColor(theme.fundoTela, TEAM_CARD_THEME_ORIGINAL.fundoTela),
        borda: safeHexColor(theme.borda, theme.fundoInterno || TEAM_CARD_THEME_ORIGINAL.borda)
      };
    }
    function setTeamCardThemeControls() {
      teamCardTheme = normalizeTeamCardTheme(teamCardTheme);
      const map = {
        tcHeadColor: teamCardTheme.topo,
        tcAccentColor: teamCardTheme.destaque,
        tcPaperBgColor: teamCardTheme.fundoInterno,
        tcPageBgColor: teamCardTheme.fundoTela
      };
      Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
    }
    function collectTeamCardThemeEditor() {
      const read = (id, fallback) => safeHexColor(document.getElementById(id)?.value, fallback);
      teamCardTheme = normalizeTeamCardTheme({
        topo: read("tcHeadColor", teamCardTheme.topo),
        destaque: read("tcAccentColor", teamCardTheme.destaque),
        fundoInterno: read("tcPaperBgColor", teamCardTheme.fundoInterno),
        fundoTela: read("tcPageBgColor", teamCardTheme.fundoTela),
        borda: teamCardTheme.borda
      });
    }
    function applyTeamCardThemeVars() {
      teamCardTheme = normalizeTeamCardTheme(teamCardTheme);
      const page = document.getElementById("teamCardPage");
      const paper = document.getElementById("teamCardPaper");
      [page, paper].forEach(el => {
        if (!el) return;
        el.style.setProperty("--tc-head-bg", teamCardTheme.topo);
        el.style.setProperty("--tc-accent", teamCardTheme.destaque);
        el.style.setProperty("--tc-paper-bg", teamCardTheme.fundoInterno);
        el.style.setProperty("--tc-page-bg", teamCardTheme.fundoTela);
        el.style.setProperty("--tc-border-color", teamCardTheme.borda || teamCardTheme.fundoInterno);
      });
    }
    function applyTeamCardThemePreset(name) {
      teamCardTheme = normalizeTeamCardTheme(TEAM_CARD_THEME_PRESETS[name] || TEAM_CARD_THEME_ORIGINAL);
      setTeamCardThemeControls();
      applyTeamCardThemeVars();
      renderTeamCard();
    }
    function resetTeamCardTheme() {
      applyTeamCardThemePreset("navy");
    }

    function shortMoney(v) {
      const val = Math.abs(n(v));
      const sign = n(v) < 0 ? "-" : "";
      if (val >= 1000000) return sign + "R$ " + NUM.format(val / 1000000) + " mi";
      return sign + "R$ " + NUM.format(val / 1000) + " mil";
    }
    function serviceFromTeam(eq) {
      const s = String(eq || "").toUpperCase();
      if (s.startsWith("LVL")) return "LINHA VIVA";
      if (s.startsWith("LML")) return "LINHA MORTA";
      return "CONSTRUÇÃO / MANUTENÇÃO";
    }
    function baseFromTeam(eq) {
      const marker = cfgText("marcadorBaseAlternativa", "-AF").toUpperCase();
      const team = String(eq || "").toUpperCase();
      if (marker && team.includes(marker)) return cfgText("baseAlternativa", "BASE AVANÇADA").toUpperCase();
      return cfgText("basePadrao", "BASE PADRÃO").toUpperCase();
    }
    function defaultCardMeta(eq) {
      const team = String(eq || "").trim() || "EQUIPE";
      const meta = {
        nomeEquipe: team,
        base: baseFromTeam(team),
        servico: serviceFromTeam(team),
        lider: "Não informado",
        supervisor: "Não informado",
        responsavel: "Não informado",
        dataAcao: config.dataReferencia || "",
        prazo: "",
        status: "Aberto",
        diagnostico: "Equipe selecionada para acompanhamento de produtividade.",
        acao: "Acompanhamento diário com alinhamento de meta, verificação de impedimentos e plano de recuperação até o fechamento.",
        resultado: "Pendente de reavaliação após nova medição.",
        fotos: [null, null],
        tipIndex: 0
      };
      return meta;
    }
    function normalizeCardMeta(eq, meta = {}) {
      const base = defaultCardMeta(eq);
      const out = { ...base, ...(meta || {}) };
      out.nomeEquipe = String(out.nomeEquipe || eq || base.nomeEquipe);
      out.fotos = Array.isArray(out.fotos) ? [safeCardPhoto(out.fotos[0]), safeCardPhoto(out.fotos[1])] : [null, null];
      out.tipIndex = Number.isFinite(Number(out.tipIndex)) ? Number(out.tipIndex) : 0;
      return out;
    }
    function getCardMeta(eq) {
      const key = String(eq || selectedCardTeam || "").trim();
      if (!teamCards[key]) teamCards[key] = defaultCardMeta(key);
      teamCards[key] = normalizeCardMeta(key, teamCards[key]);
      return teamCards[key];
    }
    function selectedTeamData() {
      const { list } = data();
      if (!selectedCardTeam || !list.some(d => d.equipe === selectedCardTeam)) {
        const preferred = list[0];
        selectedCardTeam = preferred ? preferred.equipe : "";
      }
      return list.find(d => d.equipe === selectedCardTeam) || list[0] || null;
    }
    function openTeamCard() {
      const page = document.getElementById("teamCardPage");
      const allPage = document.getElementById("allTeamCardsPage");
      if (allPage) allPage.classList.remove("open");
      if (!selectedCardTeam) {
        const preferred = equipes[0];
        selectedCardTeam = preferred ? preferred.equipe : "";
      }
      if (page) page.dataset.projectId = currentProjectId || "";
      page.classList.add("open");
      renderTeamCardEditor();
      renderTeamCard();
    }
    function saveTeamCardIfEditable() {
      if (typeof window.ppIsReadOnlyRole === "function" && window.ppIsReadOnlyRole()) return;
      saveLocalSilent();
    }

    function salvarTeamCard() {
      if (typeof window.ppIsReadOnlyRole === "function" && window.ppIsReadOnlyRole()) {
        alert("Seu perfil é somente leitura: o card pode ser consultado, mas não salvo.");
        return;
      }
      window.__ppSaveExplicito = true;
      collectTeamCardEditor();
      renderTeamCard();
      try {
        const d = selectedTeamData();
        if (typeof ppSaveTeamPhotos === "function" && teamCardMatchesCurrentProject() && d && d.equipe) {
          ppSaveTeamPhotos(currentProjectId, d.equipe, (getCardMeta(d.equipe).fotos || []));
        }
      } catch (e) { }
      if (typeof ppPersistCurrentProject === "function") ppPersistCurrentProject(true);
      else saveLocalSilent();
    }

    function closeTeamCard() {
      applyTeamCardEditor(false);
      document.getElementById("teamCardPage").classList.remove("open");
      if (typeof renderAll === "function") renderAll();
    }
    function selectTeamCard(eq) {
      try {
        if (document.getElementById("teamCardPage")?.classList.contains("open")) collectTeamCardEditor();
      } catch (e) { }
      selectedCardTeam = eq;
      renderTeamCardEditor();
      renderTeamCard();
    }
    function stepTeamCard(delta) {
      const idx = Math.max(0, equipes.findIndex(item => item.equipe === selectedCardTeam));
      const next = (idx + delta + equipes.length) % equipes.length;
      const eq = equipes[next]?.equipe || selectedCardTeam;
      selectTeamCard(eq);
    }
    function renderTeamCardEditor() {
      const d = selectedTeamData();
      if (!d) return;
      setTeamCardThemeControls();
      applyTeamCardThemeVars();
      const meta = getCardMeta(d.equipe);
      const select = document.getElementById("tcSelect");
      if (select) {
        select.innerHTML = equipes.map(item => `<option value="${escapeAttr(item.equipe)}">${escapeHtml(item.equipe)}</option>`).join("");
        select.value = d.equipe;
      }
      const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };
      set("tcBase", meta.base);
      set("tcServico", meta.servico);
      set("tcLider", meta.lider);
      set("tcSupervisor", meta.supervisor);
      set("tcResponsavel", meta.responsavel);
      set("tcDataAcao", meta.dataAcao || config.dataReferencia || "");
      set("tcPrazo", meta.prazo);
      set("tcStatus", meta.status || "Aberto");
      set("tcDiagnostico", meta.diagnostico);
      set("tcAcao", meta.acao);
      set("tcResultado", meta.resultado);
      renderTeamCardPhotoList();
    }
    function teamCardMatchesCurrentProject() {
      const p = document.getElementById("teamCardPage");
      if (p && p.dataset.projectId && p.dataset.projectId !== (currentProjectId || "")) return false;
      return true;
    }
    function collectTeamCardEditor() {
      const _tcPage = document.getElementById("teamCardPage");
      if (!teamCardMatchesCurrentProject()) return;
      collectTeamCardThemeEditor();
      const d = selectedTeamData();
      if (!d || !_tcPage) return;
      const val = (id) => sanitizeInputText(document.getElementById(id)?.value ?? "");
      const meta = getCardMeta(d.equipe);
      meta.nomeEquipe = d.equipe;
      meta.base = val("tcBase") || baseFromTeam(d.equipe);
      meta.servico = val("tcServico") || serviceFromTeam(d.equipe);
      meta.lider = val("tcLider") || "Não informado";
      meta.supervisor = val("tcSupervisor") || "Não informado";
      meta.responsavel = val("tcResponsavel") || "Não informado";
      meta.dataAcao = val("tcDataAcao") || config.dataReferencia || "";
      meta.prazo = val("tcPrazo");
      meta.status = val("tcStatus") || "Aberto";
      meta.diagnostico = val("tcDiagnostico") || "Equipe selecionada para acompanhamento de produtividade.";
      meta.acao = val("tcAcao") || "Acompanhamento diário com alinhamento de meta, verificação de impedimentos e plano de recuperação até o fechamento.";
      meta.resultado = val("tcResultado") || "Pendente de reavaliação após nova medição.";
      teamCards[d.equipe] = normalizeCardMeta(d.equipe, meta);
    }
    function applyTeamCardEditor(show = true) {
      if (!document.getElementById("teamCardPage")?.classList.contains("open")) return;
      collectTeamCardEditor();
      renderTeamCard();
    }
    let tcLiveTimer = null;
    let tcAutoSaveTimer = null;
    function scheduleTeamCardAutoSave() {
      clearTimeout(tcAutoSaveTimer);
    }
    function bindTeamCardRealtime() {
      const page = document.getElementById("teamCardPage");
      if (!page || page.dataset.liveBound === "1") return;
      page.addEventListener("input", (event) => {
        if (event.target && event.target.type === "file") return;
        clearTimeout(tcLiveTimer);
        tcLiveTimer = setTimeout(() => { collectTeamCardEditor(); renderTeamCard(); }, 180);
        scheduleTeamCardAutoSave();
      });
      page.addEventListener("change", (event) => {
        if (event.target && event.target.type === "file") return;
        clearTimeout(tcLiveTimer);
        tcLiveTimer = setTimeout(() => { collectTeamCardEditor(); renderTeamCard(); }, 80);
        scheduleTeamCardAutoSave();
      });
      page.dataset.liveBound = "1";
    }
    function resizeImageDataUrl(dataUrl, callback) {
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 1200, maxH = 850;
          let { width, height } = img;
          const ratio = Math.min(1, maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          callback(canvas.toDataURL("image/jpeg", .82));
        } catch (e) { callback(dataUrl); }
      };
      img.onerror = () => callback(dataUrl);
      img.src = dataUrl;
    }
    function setTeamCardPhotos(event) {
      if (!teamCardMatchesCurrentProject()) return;
      const files = Array.from((event.target && event.target.files) || []);
      if (event.target) event.target.value = "";
      if (!files.length) return;
      const d = selectedTeamData();
      if (!d) return;
      const meta = getCardMeta(d.equipe);
      meta.fotos = Array.isArray(meta.fotos) ? meta.fotos : [null, null];
      const livres = [];
      for (let i = 0; i < 2; i++) { if (!meta.fotos[i]) livres.push(i); }
      if (!livres.length) { alert("Máximo de 2 fotos. Remova uma antes de anexar outra."); return; }
      if (files.length > livres.length) alert("Máximo de 2 fotos: apenas as primeiras serão anexadas.");
      const aUsar = files.slice(0, livres.length);
      let restantes = aUsar.length;
      aUsar.forEach((file, k) => {
        const slot = livres[k];
        if (!file.type.startsWith("image/") || !/(png|jpe?g|webp|gif)$/i.test((file.type.split("/")[1]) || "")) {
          alert("Use PNG, JPG, WEBP ou GIF."); if (--restantes === 0) finalizar(); return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resizeImageDataUrl(reader.result, (finalDataUrl) => {
            if (teamCardMatchesCurrentProject()) {
              const safe = safeCardPhoto(finalDataUrl);
              if (safe) { meta.fotos[slot] = safe; teamCards[d.equipe] = meta; }
              else { alert("Não foi possível preparar uma das fotos para o PNG. Use PNG, JPG ou WEBP."); }
            }
            if (--restantes === 0) finalizar();
          });
        };
        reader.onerror = () => { alert("Não foi possível carregar uma das imagens."); if (--restantes === 0) finalizar(); };
        reader.readAsDataURL(file);
      });
      function finalizar() {
        renderTeamCardPhotoList(); renderTeamCard();
      }
    }
    function renderTeamCardPhotoList() {
      const box = document.getElementById("tcPhotoList");
      if (!box) return;
      const d = selectedTeamData();
      const fotos = (d ? (getCardMeta(d.equipe).fotos || []) : []);
      let html = "";
      fotos.forEach((src, i) => {
        if (!src) return;
        html += '<div class="tc-photo-item"><img src="' + escapeAttr(src) + '" alt="Foto ' + (i + 1) + '">'
          + '<button type="button" class="tc-small-btn" onclick="removeTeamCardPhoto(' + i + ')">Remover</button></div>';
      });
      box.innerHTML = html;
    }
    function removeTeamCardPhoto(index) {
      if (!teamCardMatchesCurrentProject()) return;
      const d = selectedTeamData();
      if (!d) return;
      const meta = getCardMeta(d.equipe);
      meta.fotos[index] = null;
      teamCards[d.equipe] = meta;
      renderTeamCardPhotoList();
      renderTeamCard();
    }
    function statusClassFromMetric(d) {
      if (!d) return "";
      if (d.status.text === "ALERTA") return "danger";
      if (d.status.text === "ATENÇÃO") return "warn";
      return "";
    }
    function fichaSituacao(d) {
      const t = String(d?.status?.text || "").toUpperCase();
      if (t.includes("ALERTA") || t.includes("CRÍTICO")) return "fx-st-alr";
      if (t.includes("ATEN")) return "fx-st-att";
      return "fx-st-ok";
    }
    function fichaContrato() { return cfgText("identificacaoContrato", cfgText("clienteContrato", "Contrato")); }
    function fichaPct(v) { return Math.min(100, Math.max(0, n(v) * 100)).toFixed(1); }
    /* Régua do mês: barra = produzido ÷ meta do mês; traço = meta até hoje ÷ meta do mês */
    function fichaRegua(d, st) {
      const metaMes = n(d.metaMes);
      const feito = metaMes > 0 ? n(d.produzidoAcumulado) / metaMes : 0;
      const esperado = metaMes > 0 ? n(d.metaAcumulada) / metaMes : 0;
      return `<div class="fx-regua ${st}"><span style="width:${fichaPct(feito)}%"></span><i style="left:${fichaPct(esperado)}%"></i></div>`;
    }
    function fichaFotos(meta) {
      const fotos = (meta.fotos || []).filter(Boolean).slice(0, 2);
      if (!fotos.length) return "";
      return `<section class="fx-bloco fx-fotos"><h3>Vistoria</h3><div class="fx-fotos-grade">${fotos.map((src, i) => `<img src="${escapeAttr(src)}" alt="Foto ${i + 1} da vistoria">`).join("")}</div></section>`;
    }
    function teamCardInnerHtml(d, meta) {
      const diasRestantes = Math.max(0, n(config.diasUteisMes) - n(config.diasLancados));
      const saldoMeta = Math.max(0, n(d.metaMes) - n(d.produzidoAcumulado));
      const recuperarDia = diasRestantes > 0 ? saldoMeta / diasRestantes : 0;
      const liquido = n(d.produzidoAcumulado) * fatorLiquido();
      const pctMes = d.metaMes > 0 ? d.produzidoAcumulado / d.metaMes : 0;
      const pctAcum = d.metaAcumulada > 0 ? d.produzidoAcumulado / d.metaAcumulada : 0;
      const st = fichaSituacao(d);
      const ref = escapeHtml(config.dataReferencia || "");
      const base = escapeHtml(meta.base || baseFromTeam(d.equipe));
      const servico = escapeHtml(meta.servico || serviceFromTeam(d.equipe));
      const texto = v => escapeHtml(v) || '<span class="fx-vazio">não informado</span>';
      return `<div class="fx">
  <header class="fx-topo">
    <div class="fx-topo-id">
      <small>${escapeHtml(cfgText("textoCardAcompanhamento", "Ficha de acompanhamento"))} · ${escapeHtml(fichaContrato())}</small>
      <strong>${escapeHtml(d.equipe)}</strong>
      <span>${base} · ${servico}</span>
    </div>
    <div class="fx-topo-dir">
      <span class="fx-sit ${st}">${escapeHtml(d.status.text)}</span>
      <div class="fx-ref"><small>Referência</small><b>${ref}</b></div>
    </div>
  </header>
  <section class="fx-avanco">
    <div class="fx-avanco-num"><b class="${st}">${percent(pctMes)}</b><span>da meta do mês</span></div>
    <div class="fx-avanco-regua">
      ${fichaRegua(d, st)}
      <div class="fx-avanco-leg"><span>${money(d.produzidoAcumulado)} de ${money(d.metaMes)}</span><span>traço: meta esperada até ${ref}</span></div>
    </div>
  </section>
  <div class="fx-grade">
    <section class="fx-bloco">
      <h3>Números do mês</h3>
      <table class="fx-tab">
        <tbody>
          <tr><th>Meta do mês</th><td>${money(d.metaMes)}</td><td class="fx-obs">${money(d.metaDia)} por dia útil</td></tr>
          <tr><th>Meta até hoje</th><td>${money(d.metaAcumulada)}</td><td class="fx-obs">${n(config.diasLancados)} dias úteis</td></tr>
          <tr><th>Produzido bruto</th><td>${money(d.produzidoAcumulado)}</td><td class="fx-obs">até ${ref}</td></tr>
          <tr><th>Produzido líquido</th><td>${money(liquido)}</td><td class="fx-obs">bruto × ${NUM.format(1 - descontoLiquido())}</td></tr>
          <tr class="fx-linha-forte"><th>Desvio acumulado</th><td class="${d.desvioAcumulado >= 0 ? "pos" : "neg"}">${money(d.desvioAcumulado)}</td><td class="fx-obs">${percent(pctAcum)} da meta até hoje</td></tr>
          <tr><th>Último dia</th><td>${money(d.produzidoDia)}</td><td class="fx-obs">${ref}</td></tr>
          <tr><th>Saldo para a meta</th><td class="${saldoMeta > 0 ? "neg" : ""}">${money(saldoMeta)}</td><td class="fx-obs">${saldoMeta > 0 ? "falta no mês" : "meta do mês atingida"}</td></tr>
          <tr><th>Necessário por dia</th><td class="${recuperarDia > n(d.metaDia) ? "neg" : ""}">${money(recuperarDia)}</td><td class="fx-obs">${diasRestantes} dias úteis restantes</td></tr>
        </tbody>
      </table>
    </section>
    <section class="fx-bloco">
      <h3>Produção acumulada no mês</h3>
      <div class="fx-grafico"><canvas id="tcEvolutionChart"></canvas></div>
    </section>
  </div>
  <div class="fx-grade fx-grade-baixo">
    <section class="fx-bloco">
      <h3>Plano de ação</h3>
      <table class="fx-tab fx-tab-texto">
        <tbody>
          <tr><th>Diagnóstico</th><td>${texto(meta.diagnostico)}</td></tr>
          <tr><th>Ação / plano</th><td>${texto(meta.acao)}</td></tr>
          <tr><th>Resultado</th><td>${texto(meta.resultado)}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="fx-bloco">
      <h3>Responsáveis</h3>
      <table class="fx-tab fx-tab-texto">
        <tbody>
          <tr><th>Líder</th><td>${texto(meta.lider)}</td></tr>
          <tr><th>Supervisor</th><td>${texto(meta.supervisor)}</td></tr>
          <tr><th>Responsável pela ação</th><td>${texto(meta.responsavel)}</td></tr>
          <tr><th>Situação da ação</th><td>${escapeHtml(meta.status || "Aberto")}</td></tr>
          <tr><th>Data da ação</th><td>${texto(meta.dataAcao || config.dataReferencia)}</td></tr>
          <tr><th>Prazo / reavaliação</th><td>${texto(meta.prazo)}</td></tr>
        </tbody>
      </table>
    </section>
  </div>
  ${fichaFotos(meta)}
  <footer class="fx-rodape"><span>${escapeHtml(fichaContrato())} · ${base}</span><span>Valores em reais, brutos exceto a linha de produzido líquido</span></footer>
</div>`;
    }
    const tcLineLabelPlugin = {
      id: "tcLineLabelPlugin",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const area = chart.chartArea;
        if (!area) return;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta || meta.hidden || !meta.data.length || !dataset.shortLabel) return;
          let lastIndex = dataset.data.length - 1;
          while (lastIndex >= 0 && (dataset.data[lastIndex] === null || dataset.data[lastIndex] === undefined)) lastIndex--;
          if (lastIndex < 0) return;
          const point = meta.data[lastIndex];
          if (!point) return;
          const value = Number(dataset.data[lastIndex]);
          if (!Number.isFinite(value)) return;
          ctx.save();
          ctx.font = "600 11px Inter, Segoe UI, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = dataset.borderColor || "#11161E";
          const x = Math.min(area.right - 4, Math.max(area.left + 40, point.x));
          const y = Math.max(area.top + 12, Math.min(area.bottom - 4, point.y - 6));
          ctx.fillText((dataset.shortLabel || "") + " " + shortMoney(value), x, y);
          ctx.restore();
        });
      }
    };

    function createTeamCardChart(canvas, d, themeOverride = null) {
      if (!canvas) return null;
      if (!window.Chart) {
        canvas.outerHTML = '<div class="tc-empty-chart">Gráfico indisponível: verifique a conexão e recarregue o arquivo.</div>';
        return null;
      }
      const theme = normalizeTeamCardTheme(themeOverride || teamCardTheme);
      const series = getTeamEvolutionSeries(d);
      const realLabels = series.map(s => s.label);
      const realData = series.map(s => Math.max(0, n(s.value)));
      const diasMes = Math.max(1, n(config.diasUteisMes) || 21);
      const diasLancados = Math.max(1, Math.min(diasMes, n(config.diasLancados) || realData.length || 1));
      const diasRestantes = Math.max(0, diasMes - diasLancados);
      const futureCount = diasRestantes;
      const futureLabels = Array.from({ length: futureCount }, (_, i) => i === futureCount - 1 ? "Fim mês" : "D+" + (i + 1));
      const labels = [...realLabels, ...futureLabels];
      const metaMes = Math.max(0, n(d.metaMes));
      const metaAtual = Math.min(metaMes, n(d.metaAcumulada) || (metaMes / diasMes) * diasLancados);
      const metaPast = realData.map((_, i) => Math.min(metaMes, metaAtual * ((i + 1) / Math.max(1, realData.length))));
      const metaFuture = futureLabels.map((_, i) => Math.min(metaMes, metaAtual + (metaMes - metaAtual) * ((i + 1) / Math.max(1, futureCount))));
      const metaData = [...metaPast, ...metaFuture];
      const saldo = Math.max(0, metaMes - n(d.produzidoAcumulado));
      const stepRec = futureCount > 0 ? saldo / futureCount : 0;
      const recoveryData = [
        ...realData.slice(0, -1).map(() => null),
        realData[realData.length - 1] ?? n(d.produzidoAcumulado),
        ...futureLabels.map((_, i) => Math.min(metaMes, n(d.produzidoAcumulado) + stepRec * (i + 1)))
      ];
      const realDataset = [...realData, ...futureLabels.map(() => null)];
      const maxY = Math.max(metaMes, ...realDataset.filter(v => v !== null), ...recoveryData.filter(v => v !== null), ...metaData) * 1.15 || 10000;
      return new Chart(canvas, {
        type: "line",
        data: {
          labels, datasets: [
            { label: "Real bruto", data: realDataset, borderColor: theme.destaque, backgroundColor: theme.destaque, borderWidth: 3, pointRadius: 3.5, tension: .25, shortLabel: "real" },
            { label: "Recuperação", data: recoveryData, borderColor: "#1E8A4C", backgroundColor: "#1E8A4C", borderWidth: 3, pointRadius: 3.5, borderDash: [7, 5], tension: .2, shortLabel: "rec." },
            { label: "Meta", data: metaData, borderColor: "#161B24", backgroundColor: "#161B24", borderWidth: 2.5, pointRadius: 2.8, borderDash: [5, 5], tension: 0, shortLabel: "meta" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: 22, right: 14, left: 4, bottom: 0 } },
          plugins: {
            legend: { display: true, position: "top", align: "end", labels: { boxWidth: 12, boxHeight: 3, color: "#3F4752", font: { size: 12, weight: "500" } } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: "#67707C", font: { size: 10, weight: "500" }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
            y: { beginAtZero: true, suggestedMax: maxY, grid: { color: "#E9ECF0" }, ticks: { color: "#67707C", font: { size: 10, weight: "500" }, callback: v => "R$ " + Math.round(v / 1000) + " mil" } }
          }
        },
        plugins: [tcLineLabelPlugin]
      });
    }
    function renderTeamCardChart(d) {
      if (teamCardChart) { teamCardChart.destroy(); teamCardChart = null; }
      const canvas = document.getElementById("tcEvolutionChart");
      if (!canvas) return;
      teamCardChart = createTeamCardChart(canvas, d, teamCardTheme);
    }
    function renderTeamCard() {
      const page = document.getElementById("teamCardPage");
      if (!page || !page.classList.contains("open")) return;
      const d = selectedTeamData();
      const paper = document.getElementById("teamCardPaper");
      if (!d || !paper) return;
      const meta = getCardMeta(d.equipe);
      applyTeamCardThemeVars();
      paper.innerHTML = teamCardInnerHtml(d, meta);
      applyTeamCardThemeVars();
      renderTeamCardChart(d);
      requestAnimationFrame(() => fitCardScale(".tc-main", "teamCardPaper"));
    }
    function fitCardScale(mainSelector, paperId) {
      const main = document.querySelector(mainSelector);
      const paper = document.getElementById(paperId);
      if (!main || !paper) return;
      const cs = getComputedStyle(main);
      const padX = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
      const avail = main.clientWidth - padX;
      paper.style.zoom = "";
      const naturalW = paper.offsetWidth;
      if (!avail || !naturalW) return;
      const scale = Math.min(1, avail / naturalW);
      paper.style.zoom = scale < 1 ? scale : "";
    }

    let __fitCardScaleRaf = null;
    function scheduleFitCardScale() {
      if (__fitCardScaleRaf) cancelAnimationFrame(__fitCardScaleRaf);
      __fitCardScaleRaf = requestAnimationFrame(() => {
        __fitCardScaleRaf = null;
        if (document.getElementById("teamCardPage")?.classList.contains("open"))
          fitCardScale(".tc-main", "teamCardPaper");
        if (document.getElementById("allTeamCardsPage")?.classList.contains("open"))
          fitCardScale(".atc-main", "allTeamCardsPaper");
      });
    }
    window.addEventListener("resize", scheduleFitCardScale);
    function nextFrame(count = 2) {
      return new Promise(resolve => {
        const step = () => {
          if (--count <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
    function waitForImages(root, timeout = 2200) {
      const imgs = Array.from(root?.querySelectorAll?.("img") || []);
      const pending = imgs.filter(img => !img.complete);
      if (!pending.length) return Promise.resolve();
      return new Promise(resolve => {
        let left = pending.length;
        let settled = false;
        const finish = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
        const done = () => { if (--left <= 0) finish(); };
        const timer = setTimeout(finish, timeout);
        pending.forEach(img => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      });
    }
    async function downloadTeamCardPng() {
      collectTeamCardEditor();
      renderTeamCard();
      if (!window.html2canvas) { alert("Biblioteca de geração PNG não carregada. Verifique a conexão e recarregue o arquivo."); return; }
      await new Promise(r => setTimeout(r, 250));
      const d = selectedTeamData();
      if (!d) { alert("Equipe não encontrada para gerar o PNG."); return; }
      const meta = getCardMeta(d.equipe);
      const exportStage = document.getElementById("teamCardExportStage");
      if (!exportStage) { alert("Área de exportação não encontrada."); return; }
      const exportChartId = "tcEvolutionChartExport";
      const exportHtml = teamCardInnerHtml(d, meta).replace('id="tcEvolutionChart"', `id="${exportChartId}"`);
      exportStage.innerHTML = `<div id="teamCardExportWrap" style="width:1220px;margin:0;padding:0;display:flex;justify-content:center;align-items:flex-start;background:${teamCardTheme.fundoInterno};"><section id="teamCardExportPaper" class="tc-paper" style="width:1220px;margin:0;box-shadow:none;border-radius:22px;overflow:hidden;background:${teamCardTheme.fundoInterno};border:1px solid #D8DCE2;">${exportHtml}</section></div>`;
      const exportWrap = document.getElementById("teamCardExportWrap");
      const exportPaper = document.getElementById("teamCardExportPaper");
      [exportWrap, exportPaper].forEach(el => {
        if (!el) return;
        el.style.setProperty("--tc-head-bg", teamCardTheme.topo);
        el.style.setProperty("--tc-accent", teamCardTheme.destaque);
        el.style.setProperty("--tc-paper-bg", teamCardTheme.fundoInterno);
        el.style.setProperty("--tc-page-bg", teamCardTheme.fundoTela);
        el.style.setProperty("--tc-border-color", teamCardTheme.borda || teamCardTheme.fundoInterno);
      });
      let exportChart = null;
      try {
        exportChart = createTeamCardChart(document.getElementById(exportChartId), d, teamCardTheme);
        await waitForImages(exportPaper);
        await nextFrame(4);
        const width = Math.ceil(exportWrap.scrollWidth);
        const height = Math.ceil(exportWrap.scrollHeight);
        const canvas = await html2canvas(exportWrap, { backgroundColor: teamCardTheme.fundoInterno, scale: 2.25, useCORS: true, allowTaint: false, imageTimeout: 0, removeContainer: true, logging: false, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: -window.scrollY });
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "card-acompanhamento-" + (selectedCardTeam || "equipe").replace(/\W+/g, "-") + ".png";
        a.click();
        saveLocalSilent();
      } catch (e) {
        console.error(e);
        alert("Não foi possível gerar o PNG. Atualize o arquivo e use somente fotos carregadas pelos botões Foto 1/Foto 2; imagens externas são bloqueadas para evitar canvas contaminado.");
      } finally {
        try { if (exportChart) exportChart.destroy(); } catch (_) { }
        exportStage.innerHTML = "";
      }
    }

    function applyAllTeamCardsThemeVars() {
      teamCardTheme = normalizeTeamCardTheme(teamCardTheme);
      const page = document.getElementById("allTeamCardsPage");
      const paper = document.getElementById("allTeamCardsPaper");
      [page, paper].forEach(el => {
        if (!el) return;
        el.style.setProperty("--tc-head-bg", teamCardTheme.topo);
        el.style.setProperty("--tc-accent", teamCardTheme.destaque);
        el.style.setProperty("--tc-paper-bg", teamCardTheme.fundoInterno);
        el.style.setProperty("--tc-page-bg", teamCardTheme.fundoTela);
        el.style.setProperty("--tc-border-color", teamCardTheme.borda || teamCardTheme.fundoInterno);
      });
    }
    function openAllTeamCards() {
      const page = document.getElementById("allTeamCardsPage");
      if (!page) return;
      const tcPage = document.getElementById("teamCardPage");
      if (tcPage) tcPage.classList.remove("open");
      if (!selectedCardTeam || !equipes.some(d => d.equipe === selectedCardTeam)) {
        const preferred = equipes[0];
        selectedCardTeam = preferred ? preferred.equipe : "";
      }
      applyAllTeamCardsThemeVars();
      page.classList.add("open");
      renderAllTeamCardsSelector();
      renderAllTeamCards();
    }
    function closeAllTeamCards() {
      const page = document.getElementById("allTeamCardsPage");
      if (page) page.classList.remove("open");
      if (typeof renderAll === "function") renderAll();
    }
    function renderAllTeamCardsSelector() {
      const select = document.getElementById("atcSelect");
      if (!select) return;
      select.innerHTML = equipes.map(item => `<option value="${escapeAttr(item.equipe)}">${escapeHtml(item.equipe)}</option>`).join("");
      if (selectedCardTeam) select.value = selectedCardTeam;
    }
    function selectAllTeamCard(eq) {
      selectedCardTeam = eq;
      renderAllTeamCardsSelector();
      renderAllTeamCards();
    }
    function stepAllTeamCard(delta) {
      const idx = Math.max(0, equipes.findIndex(item => item.equipe === selectedCardTeam));
      const next = (idx + delta + equipes.length) % equipes.length;
      selectedCardTeam = equipes[next]?.equipe || selectedCardTeam;
      renderAllTeamCardsSelector();
      renderAllTeamCards();
    }
    function renderAllTeamCardsInfo(d) {
      const box = document.getElementById("atcInfoBox");
      if (!box || !d) return;
      const diasRestantes = Math.max(0, n(config.diasUteisMes) - n(config.diasLancados));
      const saldoMeta = Math.max(0, n(d.metaMes) - n(d.produzidoAcumulado));
      const novaMetaDia = diasRestantes > 0 ? saldoMeta / diasRestantes : 0;
      const melhorarDia = Math.max(0, novaMetaDia - n(d.metaDia));
      const pctAcum = d.metaAcumulada > 0 ? d.produzidoAcumulado / d.metaAcumulada : 0;
      const desvioCls = d.desvioAcumulado >= 0 ? "pos" : "neg";
      box.innerHTML = `<div class="atc-info-grid">
    <div class="atc-info-item"><small>Equipe</small><b>${escapeHtml(d.equipe)}</b></div>
    <div class="atc-info-item"><small>Status</small><b>${escapeHtml(d.status.text)}</b></div>
    <div class="atc-info-item"><small>Produzido acum.</small><b>${money(d.produzidoAcumulado)}</b></div>
    <div class="atc-info-item"><small>Desvio acum.</small><b class="${desvioCls}">${money(d.desvioAcumulado)}</b></div>
    <div class="atc-info-item"><small>Nova meta/dia</small><b>${money(novaMetaDia)}</b></div>
    <div class="atc-info-item"><small>Melhorar/dia</small><b>${money(melhorarDia)}</b></div>
  </div>`;
    }
    function operationalCardInnerHtml(d) {
      const meta = getCardMeta(d.equipe);
      const diasRestantes = Math.max(0, n(config.diasUteisMes) - n(config.diasLancados));
      const saldoMeta = Math.max(0, n(d.metaMes) - n(d.produzidoAcumulado));
      const novaMetaDia = diasRestantes > 0 ? saldoMeta / diasRestantes : 0;
      const melhorarDia = Math.max(0, novaMetaDia - n(d.metaDia));
      const pctMes = d.metaMes > 0 ? d.produzidoAcumulado / d.metaMes : 0;
      const pctAcum = d.metaAcumulada > 0 ? d.produzidoAcumulado / d.metaAcumulada : 0;
      const st = fichaSituacao(d);
      const ref = escapeHtml(config.dataReferencia || "");
      const base = escapeHtml(meta.base || baseFromTeam(d.equipe));
      const servico = escapeHtml(meta.servico || serviceFromTeam(d.equipe));
      const planoHoje = saldoMeta <= 0
        ? "Meta do mês atingida. A produção até o fechamento soma acima do previsto."
        : d.desvioAcumulado < 0
          ? `Para fechar a meta do mês, a equipe precisa de ${money(novaMetaDia)} por dia útil restante, ${money(melhorarDia)} acima da meta diária.`
          : `Equipe acima da meta até hoje. Manter o ritmo de pelo menos ${money(novaMetaDia)} por dia útil até o fechamento.`;
      return `<div class="fx fx-oper">
  <header class="fx-topo">
    <div class="fx-topo-id">
      <small>${escapeHtml(cfgText("textoCardOperacional", "Resumo para a equipe de campo"))} · ${escapeHtml(fichaContrato())}</small>
      <strong>${escapeHtml(d.equipe)}</strong>
      <span>${base} · ${servico}</span>
    </div>
    <div class="fx-topo-dir">
      <span class="fx-sit ${st}">${escapeHtml(d.status.text)}</span>
      <div class="fx-ref"><small>Referência</small><b>${ref}</b></div>
    </div>
  </header>
  <table class="fx-faixa">
    <thead><tr><th>Meta do mês</th><th>Produzido</th><th>Desvio acumulado</th><th>Necessário por dia</th></tr></thead>
    <tbody><tr>
      <td>${money(d.metaMes)}<small>${money(d.metaDia)} por dia útil</small></td>
      <td>${money(d.produzidoAcumulado)}<small>${percent(pctMes)} da meta do mês</small></td>
      <td class="${d.desvioAcumulado >= 0 ? "pos" : "neg"}">${money(d.desvioAcumulado)}<small>${percent(pctAcum)} da meta até hoje</small></td>
      <td class="${novaMetaDia > n(d.metaDia) ? "neg" : ""}">${money(novaMetaDia)}<small>${diasRestantes} dias úteis restantes</small></td>
    </tr></tbody>
  </table>
  <section class="fx-avanco">
    <div class="fx-avanco-num"><b class="${st}">${percent(pctMes)}</b><span>da meta do mês</span></div>
    <div class="fx-avanco-regua">
      ${fichaRegua(d, st)}
      <div class="fx-avanco-leg"><span>${money(d.produzidoAcumulado)} de ${money(d.metaMes)}</span><span>traço: meta esperada até ${ref}</span></div>
    </div>
  </section>
  <div class="fx-grade">
    <section class="fx-bloco">
      <h3>Detalhe</h3>
      <table class="fx-tab">
        <tbody>
          <tr><th>Meta até hoje</th><td>${money(d.metaAcumulada)}</td></tr>
          <tr><th>Produção do dia</th><td>${money(d.produzidoDia)}</td></tr>
          <tr><th>Saldo para a meta</th><td class="${saldoMeta > 0 ? "neg" : ""}">${money(saldoMeta)}</td></tr>
          <tr><th>Dias úteis restantes</th><td>${diasRestantes}</td></tr>
          <tr><th>Meta diária</th><td>${money(d.metaDia)}</td></tr>
          <tr><th>Acima da meta diária</th><td class="${melhorarDia > 0 ? "neg" : ""}">${money(melhorarDia)}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="fx-bloco">
      <h3>Produção acumulada e o necessário até o fim do mês</h3>
      <div class="fx-grafico"><canvas id="atcOperationalChart"></canvas></div>
    </section>
  </div>
  <section class="fx-plano"><b>Plano do dia</b><span>${escapeHtml(planoHoje)}</span></section>
  <footer class="fx-rodape"><span>${escapeHtml(fichaContrato())} · ${base}</span><span>Valores brutos em reais</span></footer>
</div>`;
    }
    function createOperationalTeamChart(canvas, d, chartId = "atcOperationalChart") {
      if (!canvas) return null;
      if (!window.Chart) {
        canvas.outerHTML = '<div class="tc-empty-chart">Gráfico indisponível: verifique a conexão e recarregue o arquivo.</div>';
        return null;
      }
      const series = getTeamEvolutionSeries(d);
      const labelsBase = series.map(s => s.label);
      const realData = series.map(s => Math.max(0, n(s.value)));
      const diasMes = Math.max(1, n(config.diasUteisMes) || 21);
      const diasLancados = Math.max(1, Math.min(diasMes, n(config.diasLancados) || realData.length || 1));
      const diasRestantes = Math.max(0, diasMes - diasLancados);
      const futureCount = diasRestantes;
      const futureLabels = Array.from({ length: futureCount }, (_, i) => i === futureCount - 1 ? "Fim mês" : "D+" + (i + 1));
      const labels = [...labelsBase, ...futureLabels];
      const metaMes = Math.max(0, n(d.metaMes));
      const metaAtual = Math.min(metaMes, n(d.metaAcumulada) || (metaMes / diasMes) * diasLancados);
      const saldoMeta = Math.max(0, metaMes - n(d.produzidoAcumulado));
      const novaMetaDia = futureCount > 0 ? saldoMeta / futureCount : 0;
      const recoveryData = [
        ...realData.slice(0, -1).map(() => null),
        realData[realData.length - 1] ?? n(d.produzidoAcumulado),
        ...futureLabels.map((_, i) => Math.min(metaMes, n(d.produzidoAcumulado) + novaMetaDia * (i + 1)))
      ];
      const metaPast = realData.map((_, i) => Math.min(metaMes, metaAtual * ((i + 1) / Math.max(1, realData.length))));
      const metaFuture = futureLabels.map((_, i) => Math.min(metaMes, metaAtual + (metaMes - metaAtual) * ((i + 1) / Math.max(1, futureCount))));
      const metaData = [...metaPast, ...metaFuture];
      const realDataset = [...realData, ...futureLabels.map(() => null)];
      const maxY = Math.max(metaMes, n(d.produzidoAcumulado), ...recoveryData.filter(v => v !== null), ...metaData) * 1.14 || 10000;
      return new Chart(canvas, {
        type: "line",
        data: {
          labels, datasets: [
            { label: "Real acumulado", data: realDataset, borderColor: teamCardTheme.destaque, backgroundColor: teamCardTheme.destaque, borderWidth: 3.5, pointRadius: 3, tension: .25, shortLabel: "real" },
            { label: "Necessário", data: recoveryData, borderColor: "#1E8A4C", backgroundColor: "#1E8A4C", borderWidth: 3.5, pointRadius: 3, borderDash: [7, 5], tension: .18, shortLabel: "meta nova" },
            { label: "Meta planejada", data: metaData, borderColor: "#161B24", backgroundColor: "#161B24", borderWidth: 2.4, pointRadius: 2, borderDash: [5, 5], tension: 0, shortLabel: "meta" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: 16, right: 10, left: 4, bottom: 0 } },
          plugins: {
            legend: { display: true, position: "top", align: "end", labels: { boxWidth: 12, boxHeight: 3, color: "#3F4752", font: { size: 12, weight: "500" } } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: "#67707C", font: { size: 10, weight: "500" }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
            y: { beginAtZero: true, suggestedMax: maxY, grid: { color: "#E9ECF0" }, ticks: { color: "#67707C", font: { size: 10, weight: "500" }, callback: v => "R$ " + Math.round(v / 1000) + " mil" } }
          }
        },
        plugins: [tcLineLabelPlugin]
      });
    }
    function allTeamCardsInnerHtml() {
      const d = selectedTeamData();
      if (!d) return `<div class="tc-empty-chart">Nenhuma equipe encontrada.</div>`;
      return operationalCardInnerHtml(d);
    }
    function renderAllTeamCards() {
      const page = document.getElementById("allTeamCardsPage");
      const paper = document.getElementById("allTeamCardsPaper");
      const d = selectedTeamData();
      if (!page || !paper || !d) return;
      if (allTeamCardsPreviewChart) { try { allTeamCardsPreviewChart.destroy(); } catch (_) { } allTeamCardsPreviewChart = null; }
      applyAllTeamCardsThemeVars();
      renderAllTeamCardsSelector();
      renderAllTeamCardsInfo(d);
      paper.innerHTML = allTeamCardsInnerHtml();
      applyAllTeamCardsThemeVars();
      allTeamCardsPreviewChart = createOperationalTeamChart(document.getElementById("atcOperationalChart"), d);
      requestAnimationFrame(() => fitCardScale(".atc-main", "allTeamCardsPaper"));
    }
    async function downloadAllTeamCardsPng() {
      const d = selectedTeamData();
      if (!d) { alert("Equipe não encontrada para gerar o PNG."); return; }
      if (!window.html2canvas) { alert("Biblioteca de geração PNG não carregada. Verifique a conexão e recarregue o arquivo."); return; }
      const stage = document.getElementById("allTeamCardsExportStage");
      if (!stage) { alert("Área de exportação não encontrada."); return; }
      let exportChart = null;
      try {
        const html = operationalCardInnerHtml(d).replace('id="atcOperationalChart"', 'id="atcOperationalExportChart"');
        stage.innerHTML = `<div id="allTeamCardsExportWrap" style="width:1220px;margin:0;padding:0;background:${teamCardTheme.fundoInterno};display:flex;justify-content:center;align-items:flex-start;"><section id="allTeamCardsExportPaper" class="atc-paper" style="width:1220px;margin:0;box-shadow:none;border-radius:22px;overflow:hidden;background:${teamCardTheme.fundoInterno};border:1px solid #D8DCE2;">${html}</section></div>`;
        const wrap = document.getElementById("allTeamCardsExportWrap");
        const paper = document.getElementById("allTeamCardsExportPaper");
        [wrap, paper].forEach(el => {
          if (!el) return;
          el.style.setProperty("--tc-head-bg", teamCardTheme.topo);
          el.style.setProperty("--tc-accent", teamCardTheme.destaque);
          el.style.setProperty("--tc-paper-bg", teamCardTheme.fundoInterno);
          el.style.setProperty("--tc-page-bg", teamCardTheme.fundoTela);
          el.style.setProperty("--tc-border-color", teamCardTheme.borda || teamCardTheme.fundoInterno);
        });
        exportChart = createOperationalTeamChart(document.getElementById("atcOperationalExportChart"), d);
        await nextFrame(4);
        const width = Math.ceil(wrap.scrollWidth);
        const height = Math.ceil(wrap.scrollHeight);
        const canvas = await html2canvas(wrap, { backgroundColor: teamCardTheme.fundoInterno, scale: 2.25, useCORS: true, allowTaint: false, imageTimeout: 0, removeContainer: true, logging: false, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: -window.scrollY });
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "card-operacional-" + String(d.equipe || "equipe").replace(/\W+/g, "-") + "-" + String(config.dataReferencia || "").replace(/\W+/g, "-") + ".png";
        a.click();
        saveLocalSilent();
      } catch (e) {
        console.error(e);
        alert("Não foi possível gerar o PNG individual da equipe. Recarregue o arquivo e tente novamente.");
      } finally {
        try { if (exportChart) exportChart.destroy(); } catch (_) { }
        stage.innerHTML = "";
      }
    }

    async function downloadAllTeamCardsPngAll() {
      if (!window.html2canvas) { alert("Biblioteca de geração PNG não carregada. Verifique a conexão e recarregue o arquivo."); return; }
      if (!window.JSZip) { alert("Biblioteca JSZip não carregada. Verifique a conexão e recarregue a página."); return; }
      const teams = data().list;
      if (!teams || teams.length === 0) { alert("Nenhuma equipe disponível."); return; }
      const stage = document.getElementById("allTeamCardsExportStage");
      if (!stage) { alert("Área de exportação não encontrada."); return; }
      const btnAll = document.getElementById("atcDownloadAllBtn");
      const total = teams.length;
      const zip = new JSZip();
      const pasta = zip.folder("cards-operacionais");
      let success = 0, fail = 0;
      for (let i = 0; i < teams.length; i++) {
        const d = teams[i];
        if (!d) continue;
        if (btnAll) btnAll.textContent = "Gerando " + (i + 1) + "/" + total + "...";
        let exportChart = null;
        try {
          const html = operationalCardInnerHtml(d).replace('id="atcOperationalChart"', 'id="atcOperationalExportChart"');
          stage.innerHTML = '<div id="allTeamCardsExportWrap" style="width:1220px;margin:0;padding:0;background:' + teamCardTheme.fundoInterno + ';display:flex;justify-content:center;align-items:flex-start;"><section id="allTeamCardsExportPaper" class="atc-paper" style="width:1220px;margin:0;box-shadow:none;border-radius:22px;overflow:hidden;background:' + teamCardTheme.fundoInterno + ';border:1px solid #D8DCE2;">' + html + '</section></div>';
          const wrap = document.getElementById("allTeamCardsExportWrap");
          const paper = document.getElementById("allTeamCardsExportPaper");
          [wrap, paper].forEach(function (el) {
            if (!el) return;
            el.style.setProperty("--tc-head-bg", teamCardTheme.topo);
            el.style.setProperty("--tc-accent", teamCardTheme.destaque);
            el.style.setProperty("--tc-paper-bg", teamCardTheme.fundoInterno);
            el.style.setProperty("--tc-page-bg", teamCardTheme.fundoTela);
            el.style.setProperty("--tc-border-color", teamCardTheme.borda || teamCardTheme.fundoInterno);
          });
          exportChart = createOperationalTeamChart(document.getElementById("atcOperationalExportChart"), d);
          await nextFrame(4);
          const width = Math.ceil(wrap.scrollWidth);
          const height = Math.ceil(wrap.scrollHeight);
          const canvas = await html2canvas(wrap, { backgroundColor: teamCardTheme.fundoInterno, scale: 2.25, useCORS: true, allowTaint: false, imageTimeout: 0, removeContainer: true, logging: false, width: width, height: height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: -window.scrollY });
          const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
          const filename = "card-operacional-" + String(d.equipe || "equipe").replace(/\W+/g, "-") + ".png";
          pasta.file(filename, blob);
          success++;
        } catch (e) {
          fail++;
          console.error("Erro ao gerar PNG para " + (d.equipe || "?"), e);
        } finally {
          try { if (exportChart) exportChart.destroy(); } catch (_) { }
          stage.innerHTML = "";
        }
      }
      if (btnAll) btnAll.textContent = "Compactando ZIP...";
      try {
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        const dataRef = String(config.dataReferencia || "").replace(/\W+/g, "-") || "export";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(zipBlob);
        a.download = "cards-operacionais-" + dataRef + ".zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
        if (fail) alert(success + " PNG(s) adicionados ao ZIP, " + fail + " com erro.");
      } catch (e) {
        console.error("Erro ao gerar ZIP:", e);
        alert("Erro ao compactar o ZIP. Verifique o console.");
      }
      if (btnAll) btnAll.textContent = "Baixar PNG todas equipes";
    }

    function captureInnerHtml() {
      return `
    <header class="titlebar">
      <div class="logo-marca"><span class="ap">Painel</span><span class="plus">de Produtividade</span></div>
      <span class="title-text">${escapeHtml(dashboardTitle())}</span>
      <div class="title-date">${escapeHtml(reportLabel())} • ${escapeHtml(config.dataReferencia || "")}</div>
    </header>
    <section class="kpis" id="capKpis"></section>
    <section class="main">
      <section class="panel">
        <div class="panel-head"><span>Desempenho por equipe</span><small id="capCountMain"></small></div>
        <div class="panel-body"><div class="table-wrap"><table class="table" id="capTable"></table></div></div>
      </section>
      <section class="right">
        <section class="panel">
          <div class="panel-head"><span>Ranking por desvio acumulado</span><small>Acima da meta x abaixo da meta</small></div>
          <div class="panel-body"><div class="rank-legend"><span><i class="legend-dot" style="background:var(--green)"></i>Acima da meta</span><span><i class="legend-dot" style="background:var(--orange)"></i>Abaixo da meta</span></div><div class="chart-box with-legend"><canvas id="capRanking"></canvas></div></div>
        </section>
        <section class="panel">
          <div class="panel-head"><span>Distribuição de status</span><small id="capStatusTotal"></small></div>
          <div class="panel-body"><div class="status-box"><div class="chart-box"><canvas id="capStatus"></canvas></div><div class="status-list"><div class="status-line"><span><i class="dot" style="background:var(--green)"></i>EXCELENTE</span><b id="capOk"></b></div><div class="status-line"><span><i class="dot" style="background:var(--orange2)"></i>ATENÇÃO</span><b id="capAtt"></b></div><div class="status-line"><span><i class="dot" style="background:var(--red)"></i>ALERTA</span><b id="capAlr"></b></div></div></div></div>
        </section>
      </section>
    </section>
    <section class="bottom">
      <section class="panel"><div class="panel-head"><span>Produção dia · total geral</span><small>R$ mil</small></div><div class="panel-body"><div class="chart-box"><canvas id="capHistorico"></canvas></div></div></section>
      <section class="panel"><div class="panel-head"><span>Produzido dia por equipe</span><small>${escapeHtml(config.dataReferencia)}</small></div><div class="panel-body"><div class="chart-box"><canvas id="capEquipeDia"></canvas></div></div></section>
      <section class="panel"><div class="panel-head"><span>Desempenho geral</span><small>Acumulado</small></div><div class="panel-body"><div class="chart-box"><canvas id="capGauge"></canvas></div></div></section>
    </section>`;
    }

    function captureTeamSelection(list, sorted) {
      const allList = Array.isArray(list) ? list : [];
      const allSorted = Array.isArray(sorted) ? sorted : [];
      if (allList.length <= 30) {
        return {
          list: [...allList],
          sorted: [...allSorted],
          limited: false,
          label: allList.length + " equipes"
        };
      }
      const selected = [];
      const seen = new Set();
      [...allSorted.slice(0, 10), ...allSorted.slice(-10)].forEach(item => {
        const key = String(item && item.idx != null ? item.idx : item && item.equipe || "");
        if (!item || seen.has(key)) return;
        seen.add(key);
        selected.push(item);
      });
      selected.sort((a, b) => b.desvioAcumuladoPct - a.desvioAcumuladoPct);
      return {
        list: [...selected],
        sorted: [...selected],
        limited: true,
        label: selected.length + " de " + allList.length + " equipes · 10 melhores + 10 piores"
      };
    }

    function adjustCaptureCardForTeamCount(teamCountInput = null) {
      const card = document.getElementById("captureCard");
      if (!card) return 900;
      let teamCount = Number(teamCountInput);
      if (!Number.isFinite(teamCount) || teamCount <= 0) {
        teamCount = Number(card.dataset.captureTeamCount || 0);
      }
      teamCount = Math.max(1, teamCount);

      const compact = teamCount > 24;
      const rowHeight = compact ? 15 : 20;
      const fontSize = compact ? 7.6 : 8.8;
      const headHeight = Math.max(18, rowHeight);
      const footHeight = Math.max(22, rowHeight + 4);

      card.classList.add("pp-capture-fit-all-teams");
      card.dataset.captureTeamCount = String(teamCount);
      card.style.setProperty("--cap-row-height", rowHeight + "px");
      card.style.setProperty("--cap-head-height", headHeight + "px");
      card.style.setProperty("--cap-foot-height", footHeight + "px");
      card.style.setProperty("--cap-cell-pad-y", compact ? "1px" : "2px");
      card.style.setProperty("--cap-font-size", fontSize + "px");
      card.style.setProperty("--cap-head-font-size", Math.max(7.2, fontSize - .7) + "px");
      card.style.setProperty("--cap-foot-font-size", Math.max(8.0, fontSize + .2) + "px");
      card.style.setProperty("--cap-main-height", "568px");
      card.style.setProperty("--cap-bottom-height", "184px");

      const table = document.getElementById("capTable");
      const measuredTableHeight = table ? Math.ceil(table.getBoundingClientRect().height) : 0;
      const trackBudget = 736;
      const minBottomHeight = 160;
      const measuredMainHeight = measuredTableHeight + 38;
      const mainHeight = Math.max(460, Math.min(trackBudget - minBottomHeight, measuredMainHeight));
      const bottomHeight = trackBudget - mainHeight;
      const fullHeight = 900;

      card.style.setProperty("--cap-main-height", mainHeight + "px");
      card.style.setProperty("--cap-bottom-height", bottomHeight + "px");
      card.style.setProperty("--cap-card-height", fullHeight + "px");
      card.style.height = fullHeight + "px";
      card.style.width = "1600px";
      card.style.gridTemplateRows = `36px 88px ${mainHeight}px ${bottomHeight}px`;
      return fullHeight;
    }

    function renderCapture(open = true) {
      const { list, sorted, total } = data();
      const captureTeams = captureTeamSelection(list, sorted);
      const card = document.getElementById("captureCard");
      destroyCharts(captureCharts);
      card.innerHTML = captureInnerHtml();
      renderKpis(document.getElementById("capKpis"), total);
      document.getElementById("capTable").innerHTML = tableHtml(captureTeams.sorted, total);
      document.getElementById("capCountMain").textContent = captureTeams.label;
      document.getElementById("capStatusTotal").textContent = list.length + " equipes";
      document.getElementById("capOk").textContent = `${total.status["EXCELENTE"]} equipe(s)`;
      document.getElementById("capAtt").textContent = `${total.status["ATENÇÃO"]} equipe(s)`;
      document.getElementById("capAlr").textContent = `${total.status["ALERTA"]} equipe(s)`;
      adjustCaptureCardForTeamCount(captureTeams.list.length);
      renderCharts("cap", captureTeams.list, captureTeams.sorted, total, captureCharts);
      if (open) document.getElementById("captureBg").classList.add("open");
    }

    async function openCapture(download = false) {
      document.getElementById("captureBg").classList.add("open");
      renderCapture(false);
      if (download) {
        await new Promise(r => setTimeout(r, 450));
        await downloadCapture();
      }
    }
    function closeCapture() {
      document.getElementById("captureBg").classList.remove("open");
      destroyCharts(captureCharts);
    }
    async function downloadCapture() {
      if (!window.html2canvas) { alert("Biblioteca de geração PNG não carregada. Verifique a conexão e recarregue o arquivo."); return; }
      renderCapture(false);
      await new Promise(r => setTimeout(r, 250));
      const card = document.getElementById("captureCard");
      const captureHeight = adjustCaptureCardForTeamCount();
      await nextFrame(3);
      try {
        const captureWidth = Math.ceil(card.scrollWidth || 1600);
        const finalHeight = Math.ceil(Math.max(captureHeight || 900, card.scrollHeight || 900));
        const canvas = await html2canvas(card, { backgroundColor: "#F2F3F5", scale: 2.25, width: captureWidth, height: finalHeight, windowWidth: captureWidth, windowHeight: finalHeight, useCORS: true, allowTaint: false, imageTimeout: 0, removeContainer: true, logging: false, scrollX: 0, scrollY: -window.scrollY });
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "card-diario-pp-" + (config.dataReferencia || "data").replace(/\W+/g, "-") + ".png";
        a.click();
      } catch (e) {
        console.error(e);
        alert("Não foi possível gerar o PNG. O painel não usa imagens externas; se o erro persistir, atualize a página e tente novamente.");
      }
    }

    function calcTotalsFromState(state, projectId) {
      const rows = Array.isArray(state.equipes) ? state.equipes : [];
      const acc = rows.reduce((acc, d) => {
        acc.metaMes += n(d.metaMes);
        acc.metaDia += n(d.metaDia);
        acc.metaAcumulada += n(d.metaAcumulada);
        acc.produzidoDia += n(d.produzidoDia);
        acc.produzidoAcumulado += n(d.produzidoAcumulado);
        return acc;
      }, { metaMes: 0, metaDia: 0, metaAcumulada: 0, produzidoDia: 0, produzidoAcumulado: 0 });

      try {
        if (typeof window.ppMetaAcumuladaDoEstado === "function") {
          const pid = projectId || state.projectId || "__contrato_desconhecido__";
          const ref = String((state.config || {}).dataReferencia || "").trim();
          const m = ref.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m) {
            const mesChave = m[3] + "-" + String(Number(m[2])).padStart(2, "0");
            const calc = window.ppMetaAcumuladaDoEstado(state, mesChave, Number(m[1]), pid);
            if (calc !== null && isFinite(calc) && calc > 0) acc.metaAcumulada = calc;
          }
        }
      } catch (e) { }

      return acc;
    }
    function execStatusFromDiff(real, target) {
      real = n(real); target = n(target);
      if (!target) return real > 0 ? "green" : "yellow";
      const r = real / target;
      if (r >= 1) return "green";
      if (r >= .95) return "yellow";
      return "red";
    }
    function execStatusFromMargin(revenue, costs) {
      const e = n(revenue) - n(costs);
      const m = n(revenue) ? e / n(revenue) : 0;
      if (m >= .08) return "green";
      if (m >= .03) return "yellow";
      return "red";
    }
    function buildExecutiveTeamCards() {
      const items = [];
      PROJECTS.forEach(project => {
        const state = loadStoredProjectState(project.id);
        const cards = state.teamCards || {};
        Object.keys(cards).forEach(teamKey => {
          const card = cards[teamKey] || {};
          const equipe = (state.equipes || []).find(e => String(e.equipe || '').toUpperCase() === String(teamKey || '').toUpperCase() || String(e.equipe || '').toUpperCase() === String(card.nomeEquipe || '').toUpperCase()) || {};
          const metaAcum = n(equipe.metaAcumulada);
          const prodAcum = n(equipe.produzidoAcumulado);
          items.push({
            projectId: project.id,
            project: project.nome,
            team: teamKey,
            display: card.nomeEquipe || teamKey,
            status: card.status || 'Aberto',
            lider: card.lider || '',
            supervisor: card.supervisor || '',
            responsavel: card.responsavel || '',
            dataAcao: card.dataAcao || state.config?.dataReferencia || '',
            prazo: card.prazo || '',
            updatedAt: state.lastUpdatedAt || state.config?.financeiroExecutivo?.dataHoraAtualizacao || '',
            diagnostico: card.diagnostico || '',
            acao: card.acao || '',
            resultado: card.resultado || '',
            metaDia: n(equipe.metaDia),
            metaMes: n(equipe.metaMes),
            produzidoDia: n(equipe.produzidoDia),
            produzidoAcumulado: prodAcum,
            desvioAcumulado: prodAcum - metaAcum,
            fotos: Array.isArray(card.fotos) ? card.fotos.filter(Boolean).slice(0, 2) : []
          });
        });
      });
      return items;
    }
    window.ppExecutiveBridge = { getExecutiveDb: () => clone(buildExecutiveDb()) };

    const PROJECT_CHECK_REGISTRY_KEY = "pp.project.update.checks.v1";
    function readJsonKeySafe(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    }
    function writeJsonKeySafe(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { } }
    function readProjectCheckRegistry() { return readJsonKeySafe(PROJECT_CHECK_REGISTRY_KEY, {}); }
    function writeProjectCheckRegistry(reg) { writeJsonKeySafe(PROJECT_CHECK_REGISTRY_KEY, reg || {}); }
    function syncCurrentProjectCheckToRegistry() {
      const fin = (config && config.financeiroExecutivo) || {};
      const reg = readProjectCheckRegistry();
      if (fin.checkAtualizado) {
        reg[currentProjectId] = { checked: true, updatedAt: fin.dataHoraAtualizacao || new Date().toISOString(), projectId: currentProjectId };
      } else if (reg[currentProjectId]) {
        reg[currentProjectId] = { ...(reg[currentProjectId] || {}), checked: false };
      }
      writeProjectCheckRegistry(reg);
    }
    function logoutApp() {
      try { if (typeof window.ppHideLoading === 'function') window.ppHideLoading(); } catch (e) { }
      ["modalBg", "teamCardPage", "allTeamCardsPage", "captureBg"].forEach(id => document.getElementById(id)?.classList.remove("open"));
      document.body.classList.remove("executive-mode");
      const frame = document.getElementById("executiveFrame"); if (frame) { frame.onload = null; frame.src = "about:blank"; }
      document.body.classList.add("app-locked");
      const error = document.getElementById("loginError");
      if (error) error.textContent = "";
    }
    const __ppRenderAll = renderAll;
    renderAll = function () {
      __ppRenderAll();
    };

    function ppPatchApplyLogo() {
      try {
        const logoUrl = getComputedStyle(document.documentElement).getPropertyValue('--pp-logo-url');
        document.querySelectorAll('.logo-marca,.login-logo').forEach(el => {
          el.setAttribute('aria-label', 'Painel de Produtividade');
          el.querySelectorAll('span').forEach(s => s.style.display = 'none');
        });
      } catch (e) { }
    }
    const __patchCollectFinanceEditor = collectFinanceEditor;
    collectFinanceEditor = function () {
      const before = (config && config.financeiroExecutivo) ? config.financeiroExecutivo.dataHoraAtualizacao : "";
      __patchCollectFinanceEditor();
      if (config.financeiroExecutivo && config.financeiroExecutivo.checkAtualizado && !config.financeiroExecutivo.dataHoraAtualizacao) {
        config.financeiroExecutivo.dataHoraAtualizacao = before || new Date().toISOString();
      }
    };
    window.addEventListener('DOMContentLoaded', ppPatchApplyLogo);

    (function () {
      const oldLoginApp = (typeof loginApp !== 'undefined') ? loginApp : null;
      loginApp = function (event) {
        const ret = oldLoginApp ? oldLoginApp(event) : undefined;
        const pill = document.getElementById("currentProjectPill");
        if (pill) {
          if (document.body.classList.contains("executive-mode")) pill.textContent = "Acompanhamento gerencial";
          else if (currentProjectId && projectById(currentProjectId)) pill.textContent = `${projectById(currentProjectId).nome}`;
        }
        return ret;
      };
    })();

    const PP_MAIN_PROJECT_ID = "contrato-alfa";
    const PP_RESET_NON_MAIN_KEY = "pp.reset.non.main.projects.2026-06-28.v1";
    function ppZeroFinance() {
      return {
        _init: true,
        budgetAno: 0,
        forecastAtual: 0,
        projecaoProducao: 0,
        ytd: 0,
        ytg: 0,
        backlog: 0,
        custosAtuais: 0,
        custosFechamento: 0,
        avancoFisicoPlanejado: 0,
        avancoFisicoReal: 0,
        receitaLiquidaProjetada: 0,
        custosProjetados: 0,
        ebitdaForecastMeta: 0,
        checkAtualizado: false,
        dataHoraAtualizacao: "",
        observacaoExecutiva: "Aguardando alimentação do painel operacional do projeto."
      };
    }
    function ppZeroRows(rows) {
      return (Array.isArray(rows) ? rows : []).map(row => ({
        ...row,
        metaMes: 0,
        metaAcumulada: 0,
        metaDia: 0,
        produzidoDia: 0,
        produzidoAcumulado: 0
      }));
    }
    function ppZeroProjectState(projectId) {
      const p = projectById(projectId);
      const cfg = projectConfig(p);
      cfg.financeiroExecutivo = ppZeroFinance();
      cfg.diasLancados = 0;
      cfg.dataReferencia = "";
      return {
        config: cfg,
        equipes: ppZeroRows(EQUIPES_ORIGINAIS),
        historico: [],
        teamCards: {},
        teamCardTheme: clone(TEAM_CARD_THEME_ORIGINAL)
      };
    }
    const __baseDefaultFinanceForProject = defaultFinanceForProject;
    defaultFinanceForProject = function (projectId) {
      return projectId === PP_MAIN_PROJECT_ID ? __baseDefaultFinanceForProject(projectId) : ppZeroFinance();
    };
    const __baseDefaultProjectState = defaultProjectState;
    defaultProjectState = function (projectId = currentProjectId) {
      return projectId === PP_MAIN_PROJECT_ID ? __baseDefaultProjectState(projectId) : ppZeroProjectState(projectId);
    };
    function ppTotalHasData(t) {
      return !!(n(t.metaMes) || n(t.metaAcumulada) || n(t.metaDia) || n(t.produzidoDia) || n(t.produzidoAcumulado));
    }
    function ppProjectionFromOperational(totals, cfg) {
      const produced = n(totals.produzidoAcumulado);
      const business = Math.max(n(cfg.diasUteisMes), 0);
      const worked = Math.max(n(cfg.diasLancados), 0);
      if (!business) return produced;
      const remaining = Math.max(business - worked, 0);
      const avg = worked > 0 ? produced / worked : n(totals.produzidoDia);
      return round2(produced + remaining * Math.max(avg, 0));
    }
    function ppZeroExecutiveProject(project) {
      const meta = executiveProjectMeta(project.id) || {};
      return {
        id: project.id,
        name: meta.name || project.nome,
        short: project.nome,
        region: meta.region || "BR",
        contract: meta.contract || project.nome,
        manager: meta.manager || "Gerência do contrato",
        budgetAno: 0,
        forecast: 0,
        accumForecast: 0,
        accumReal: 0,
        dailyForecast: 0,
        dailyReal: 0,
        dailyRealBruto: 0,
        currentRevenue: 0,
        currentCosts: 0,
        closeRevenue: 0,
        closeCosts: 0,
        physicalPlan: 0,
        physicalReal: 0,
        ytdEbitda: 0,
        ytg: 0,
        backlog: 0,
        checkUpdated: false,
        lastUpdatedAt: "",
        lastUpdateLabel: "Sem dados",
        acumStatus: "yellow",
        dayStatus: "yellow",
        actualStatus: "yellow",
        closeStatus: "yellow",
        risk: "Sem dados",
        note: "Projeto zerado. Será atualizado automaticamente quando o painel operacional receber dados e for salvo."
      };
    }
    function ppAllowedExecProjects() {
      return PROJECTS;
    }
    const __baseCollectEditor = collectEditor;
    collectEditor = function () {
      __baseCollectEditor();
      try {
        const totals = data().total;
        config.financeiroExecutivo = { ...(config.financeiroExecutivo || {}), _init: true };
        if (!n(config.financeiroExecutivo.ytd)) config.financeiroExecutivo.ytd = totals.produzidoAcumulado;
        if (!n(config.financeiroExecutivo.forecastAtual)) config.financeiroExecutivo.forecastAtual = totals.metaMes;
        if (!n(config.financeiroExecutivo.budgetAno)) config.financeiroExecutivo.budgetAno = totals.metaMes;
        config.financeiroExecutivo.projecaoProducao = ppProjectionFromOperational(totals, config);
        config.financeiroExecutivo.ytg = Math.max(n(config.financeiroExecutivo.projecaoProducao) - n(totals.produzidoAcumulado), 0);
        config.financeiroExecutivo.backlog = Math.max(n(config.financeiroExecutivo.forecastAtual) - n(totals.produzidoAcumulado), 0);
      } catch (e) { }
    };
    const __baseLoginApp = loginApp;
    loginApp = function (event) {
      const ret = __baseLoginApp(event);
      try {
        const pill = document.getElementById("currentProjectPill");
        if (pill) {
          if (document.body.classList.contains("executive-mode")) pill.textContent = "Acompanhamento Gerencial";
          else if (currentProjectId && projectById(currentProjectId)) pill.textContent = `${projectById(currentProjectId).nome}`;
        }
      } catch (e) { }
      return ret;
    };

    const PP_COPYRIGHT = "© 2026 Painel de Produtividade · Todos os direitos reservados.";
    const PP_FIRESTORE_ROOT = "painel_produtividade";
    const PP_FIREBASE_STATE = { enabled: false, db: null, app: null, unsub: [], applyingRemote: false, saveTimer: null, refreshCallbacks: [] };
    function ppFirebaseConfigured() {
      const c = window.PP_FIREBASE_CONFIG || {};
      return !!(c && c.apiKey && c.projectId && c.apiKey !== "COLE_AQUI" && c.projectId !== "COLE_AQUI");
    }
    function ppInitFirebase() {
      try {
        if (PP_FIREBASE_STATE.enabled && PP_FIREBASE_STATE.db) return true;
        PP_FIREBASE_STATE.enabled = false;
        PP_FIREBASE_STATE.db = null;
        if (!ppFirebaseConfigured()) return false;
        if (!window.firebase || !firebase.firestore) {
          console.warn("Firebase indisponível; usando modo local.");
          return false;
        }
        PP_FIREBASE_STATE.app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.PP_FIREBASE_CONFIG);
        PP_FIREBASE_STATE.db = firebase.firestore();
        PP_FIREBASE_STATE.enabled = !!PP_FIREBASE_STATE.db;
        return PP_FIREBASE_STATE.enabled;
      } catch (e) {
        console.warn("Firebase não inicializado; usando modo local/offline.", e);
        try {
          (PP_FIREBASE_STATE.unsub || []).forEach(fn => { try { if (typeof fn === "function") fn(); } catch (_) { } });
          PP_FIREBASE_STATE.unsub = [];
        } catch (_) { }
        PP_FIREBASE_STATE.enabled = false;
        PP_FIREBASE_STATE.db = null;
        return false;
      }
    }
    function ppProjectDoc(projectId) {
      try {
        if (!ppInitFirebase()) return null;
        return PP_FIREBASE_STATE.db.collection(PP_FIRESTORE_ROOT).doc("base").collection("projects").doc(projectId);
      } catch (e) {
        console.warn("Firestore indisponível para o projeto; mantendo modo local.", e);
        PP_FIREBASE_STATE.enabled = false;
        PP_FIREBASE_STATE.db = null;
        return null;
      }
    }
    function ppMediaDoc(projectId) {
      try {
        if (!ppInitFirebase()) return null;
        return PP_FIREBASE_STATE.db.collection(PP_FIRESTORE_ROOT).doc("base")
          .collection("projects").doc(projectId).collection("media").doc("teamcards");
      } catch (e) { return null; }
    }
    function ppSaveTeamPhotos(projectId, equipe, fotosArray) {
      var doc = ppMediaDoc(projectId);
      if (!doc) return Promise.resolve();
      var key = String(equipe || "").trim().toUpperCase();
      if (!key) return Promise.resolve();
      var limpa = (Array.isArray(fotosArray) ? fotosArray : []).filter(Boolean).slice(0, 2);
      var update = { fotos: {} };
      if (limpa.length) update.fotos[key] = limpa;
      else update.fotos[key] = firebase.firestore.FieldValue.delete();
      return doc.set(update, { merge: true }).catch(function (e) { console.warn("Falha ao salvar fotos (media)", e); });
    }
    var _ppTeamPhotosCache = {};
    function ppApplyTeamPhotos(fotosMapa, projectId) {
      try {
        if (projectId) _ppTeamPhotosCache[projectId] = fotosMapa || {};
        if (!fotosMapa || typeof teamCards === "undefined") return;
        Object.keys(fotosMapa).forEach(function (eq) {
          var arr = Array.isArray(fotosMapa[eq]) ? fotosMapa[eq].slice(0, 2) : [];
          if (!teamCards[eq]) teamCards[eq] = {};
          teamCards[eq].fotos = [arr[0] || null, arr[1] || null];
        });
      } catch (e) { }
    }
    function ppSubscribeTeamPhotos(projectId) {
      try { if (!(window.firebase && firebase.auth && firebase.auth().currentUser)) return; } catch (e) { return; }
      var doc = ppMediaDoc(projectId);
      if (!doc) return;
      if (PP_FIREBASE_STATE.unsub.some(function (x) { return x && x.mediaProjectId === projectId; })) return;
      var unsub = doc.onSnapshot(function (snap) {
        if (!snap.exists) return;
        var data = snap.data() || {};
        ppApplyTeamPhotos(data.fotos || {}, projectId);
        try {
          if (projectId === currentProjectId && typeof renderTeamCard === "function") renderTeamCard();
          if (projectId === currentProjectId && typeof renderTeamCardPhotoList === "function") renderTeamCardPhotoList();
        } catch (e) { }
      }, function (err) { console.warn("Listener fotos (media) falhou", err); });
      unsub.mediaProjectId = projectId;
      PP_FIREBASE_STATE.unsub.push(unsub);
    }
    window.ppSaveTeamPhotos = ppSaveTeamPhotos;
    window.ppSubscribeTeamPhotos = ppSubscribeTeamPhotos;
    window.ppMigrarFotosParaDocSeparado = async function (soProjeto) {
      var db = (typeof firebase !== "undefined" && firebase.firestore) ? firebase.firestore() : null;
      if (!db) { console.error("Firestore indisponível."); return; }
      var root = db.collection(PP_FIRESTORE_ROOT).doc("base").collection("projects");
      var lista = (typeof PROJECTS !== "undefined" ? PROJECTS : []).map(function (p) { return p.id; })
        .filter(function (id) { return !soProjeto || id === soProjeto; });
      var totalFotos = 0, totalProjetos = 0;
      for (const pid of lista) {
        var snap;
        try { snap = await root.doc(pid).get(); } catch (e) { console.warn("Falha lendo", pid, e); continue; }
        if (!snap.exists) continue;
        var data = snap.data() || {};
        var tc = data.teamCards || {};
        var mapa = {}, achou = 0;
        Object.keys(tc).forEach(function (eq) {
          var card = tc[eq]; if (!card || !Array.isArray(card.fotos)) return;
          var b64 = card.fotos.filter(function (f) { return typeof f === "string" && f.indexOf("data:") === 0; }).slice(0, 2);
          if (b64.length) { mapa[String(eq).toUpperCase()] = b64; achou += b64.length; }
        });
        if (!achou) { console.log("• " + pid + ": nada a migrar."); continue; }
        try {
          await root.doc(pid).collection("media").doc("teamcards").set({ fotos: mapa }, { merge: true });
          var limpo = JSON.parse(JSON.stringify(tc));
          Object.keys(limpo).forEach(function (eq) { if (limpo[eq]) limpo[eq].fotos = []; });
          await root.doc(pid).set({ teamCards: limpo }, { merge: true });
          totalFotos += achou; totalProjetos++;
          console.log("✓ " + pid + ": " + achou + " foto(s) movida(s) para media e esvaziadas no principal.");
        } catch (e) { console.error("Falha migrando", pid, e); }
      }
      console.log("=== Migração concluída: " + totalFotos + " foto(s) em " + totalProjetos + " projeto(s). ===");
      return { fotos: totalFotos, projetos: totalProjetos };
    };
    function ppSubscribeProject(projectId) {
      try {
        if (!window.firebase || !firebase.auth || !firebase.auth().currentUser) return;
        const doc = ppProjectDoc(projectId);
        if (!doc) return;
        const exists = PP_FIREBASE_STATE.unsub.some(x => x && x.projectId === projectId);
        if (exists) return;
        const unsub = doc.onSnapshot(snap => {
          try {
            if (!snap.exists) return;
            const remote = snap.data();
            ppApplyRemoteProject(projectId, remote);
          } catch (e) { console.warn("Atualização remota ignorada por falha de integridade.", e); }
        }, err => console.warn("Listener Firestore falhou; modo local preservado.", err));
        unsub.projectId = projectId;
        PP_FIREBASE_STATE.unsub.push(unsub);
      } catch (e) {
        console.warn("Não foi possível assinar o Firestore; usando modo local.", e);
      }
    }
    function ppSubscribeAllProjects() { PROJECTS.forEach(p => ppSubscribeProject(p.id)); }
    function ppCurrentState() { return { config, equipes, historico, teamCards, teamCardTheme }; }

    function ppUpdateExecutiveFinance(updates) {
      const list = Array.isArray(updates) ? updates : [{ projectId: updates.projectId, payload: updates.payload || updates }];
      list.forEach(item => {
        const projectId = item.projectId;
        const payload = item.payload || {};
        const state = loadStoredProjectState(projectId);
        state.config = normalizeConfigObject(state.config || projectConfig(projectById(projectId)));
        state.config.financeiroExecutivo = {
          ...(state.config.financeiroExecutivo || {}), _init: true,
          budgetAno: n(payload.budgetAno), forecastAtual: n(payload.forecastAtual), qm: n(payload.qm), projecaoProducao: n(payload.projecaoProducao), diasUteisForecast: n(payload.diasUteisForecast), wipMensalDesconto: n(payload.wipMensalDesconto), dataHoraAtualizacao: new Date().toISOString()
        };
        ppSaveStateRemote(projectId, state, true);
      });
      ppRefreshExecutiveFrame();
    }
    window.ppExecutiveBridge = {
      getExecutiveDb: () => clone(buildExecutiveDb()),
      updateExecutiveFinance: ppUpdateExecutiveFinance,
      onExecutiveRefresh: (fn) => { if (typeof fn === "function") PP_FIREBASE_STATE.refreshCallbacks.push(fn); }
    };

    loginApp = function (event) {
      if (event) event.preventDefault();
      const targetId = currentLoginTargetId || EXECUTIVE_PANEL.id;
      if (isExecutiveTarget(targetId)) {
        currentUserLogin = "gerencial"; currentUserRole = "executivo";
        document.body.classList.remove("app-locked");
        document.body.classList.add("executive-mode");
        ppSubscribeAllProjects();
        openExecutivePanel();
        return false;
      }
      const project = projectById(targetId);
      currentUserLogin = project.login || "controller"; currentUserRole = "controller"; currentLoginTargetId = project.id;
      document.body.classList.remove("app-locked");
      document.body.classList.remove("executive-mode");
      ppSubscribeProject(project.id);
      loadProjectState(project.id);
      const frame = document.getElementById("executiveFrame"); if (frame) { frame.onload = null; frame.src = "about:blank"; }
      bindEditorRealtime(); bindTeamCardRealtime(); renderAll();
      const error = document.getElementById("loginError"); if (error) error.textContent = "";
      return false;
    };
    function ppAutoOpenRoute() { }

    const PP_RESET_NON_MAIN_KEY_FINAL = "pp.reset.non.main.projects.2026-06-29.v2";
    ppResetNonMainProjectsOnce = function () {
      try {
        if (localStorage.getItem(PP_RESET_NON_MAIN_KEY_FINAL) === "1") return;
        PROJECTS.filter(p => p.id !== PP_MAIN_PROJECT_ID).forEach(p => {
          const saved = ppReadStoredProjectState(p.id);
          const totals = saved ? calcTotalsFromState(saved, p.id) : { metaMes: 0, metaAcumulada: 0, metaDia: 0, produzidoDia: 0, produzidoAcumulado: 0 };
          const fin = saved?.config?.financeiroExecutivo || {};
          const hasData = ppTotalHasData(totals) || n(fin.budgetAno) || n(fin.forecastAtual) || n(fin.projecaoProducao) || n(fin.ytd) || n(fin.custosAtuais) || n(fin.custosFechamento);
          if (!hasData) {
            localStorage.setItem(STORAGE_KEY_BASE + "::" + p.id, JSON.stringify(ppZeroProjectState(p.id)));
            localStorage.removeItem(DAILY_BANK_KEY_BASE + "::" + p.id);
          }
        });
        const reg = readProjectCheckRegistry();
        PROJECTS.filter(p => p.id !== PP_MAIN_PROJECT_ID).forEach(p => {
          const saved = ppReadStoredProjectState(p.id);
          const totals = saved ? calcTotalsFromState(saved, p.id) : { metaMes: 0, metaAcumulada: 0, metaDia: 0, produzidoDia: 0, produzidoAcumulado: 0 };
          if (!ppTotalHasData(totals)) delete reg[p.id];
        });
        writeProjectCheckRegistry(reg);
        localStorage.setItem(PP_RESET_NON_MAIN_KEY_FINAL, "1");
      } catch (e) { console.warn("Reset final dos projetos não principais falhou", e); }
    };
    ppInitFirebase();
    ppSubscribeAllProjects();
    initLoginScreen();
    ppAutoOpenRoute();

