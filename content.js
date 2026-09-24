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
// MÓDULO 2: LANÇAMENTO DE FREQUÊNCIA
// ============================================================

function getLinhasFrequencia() {
    return document.querySelectorAll("#formFrequencia\\:alunos tbody tr");
}

function criarApp() {
    if (document.getElementById("appFrequencia")) return;
    if (getLinhasFrequencia().length === 0) return;

    const app = document.createElement("div");
    app.id = "appFrequencia";

    app.innerHTML = `
        <h3>Frequ\u00EAncia</h3>
        <button class="btn-presente">Marcar todos presentes</button>
        <button class="btn-falta">Marcar todos faltas</button>
        <div id="contador">Carregando...</div>
    `;

    document.body.appendChild(app);

    app.querySelector(".btn-presente").onclick = marcarTodosPresentes;
    app.querySelector(".btn-falta").onclick = marcarTodosFaltas;
}

function marcarTodosPresentes() {
    getLinhasFrequencia().forEach(linha => {
        const btn = linha.querySelector("img[alt='Presente']");
        if (btn) btn.click();
        pintar(linha, true);
    });
    atualizarContador();
}

function marcarTodosFaltas() {
    getLinhasFrequencia().forEach(linha => {
        const btn = linha.querySelector("img[alt='Ausente']");
        if (btn) btn.click();
        pintar(linha, false);
    });
    atualizarContador();
}

function pintar(linha, presente) {
    linha.style.backgroundColor = presente ? "#d4edda" : "#f8d7da";
}

function cliqueLinha() {
    getLinhasFrequencia().forEach(linha => {
        const nome = linha.querySelector("td:nth-child(3)");
        if (!nome || nome.dataset.ativo) return;

        nome.dataset.ativo = "true";
        nome.style.cursor = "pointer";

        nome.onclick = () => {
            const btnPresenca = linha.querySelector("img[alt='Presente']");
            const btnFalta = linha.querySelector("img[alt='Ausente']");
            const isPresente = linha.style.backgroundColor === "rgb(212, 237, 218)";

            if (isPresente) {
                if (btnFalta) btnFalta.click();
                pintar(linha, false);
            } else {
                if (btnPresenca) btnPresenca.click();
                pintar(linha, true);
            }
            atualizarContador();
        };
    });
}

function marcarInicial() {
    getLinhasFrequencia().forEach(linha => {
        if (!linha.dataset.init) {
            linha.dataset.init = "true";
            const btn = linha.querySelector("img[alt='Presente']");
            if (btn) {
                btn.click();
                pintar(linha, true);
            }
        }
    });
}

function atualizarContador() {
    let p = 0, f = 0;
    getLinhasFrequencia().forEach(linha => {
        const bg = linha.style.backgroundColor;
        if (bg === "rgb(212, 237, 218)") p++;
        else if (bg === "rgb(248, 215, 218)") f++;
    });
    const contador = document.getElementById("contador");
    if (contador) {
        contador.innerHTML = `\u2714 ${p} | \u274C ${f}`;
    }
}

// Atalhos de teclado
document.addEventListener("keydown", (e) => {
    if (["input", "textarea"].includes(document.activeElement.tagName.toLowerCase())) return;
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
    criarApp();
    marcarInicial();
    cliqueLinha();
    atualizarContador();
}

setInterval(mainLoop, 1000);
