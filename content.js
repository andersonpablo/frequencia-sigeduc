function criarApp() {
    if (document.getElementById("appFrequencia")) return;

    const app = document.createElement("div");
    app.id = "appFrequencia";

    app.innerHTML = `
        <h3>Frequ�ncia</h3>
        <button class="btn-presente">Marcar todos presentes</button>
        <button class="btn-falta">Marcar todos faltas</button>
        <div id="contador">Carregando...</div>
    `;

    document.body.appendChild(app);

    app.querySelector(".btn-presente").onclick = marcarTodosPresentes;
    app.querySelector(".btn-falta").onclick = marcarTodosFaltas;
}

function getLinhas() {
    return document.querySelectorAll("#formFrequencia\\:alunos tbody tr");
}

function marcarTodosPresentes() {
    getLinhas().forEach(linha => {
        const btn = linha.querySelector("img[alt='Presente']");
        if (btn) btn.click();
        pintar(linha, true);
    });
    atualizarContador();
}

function marcarTodosFaltas() {
    getLinhas().forEach(linha => {
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
    getLinhas().forEach(linha => {
        const nome = linha.querySelector("td:nth-child(3)");

        if (!nome || nome.dataset.ativo) return;

        nome.dataset.ativo = "true";
        nome.style.cursor = "pointer";

        nome.onclick = () => {
            const btnPresenca = linha.querySelector("img[alt='Presente']");
            const btnFalta = linha.querySelector("img[alt='Ausente']");

            const isPresente = linha.style.backgroundColor === "rgb(212, 237, 218)";

            if (isPresente) {
                btnFalta.click();
                pintar(linha, false);
            } else {
                btnPresenca.click();
                pintar(linha, true);
            }

            atualizarContador();
        };
    });
}

function marcarInicial() {
    getLinhas().forEach(linha => {
        const btn = linha.querySelector("img[alt='Presente']");
        if (btn && !linha.dataset.init) {
            linha.dataset.init = "true";
            btn.click();
            pintar(linha, true);
        }
    });
}

function atualizarContador() {
    let p = 0, f = 0;

    getLinhas().forEach(linha => {
        if (linha.style.backgroundColor === "rgb(212, 237, 218)") p++;
        else if (linha.style.backgroundColor === "rgb(248, 215, 218)") f++;
    });

    const contador = document.getElementById("contador");
    if (contador) {
        contador.innerHTML = `✅ ${p} | ❌ ${f}`;
    }
}

// atalhos teclado
document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p") marcarTodosPresentes();
    if (e.key.toLowerCase() === "f") marcarTodosFaltas();
});

// INIT
function init() {
    criarApp();
    marcarInicial();
    cliqueLinha();
    atualizarContador();
}

setInterval(init, 2000);