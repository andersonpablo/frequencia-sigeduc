// ============================================================
// VALIDAÇÃO DE CONTEXTO E DOMÍNIO
// ============================================================
function isSigeducDomain() {
    return window.location.hostname.endsWith("sigeduc.rn.gov.br");
}

function isPortalDocente() {
    return window.location.pathname.includes("/portais/docente/docente.jsf") ||
           window.location.pathname.includes("/verPortalDocente.do");
}

// ============================================================
// MÓDULO 1: MELHORIAS DA TELA INICIAL (TURMAS)
// ============================================================

// Extrai código simplificado da turma a partir do texto da célula de código
// INFIINT1A → 1A | INFIINT2B → 2B
function extrairCodigoTurma(texto) {
    if (!texto) return '';
    const t = texto.trim();
    // Padrão específico: prefixo de letras + dígitos + letra final (ex: INFIINT1A)
    const match = t.match(/[A-Za-z]+(\d+)([A-Za-z])$/);
    if (match) {
        return match[1] + match[2].toUpperCase();
    }
    return t;
}

// Localiza a tabela principal de turmas
function encontrarTabelaTurmas() {
    // Evita tabelas de frequência
    const tabelas = document.querySelectorAll(
        "#main-docente table, #conteudo table, table.listagem, table.subFormulario"
    );
    for (const tab of tabelas) {
        if (tab.id.includes("alunos") || tab.closest("#formFrequencia")) continue;
        const texto = tab.innerText;
        if (
            texto.includes("Componente") ||
            /\b20\d{2}\.[12]\b/.test(texto) ||
            texto.includes("Qtd. de Estudantes")
        ) {
            return tab;
        }
    }
    return null;
}

// Índices reais das colunas (confirmado via DevTools):
// 0: (vazia/oculta — th sem texto, == $0)
// 1: Turma (ícone + link com código ex: INFIINT1A)
// 2: Ano (período: 2026.1)
// 3: Escola
// 4: Etapa de Ensino (curso longo)
// 5: Ano / Série (1ª SÉRIE)
// 6: Componente (disciplina)
// 7: Qtd. de Estudantes
// 8+: Ações (ícones)
const COL = {
    VAZIA:      0,
    TURMA:      1,
    PERIODO:    2,
    ESCOLA:     3,
    ETAPA:      4,
    SERIE:      5,
    COMPONENTE: 6,
    QTD:        7,
    ACOES_INI:  8
};

// Obtém o período a partir da coluna correta (índice 2 = "Ano")
function obterPeriodoDaCelula(linha) {
    const colunas = linha.querySelectorAll("td");
    // Coluna 2 = Ano (período "2026.1")
    if (colunas[COL.PERIODO]) {
        const match = colunas[COL.PERIODO].innerText.trim().match(/\b(20\d{2}\.[12])\b/);
        if (match) return match[1];
    }
    // Fallback: busca em toda a linha
    const matchGeral = linha.innerHTML.match(/\b(20\d{2}\.[12])\b/);
    if (matchGeral) return matchGeral[1];
    // Fallback: busca em linhas anteriores
    let anterior = linha.previousElementSibling;
    while (anterior) {
        const m = anterior.innerText.match(/\b(20\d{2}\.[12])\b/);
        if (m) return m[1];
        anterior = anterior.previousElementSibling;
    }
    return "";
}

// Guarda o filtro escolhido pelo usuário — persiste entre iterações do setInterval
let filtroAtivo = null;

function filtrarTabelaPorSemestre(tabela, filtro) {
    const linhas = tabela.querySelectorAll("tbody tr");
    linhas.forEach(linha => {
        if (linha.querySelector("th") || linha.classList.contains("agrupador")) {
            linha.style.setProperty("display", filtro === "TODAS" ? "" : "none", "important");
            return;
        }
        const periodo = linha.dataset.periodo || "";
        if (!periodo) return;
        let visivel = false;
        if (filtro === "TODAS") {
            visivel = true;
        } else if (filtro.includes(".")) {
            visivel = (periodo === filtro);
        } else {
            visivel = periodo.startsWith(filtro);
        }
        linha.style.setProperty("display", visivel ? "" : "none", "important");
    });
}

function criarFiltrosSemestre(tabela, filtroInicial, anoAtual) {
    if (document.getElementById("painelFiltroSemestres")) return;

    const divContainer = document.createElement("div");
    divContainer.id = "painelFiltroSemestres";
    divContainer.className = "painel-filtro-semestres";

    const semestres = [
        { rotulo: `${anoAtual}.1`, valor: `${anoAtual}.1` },
        { rotulo: `${anoAtual}.2`, valor: `${anoAtual}.2` },
        { rotulo: `Ano ${anoAtual}`, valor: `${anoAtual}` },
        { rotulo: "Exibir Todas", valor: "TODAS" }
    ];

    const label = document.createElement("span");
    label.className = "filtro-label";
    label.textContent = "Per\u00EDodo:";
    divContainer.appendChild(label);

    semestres.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-semestre-filtro" + (item.valor === filtroInicial ? " ativo" : "");
        btn.textContent = item.rotulo;
        btn.addEventListener("click", () => {
            divContainer.querySelectorAll(".btn-semestre-filtro").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            filtroAtivo = item.valor;
            filtrarTabelaPorSemestre(tabela, filtroAtivo);
        });
        divContainer.appendChild(btn);
    });

    tabela.parentNode.insertBefore(divContainer, tabela);
}

// Índices reais das colunas na tabela do SIGEduc (baseado no screenshot):
// 0: Turma (ícone + link com código ex: INFIINT1A)
// 1: Ano (período: 2026.1)
// 2: Escola
// 3: Etapa de Ensino (curso longo)
// 4: Ano / Série (1ª SÉRIE)
// 5: Componente (disciplina)
// 6: Qtd. de Estudantes
// 7+: Ações (ícones)

function ajustarCabecalhoTabela(tabela) {
    const thead = tabela.querySelector("thead");
    if (!thead || thead.dataset.ajustado) return;
    thead.dataset.ajustado = "true";

    const ths = thead.querySelectorAll("th");
    // Oculta: col vazia(0), Escola(3), Etapa(4), Ano/Série(5), Qtd(7)
    const ocultar = [COL.VAZIA, COL.ESCOLA, COL.ETAPA, COL.SERIE, COL.QTD];
    ths.forEach((th, i) => {
        if (ocultar.includes(i)) {
            th.style.setProperty("display", "none", "important");
        }
    });

    // Renomeia os cabeçalhos visíveis com os índices corretos
    if (ths[COL.TURMA])      { ths[COL.TURMA].textContent = "Turma";       ths[COL.TURMA].className = "th-custom th-turma"; }
    if (ths[COL.PERIODO])    { ths[COL.PERIODO].textContent = "Per\u00EDodo"; ths[COL.PERIODO].className = "th-custom th-periodo"; }
    if (ths[COL.COMPONENTE]) { ths[COL.COMPONENTE].textContent = "Componente"; ths[COL.COMPONENTE].className = "th-custom th-componente"; }
    // Ações: todas as th a partir do índice 8
    ths.forEach((th, i) => {
        if (i >= COL.ACOES_INI) { th.textContent = "A\u00E7\u00F5es"; th.className = "th-custom th-acoes"; }
    });
}

function ajustarTelaInicialTurmas() {
    if (!isPortalDocente()) return;

    const tabelaTurmas = encontrarTabelaTurmas();
    if (!tabelaTurmas) return;

    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    const semestreAtual = mesAtual <= 6 ? 1 : 2;
    const padraoFiltro = `${anoAtual}.${semestreAtual}`;

    // Ajusta cabeçalhos
    ajustarCabecalhoTabela(tabelaTurmas);

    // Processa cada linha
    const linhas = tabelaTurmas.querySelectorAll("tbody tr");
    linhas.forEach(linha => {
        if (linha.dataset.ajustado) return;

        const colunas = linha.querySelectorAll("td");
        if (colunas.length < 6) return;

        linha.dataset.ajustado = "true";

        // --- Detecta e armazena período ---
        if (!linha.dataset.periodo) {
            linha.dataset.periodo = obterPeriodoDaCelula(linha);
        }

        // --- Col 0: vazia — oculta ---
        if (colunas[COL.VAZIA]) colunas[COL.VAZIA].style.setProperty("display", "none", "important");

        // --- Col 1: Turma — simplifica o código ---
        const tdTurma = colunas[COL.TURMA];
        if (tdTurma) {
            const linkTurma = tdTurma.querySelector("a");
            if (linkTurma && !linkTurma.dataset.simplificado) {
                linkTurma.dataset.simplificado = "true";
                const textoOriginal = linkTurma.textContent.trim();
                const codigoSimples = extrairCodigoTurma(textoOriginal);
                linkTurma.title = textoOriginal;
                const img = linkTurma.querySelector("img");
                linkTurma.textContent = codigoSimples;
                if (img) linkTurma.prepend(img);
                linkTurma.classList.add("turma-tag-custom");
            }
            tdTurma.classList.add("td-turma-custom");
        }

        // --- Col 2: Período — mantém o texto, adiciona classe ---
        if (colunas[COL.PERIODO]) {
            colunas[COL.PERIODO].classList.add("td-periodo-custom");
        }

        // --- Col 3: Escola — oculta ---
        if (colunas[COL.ESCOLA]) colunas[COL.ESCOLA].style.setProperty("display", "none", "important");

        // --- Col 4: Etapa de Ensino — oculta ---
        if (colunas[COL.ETAPA]) colunas[COL.ETAPA].style.setProperty("display", "none", "important");

        // --- Col 5: Ano / Série — oculta ---
        if (colunas[COL.SERIE]) colunas[COL.SERIE].style.setProperty("display", "none", "important");

        // --- Col 6: Componente — destaca ---
        if (colunas[COL.COMPONENTE] && !colunas[COL.COMPONENTE].classList.contains("coluna-disciplina-custom")) {
            colunas[COL.COMPONENTE].classList.add("coluna-disciplina-custom");
        }

        // --- Col 7: Qtd. de Estudantes — oculta ---
        if (colunas[COL.QTD]) colunas[COL.QTD].style.setProperty("display", "none", "important");

        // --- Col 8+: Ações — aplica classe para ícones maiores ---
        for (let i = COL.ACOES_INI; i < colunas.length; i++) {
            if (colunas[i]) colunas[i].classList.add("td-acoes-custom");
        }
    });

    // Define filtro padrão apenas na primeira vez; nas demais respeita a escolha do usuário
    if (filtroAtivo === null) filtroAtivo = padraoFiltro;
    criarFiltrosSemestre(tabelaTurmas, filtroAtivo, anoAtual);
    filtrarTabelaPorSemestre(tabelaTurmas, filtroAtivo);
}

// ============================================================
// MÓDULO 2: LANÇAMENTO DE FREQUÊNCIA (interface em cartões)
// ============================================================
// A tabela original do SIGEduc continua no DOM (escondida por CSS):
// é ela que o formulário envia ao salvar. Os cartões só leem e
// alteram os <select class="selectFreq"> de cada linha.

const SP_FREQ = { cards: [], modo: "lancamento", ctx: null };

const SP_ICON_PESSOAS = `<svg viewBox="0 0 64 40" width="50" height="32" aria-hidden="true"><g fill="#1e6fd9"><circle cx="32" cy="9" r="7"/><path d="M20 34c0-8 5-14 12-14s12 6 12 14v3H20z"/><circle cx="12" cy="15" r="5.5"/><path d="M2 35c0-6 4-11 10-11 2 0 4 .6 5.500 1.600C15 28 14 31 14 35v2H2z"/><circle cx="52" cy="15" r="5.500"/><path d="M62 35c0-6-4-11-10-11-2 0-4 .6-5.500 1.600C49 28 50 31 50 35v2h12z"/></g></svg>`;
const SP_ICON_RELOGIO = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#2e9e5b" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="#2e9e5b" stroke-width="2" stroke-linecap="round"/></svg>`;
const SP_ICON_CAL = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3.500" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.500 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
const SP_ICON_BARRAS = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 20V10M12 20V4M18 20v-7" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
const SP_ICON_REFRESH = `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.300-5.600M20 4v5h-5" stroke="currentColor" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SP_ICON_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500" stroke="currentColor" stroke-width="2.600" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function el(tag, cls, texto) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

function limparTexto(node) {
    return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
}

function getLinhasFrequencia() {
    return document.querySelectorAll("#formFrequencia\\:alunos tbody tr");
}

function getMaxFaltas() {
    const campo = document.getElementById("maxFaltas");
    const n = campo ? parseInt(campo.value, 10) : NaN;
    return n > 0 ? n : 2;
}

// Lê a tabela "Dados da Turma" e os textos da página para montar o cabeçalho
function lerContextoFrequencia() {
    const dados = {};
    document.querySelectorAll("table.dados_turma_pg tr").forEach(tr => {
        const t = tr.querySelector(".dados_turma_titulo");
        const v = tr.querySelector("td.none");
        if (t && v) dados[limparTexto(t).replace(":", "")] = limparTexto(v);
    });

    const mTurma = (dados["Turma"] || "").match(/\b([A-Za-z]+\d+[A-Za-z])\b/);
    const turma = mTurma ? extrairCodigoTurma(mTurma[1]) : "";

    const mAno = limparTexto(document.getElementById("calendarios")).match(/Calend[aá]rio\s+(\d{4})/);
    const mSem = (dados["Periodicidade"] || "").match(/(\d)/);
    const periodo = mAno ? mAno[1] + (mSem ? "." + mSem[1] : "") : "";

    const mData = limparTexto(document.querySelector("#frequencia h4")).match(/(\d{2}\/\d{2}\/\d{4})/);

    return {
        dados,
        turma,
        periodo,
        componente: dados["Componente"] || "",
        data: mData ? mData[1] : ""
    };
}

function formatarAgora() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function montarApp(conteudo) {
    const ctx = lerContextoFrequencia();
    SP_FREQ.ctx = ctx;

    const app = el("div");
    app.id = "spFreqApp";
    app.innerHTML = `
        <div class="sp-topo">
            <div class="sp-topo-esq">
                <span class="sp-logo">${SP_ICON_PESSOAS}</span>
                <div>
                    <h1 class="sp-titulo">Lan\u00E7amento de Frequ\u00EAncia</h1>
                    <div class="sp-sub">
                        <span>Portal Docente</span><i></i>
                        <span id="spSubTurma"></span><i></i>
                        <span id="spSubPeriodo"></span>
                    </div>
                </div>
            </div>
            <div class="sp-topo-dir">
                <span class="sp-badge">SIGEDUC PRO</span>
                <div class="sp-atualizacao">${SP_ICON_RELOGIO}<span id="spAtualizacao"></span></div>
            </div>
        </div>

        <div class="sp-barra">
            <label class="sp-campo sp-campo-turma"><span>Turma</span><select id="spSelTurma" disabled></select></label>
            <label class="sp-campo sp-campo-periodo"><span>Ano / Semestre</span><select id="spSelPeriodo" disabled></select></label>
            <div class="sp-campo">
                <span>Visualiza\u00E7\u00E3o</span>
                <div class="sp-seg">
                    <button type="button" data-modo="lancamento" class="ativo">${SP_ICON_CAL}Lan\u00E7amento de Frequ\u00EAncia</button>
                    <button type="button" data-modo="resumo">${SP_ICON_BARRAS}Resumo da Turma</button>
                    <button type="button" data-modo="calendario">${SP_ICON_CAL}Alterar dia</button>
                </div>
            </div>
            <div class="sp-barra-acoes">
                <button type="button" id="spAtualizar" class="sp-btn-sec">${SP_ICON_REFRESH}Atualizar</button>
                <button type="button" id="spSalvar" class="sp-btn-prim">${SP_ICON_CHECK}Salvar Frequ\u00EAncia</button>
            </div>
        </div>

        <div class="sp-linha-resumo">
            <span class="sp-chip sp-chip-p">\u2714 <b id="spQtdP">0</b> presentes</span>
            <span class="sp-chip sp-chip-f">\u2716 <b id="spQtdF">0</b> com falta</span>
            <span class="sp-chip sp-chip-s" id="spChipS">\u25CB <b id="spQtdS">0</b> sem marca\u00E7\u00E3o</span>
            <span class="sp-data" id="spData"></span>
            <div class="sp-bulk">
                <button type="button" id="spTodosP">Todos presentes (P)</button>
                <button type="button" id="spTodosF">Todos com falta (F)</button>
            </div>
        </div>

        <div id="spResumo" class="sp-resumo"></div>
        <div id="spGrid" class="sp-grid"></div>
    `;
    conteudo.insertBefore(app, conteudo.firstChild);

    // Textos dinâmicos (via textContent)
    document.getElementById("spSubTurma").textContent = ctx.turma ? "Turma " + ctx.turma : "Turma";
    document.getElementById("spSubPeriodo").textContent = ctx.periodo;
    document.getElementById("spAtualizacao").textContent = "\u00DAltima atualiza\u00E7\u00E3o: " + formatarAgora();
    document.getElementById("spData").textContent = ctx.data ? "Aula de " + ctx.data : "";

    const optTurma = el("option", "", (ctx.turma ? ctx.turma + " - " : "") + (ctx.componente || "Turma atual"));
    document.getElementById("spSelTurma").appendChild(optTurma);
    document.getElementById("spSelPeriodo").appendChild(el("option", "", ctx.periodo || "\u2014"));

    // Visualização
    app.querySelectorAll(".sp-seg button").forEach(btn => {
        btn.addEventListener("click", () => definirModo(btn.dataset.modo));
    });

    document.getElementById("spAtualizar").addEventListener("click", () => window.location.reload());
    document.getElementById("spSalvar").addEventListener("click", () => {
        const gravar = document.getElementById("formFrequencia:botaoGravarFreq");
        if (gravar) gravar.click();
    });
    document.getElementById("spTodosP").addEventListener("click", marcarTodosPresentes);
    document.getElementById("spTodosF").addEventListener("click", marcarTodosFaltas);

    // Botões originais (Gravar / Remover / Cancelar) ganham estilo próprio
    const gravarOrig = document.getElementById("formFrequencia:botaoGravarFreq");
    if (gravarOrig && gravarOrig.parentElement) gravarOrig.parentElement.classList.add("sp-rodape-acoes");

    definirModo(SP_FREQ.modo);
}

function definirModo(modo) {
    SP_FREQ.modo = modo;
    document.body.classList.toggle("sp-modo-calendario", modo === "calendario");
    document.body.classList.toggle("sp-modo-resumo", modo === "resumo");
    document.querySelectorAll("#spFreqApp .sp-seg button").forEach(b => {
        b.classList.toggle("ativo", b.dataset.modo === modo);
    });
    atualizarCards();
}

function montarGrid() {
    const grid = document.getElementById("spGrid");
    if (!grid) return;
    grid.replaceChildren();
    SP_FREQ.cards = [];
    const max = getMaxFaltas();

    getLinhasFrequencia().forEach(linha => {
        const tds = linha.querySelectorAll(":scope > td");
        const sel = linha.querySelector("select.selectFreq");
        if (!sel || tds.length < 3) return;

        const card = el("div", "sp-card");

        const cab = el("div", "sp-card-cab");
        const num = el("span", "sp-num", limparTexto(tds[0]) + ".");
        const mat = el("span", "sp-mat", limparTexto(tds[1]));
        const nome = el("span", "sp-nome", limparTexto(tds[2]));
        nome.title = "Clique para alternar presen\u00E7a/falta";
        cab.append(num, mat, nome);

        const acoes = el("div", "sp-acoes");
        const botoes = [];
        for (let v = 0; v <= max; v++) {
            const b = el("button", v === 0 ? "sp-btn sp-presente" : "sp-btn sp-falta", v === 0 ? "PRESENTE" : `${v} FALTA`);
            b.type = "button";
            b.dataset.valor = String(v);
            b.addEventListener("click", () => definirFrequencia(linha, v));
            botoes.push(b);
            acoes.appendChild(b);
        }
        acoes.style.gridTemplateColumns = `repeat(${max + 1}, 1fr)`;

        card.append(cab, acoes);

        // Justificativa (Bolsa Família) — reaproveita o link original da linha
        let btnJust = null;
        const linkJust = linha.querySelector(".justificativa a");
        if (linkJust) {
            btnJust = el("button", "sp-just", "Justificar falta (B. Fam\u00EDlia)");
            btnJust.type = "button";
            btnJust.addEventListener("click", () => linkJust.click());
            card.appendChild(btnJust);
        }

        nome.addEventListener("click", () => {
            definirFrequencia(linha, sel.value === "0" ? max : 0);
        });

        grid.appendChild(card);
        SP_FREQ.cards.push({ linha, sel, card, botoes, btnJust });
    });
}

function definirFrequencia(linha, valor) {
    const sel = linha.querySelector("select.selectFreq");
    if (!sel || sel.disabled) return;
    if (![...sel.options].some(o => o.value === String(valor))) return;
    sel.value = String(valor);
    // O onchange inline do SIGEduc (showHideJustificativa) roda normalmente
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    atualizarCards();
}

function marcarTodosPresentes() {
    getLinhasFrequencia().forEach(l => definirFrequencia(l, 0));
}

function marcarTodosFaltas() {
    const max = getMaxFaltas();
    getLinhasFrequencia().forEach(l => definirFrequencia(l, max));
}

// Sincroniza os cartões com o valor real dos selects
function atualizarCards() {
    const lista = SP_FREQ.cards;
    if (!lista.length) return;

    let p = 0, f = 0, s = 0;
    lista.forEach(({ sel, card, botoes, btnJust }) => {
        const v = sel.value;
        const estado = v === "0" ? "presente" : (parseInt(v, 10) > 0 ? "falta" : "vazio");
        if (estado === "presente") p++; else if (estado === "falta") f++; else s++;
        card.dataset.estado = estado;
        card.classList.toggle("sp-desabilitado", !!sel.disabled);
        botoes.forEach(b => {
            b.classList.toggle("ativo", b.dataset.valor === v);
            b.disabled = !!sel.disabled;
        });
        if (btnJust) btnJust.style.display = estado === "falta" ? "" : "none";
    });

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("spQtdP", p);
    set("spQtdF", f);
    set("spQtdS", s);
    const chipS = document.getElementById("spChipS");
    if (chipS) chipS.style.display = s > 0 ? "" : "none";

    if (SP_FREQ.modo === "resumo") renderResumo(p, f, s, lista.length);
}

function renderResumo(p, f, s, total) {
    const box = document.getElementById("spResumo");
    if (!box) return;
    box.replaceChildren();
    const tile = (rotulo, valor, cls) => {
        const t = el("div", "sp-tile" + (cls ? " " + cls : ""));
        t.append(el("span", "sp-tile-rot", rotulo), el("strong", "sp-tile-val", String(valor)));
        box.appendChild(t);
    };
    tile("Estudantes", total);
    tile("Presentes", p, "sp-tile-p");
    tile("Com falta", f, "sp-tile-f");
    tile("Sem marca\u00E7\u00E3o", s);
    const dados = (SP_FREQ.ctx && SP_FREQ.ctx.dados) || {};
    Object.keys(dados).forEach(k => {
        if (k === "Turma") return;
        tile(k, dados[k], "sp-tile-info");
    });
}

function criarInterfaceFrequencia() {
    if (!document.getElementById("formFrequencia:alunos")) return;
    const linhas = getLinhasFrequencia();
    if (linhas.length === 0) return;

    document.body.classList.add("sp-freq-ativo");
    const conteudo = document.getElementById("conteudo") || document.body;

    if (!document.getElementById("spFreqApp")) montarApp(conteudo);

    const c = SP_FREQ.cards;
    if (!c.length || !c[0].linha.isConnected || c.length !== linhas.length) montarGrid();
}

// Só pré-marca "Presente" quando o aluno ainda está sem seleção ("Selecione"),
// para nunca sobrescrever uma frequência já lançada.
function marcarInicial() {
    getLinhasFrequencia().forEach(linha => {
        if (linha.dataset.init) return;
        linha.dataset.init = "true";
        const sel = linha.querySelector("select.selectFreq");
        if (sel && sel.value === "-1") definirFrequencia(linha, 0);
    });
}

// Atalhos de teclado: P = todos presentes, F = todos com falta
document.addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("sp-freq-ativo")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) return;
    if (e.key.toLowerCase() === "p") marcarTodosPresentes();
    if (e.key.toLowerCase() === "f") marcarTodosFaltas();
});

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function mainLoop() {
    if (!isSigeducDomain()) return;

    // Tela de Turmas (Portal Docente)
    ajustarTelaInicialTurmas();

    // Tela de Chamada / Frequência
    criarInterfaceFrequencia();
    marcarInicial();
    atualizarCards();
}

setInterval(mainLoop, 1000);
