
"use strict";

/* =====================================
   CONECTA 2.0 - SISTEMA PRINCIPAL
===================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function load(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data === null ? fallback : JSON.parse(data);
    } catch {
        return fallback;
    }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeText(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

let tasks = load("c2_tasks", []);
let routines = load("c2_routines", [
    { id: "r1", name: "Acordar", emoji: "🌅", done: false },
    { id: "r2", name: "Tomar café", emoji: "🥣", done: false },
    { id: "r3", name: "Organizar minhas coisas", emoji: "📅", done: false },
    { id: "r4", name: "Estudar ou trabalhar", emoji: "📚", done: false },
    { id: "r5", name: "Fazer uma pausa", emoji: "🌿", done: false },
    { id: "r6", name: "Descansar", emoji: "🌙", done: false }
]);
let moods = load("c2_moods", []);
let notes = load("c2_notes", []);
let selectedMood = "";
let currentFilter = "all";

/* DATA */

const now = new Date();

$("#currentDate").textContent = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
});

/* NOTIFICAÇÕES */

let toastTimeout;

function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* NAVEGAÇÃO */

const pageTitles = {
    inicio: ["Olá! Que bom ter você aqui.", "VISÃO GERAL"],
    rotina: ["Minha rotina visual", "MINHA ROTINA"],
    tarefas: ["Minhas tarefas", "TAREFAS"],
    comunicacao: ["Comunicação", "COMUNICAÇÃO"],
    foco: ["Meu momento de concentração", "CONCENTRAÇÃO"],
    sentimentos: ["Meu espaço de sentimentos", "SENTIMENTOS"],
    anotacoes: ["Meu caderno", "ANOTAÇÕES"],
    acessibilidade: ["Meu ambiente", "ACESSIBILIDADE"]
};

function openPage(page) {
    if (!pageTitles[page]) return;

    $$(".page").forEach(section => {
        section.classList.toggle("active", section.id === page);
    });

    $$(".menu-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    $("#pageHeading").textContent = pageTitles[page][0];
    $("#pageLabel").textContent = pageTitles[page][1];

    $("#sidebar").classList.remove("open");
    window.scrollTo(0, 0);
}

$$(".menu-link").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

$$("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.go);
    });
});

$("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

/* TAREFAS */

function renderTaskItem(task) {
    return `
        <div class="task-item ${task.done ? "completed" : ""}">
            <input type="checkbox"
                data-task-check="${escapeText(task.id)}"
                ${task.done ? "checked" : ""}
                aria-label="Concluir ${escapeText(task.name)}">

            <div class="task-description">
                <strong>${escapeText(task.name)}</strong>
                <small>${escapeText(task.date)}</small>
            </div>

            <button class="delete-task"
                data-task-delete="${escapeText(task.id)}"
                aria-label="Excluir ${escapeText(task.name)}">×</button>
        </div>
    `;
}

function renderTasks() {
    const container = $("#allTasks");

    const filtered = tasks.filter(task => {
        if (currentFilter === "pending") return !task.done;
        if (currentFilter === "done") return task.done;
        return true;
    });

    container.innerHTML = filtered.length
        ? filtered.map(renderTaskItem).join("")
        : '<div class="empty">Nenhuma tarefa nesta categoria.</div>';

    renderHome();
}

function renderHome() {
    const completed = tasks.filter(task => task.done).length;
    const pending = tasks.filter(task => !task.done).length;

    $("#doneNumber").textContent = completed;
    $("#pendingNumber").textContent = pending;

    const total = routines.length;
    const finished = routines.filter(item => item.done).length;

    const percent = total
        ? Math.round(finished / total * 100)
        : 0;

    $("#routineNumber").textContent = percent + "%";

    const home = $("#homeTasks");
    const next = tasks.filter(task => !task.done).slice(0, 4);

    home.innerHTML = next.length
        ? next.map(renderTaskItem).join("")
        : '<div class="empty">Seu espaço está livre de tarefas pendentes.</div>';
}

function addTask() {
    const name = prompt("Qual tarefa deseja adicionar?");

    if (name === null) return;

    if (!name.trim()) {
        notify("Digite o nome da tarefa.");
        return;
    }

    tasks.push({
        id: id(),
        name: name.trim(),
        date: new Date().toLocaleDateString("pt-BR"),
        done: false
    });

    save("c2_tasks", tasks);
    renderTasks();
    notify("Tarefa adicionada!");
}

$("#newTask").addEventListener("click", addTask);

$$(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        $$(".filter").forEach(item =>
            item.classList.remove("active")
        );

        button.classList.add("active");
        renderTasks();
    });
});

document.addEventListener("change", event => {
    if (!event.target.matches("[data-task-check]")) return;

    const task = tasks.find(item =>
        item.id === event.target.dataset.taskCheck
    );

    if (!task) return;

    task.done = event.target.checked;

    save("c2_tasks", tasks);
    renderTasks();
});

document.addEventListener("click", event => {
    const button = event.target.closest("[data-task-delete]");

    if (!button) return;

    tasks = tasks.filter(item =>
        item.id !== button.dataset.taskDelete
    );

    save("c2_tasks", tasks);
    renderTasks();
    notify("Tarefa removida.");
});

/* ROTINA VISUAL */

function renderRoutine() {
    const container = $("#routineGrid");

    container.innerHTML = routines.map(item => `
        <button class="routine-item ${item.done ? "done" : ""}"
            data-routine="${escapeText(item.id)}">

            <span class="emoji">${escapeText(item.emoji)}</span>
            <strong>${escapeText(item.name)}</strong>
            <small>${item.done ? "✓ Concluído" : "Toque para concluir"}</small>
        </button>
    `).join("");

    const finished = routines.filter(item => item.done).length;
    const percent = routines.length
        ? Math.round(finished / routines.length * 100)
        : 0;

    $("#routinePercent").textContent = percent + "%";
    $("#routineBar").style.width = percent + "%";

    renderHome();
}

$("#addRoutine").addEventListener("click", () => {
    const name = prompt("Nome da atividade:");

    if (name === null) return;

    if (!name.trim()) {
        notify("Digite um nome para a atividade.");
        return;
    }

    const emoji = prompt("Escolha um emoji para a atividade:", "⭐");

    if (emoji === null) return;

    routines.push({
        id: id(),
        name: name.trim(),
        emoji: emoji.trim() || "⭐",
        done: false
    });

    save("c2_routines", routines);
    renderRoutine();
    notify("Atividade adicionada!");
});

$("#routineGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-routine]");

    if (!button) return;

    const item = routines.find(
        routine => routine.id === button.dataset.routine
    );

    if (!item) return;

    item.done = !item.done;

    save("c2_routines", routines);
    renderRoutine();
});

/* COMUNICAÇÃO */

const phrases = [
    ["🙋", "Preciso de ajuda", "Quero receber ajuda.", "Preciso de ajuda."],
    ["🌿", "Quero descansar", "Preciso fazer uma pausa.", "Preciso de um tempo para descansar."],
    ["💬", "Não entendi", "Preciso de outra explicação.", "Não entendi. Pode explicar novamente?"],
    ["🤫", "Preciso de silêncio", "Quero um ambiente tranquilo.", "Prefiro ficar em silêncio neste momento."],
    ["🔊", "Barulho incomodando", "O ambiente está desconfortável.", "O barulho está me incomodando."],
    ["⏳", "Preciso de tempo", "Quero pensar antes de responder.", "Preciso de mais tempo para responder."],
    ["✋", "Não quero agora", "Preciso respeitar meu limite.", "Não quero participar desta atividade agora."],
    ["😊", "Estou bem", "Quero expressar como estou.", "Estou me sentindo bem."]
];

function renderCommunication() {
    $("#communicationGrid").innerHTML = phrases.map((item, index) => `
        <button class="communication-item" data-phrase="${index}">
            <span class="emoji">${item[0]}</span>
            <strong>${item[1]}</strong>
            <small>${item[2]}</small>
        </button>
    `).join("");
}

async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();

            const copied = document.execCommand("copy");
            area.remove();

            if (!copied) throw new Error("Falha ao copiar");
        }

        notify("Mensagem copiada!");
    } catch {
        notify("Não foi possível copiar. Tente novamente.");
    }
}

$("#communicationGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-phrase]");

    if (!button) return;

    const phrase = phrases[Number(button.dataset.phrase)];

    if (phrase) copyText(phrase[3]);
});

$("#copyMessage").addEventListener("click", () => {
    const message = $("#customMessage").value.trim();

    if (!message) {
        notify("Digite uma mensagem primeiro.");
        return;
    }

    copyText(message);
});

/* SENTIMENTOS */

function selectMood(mood) {
    selectedMood = mood;

    $("#selectedMood").textContent =
        "Sentimento selecionado: " + mood;

    $$("#moodOptions button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.mood === mood
        );
    });
}

document.addEventListener("click", event => {
    const button = event.target.closest("[data-mood]");

    if (!button) return;

    const mood = button.dataset.mood;

    openPage("sentimentos");
    selectMood(mood);
});

function renderMoods() {
    const container = $("#moodHistory");

    if (!moods.length) {
        container.innerHTML =
            '<div class="empty">Seus registros aparecerão aqui.</div>';
        return;
    }

    container.innerHTML = moods.map(item => `
        <div class="history-entry">
            <strong>${escapeText(item.mood)}</strong>
            <small> · ${escapeText(item.date)}</small>
            <p>${escapeText(item.note || "Sem observações.")}</p>
        </div>
    `).join("");
}

$("#saveMood").addEventListener("click", () => {
    if (!selectedMood) {
        notify("Escolha um sentimento.");
        return;
    }

    moods.unshift({
        id: id(),
        mood: selectedMood,
        note: $("#moodDescription").value.trim(),
        date: new Date().toLocaleString("pt-BR")
    });

    save("c2_moods", moods);

    selectedMood = "";
    $("#moodDescription").value = "";
    $("#selectedMood").textContent = "Nenhum sentimento selecionado.";

    $$("#moodOptions button").forEach(button =>
        button.classList.remove("selected")
    );

    renderMoods();
    notify("Registro salvo!");
});

/* ANOTAÇÕES */

function renderNotes() {
    const container = $("#notesGrid");

    if (!notes.length) {
        container.innerHTML =
            '<div class="empty">Você ainda não tem anotações.</div>';
        return;
    }

    container.innerHTML = notes.map(note => `
        <article class="note-card">
            <button class="delete-task"
                data-note-delete="${escapeText(note.id)}"
                aria-label="Excluir anotação">×</button>

            <h4>${escapeText(note.title)}</h4>
            <small>${escapeText(note.date)}</small>
            <p>${escapeText(note.content)}</p>
        </article>
    `).join("");
}

$("#saveNote").addEventListener("click", () => {
    const title = $("#noteTitle").value.trim();
    const content = $("#noteContent").value.trim();

    if (!title || !content) {
        notify("Preencha o título e o conteúdo.");
        return;
    }

    notes.unshift({
        id: id(),
        title,
        content,
        date: new Date().toLocaleDateString("pt-BR")
    });

    save("c2_notes", notes);

    $("#noteTitle").value = "";
    $("#noteContent").value = "";

    renderNotes();
    notify("Anotação salva!");
});

$("#notesGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-note-delete]");

    if (!button) return;

    notes = notes.filter(note =>
        note.id !== button.dataset.noteDelete
    );

    save("c2_notes", notes);
    renderNotes();
    notify("Anotação excluída.");
});

/* TEMPORIZADOR */

let timerSeconds = 25 * 60;
let timerInterval = null;
let running = false;

function updateTimer() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    $("#timer").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    running = false;
}

function startTimer() {
    if (running) return;

    if (timerSeconds <= 0) {
        notify("Configure um tempo primeiro.");
        return;
    }

    running = true;
    $("#timerMessage").textContent = "Momento de concentração.";

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimer();

        if (timerSeconds <= 0) {
            stopTimer();

            $("#timerMessage").textContent =
                "Seu tempo terminou. Você pode fazer uma pausa.";

            notify("Tempo concluído!");
        }
    }, 1000);
}

$("#startTimer").addEventListener("click", startTimer);

$("#pauseTimer").addEventListener("click", () => {
    stopTimer();
    $("#timerMessage").textContent = "Temporizador pausado.";
});

$("#resetTimer").addEventListener("click", () => {
    stopTimer();
    timerSeconds = Number($("#focusTime").value) * 60;
    $("#timerMessage").textContent = "Quando estiver pronto, podemos começar.";
    updateTimer();
});

$("#applyTimer").addEventListener("click", () => {
    const focus = Number($("#focusTime").value);
    const rest = Number($("#restTime").value);

    if (
        !Number.isInteger(focus) ||
        !Number.isInteger(rest) ||
        focus < 1 || focus > 120 ||
        rest < 1 || rest > 60
    ) {
        notify("Informe tempos válidos.");
        return;
    }

    stopTimer();
    timerSeconds = focus * 60;
    updateTimer();

    $("#timerMessage").textContent =
        "Configurações atualizadas.";

    notify("Tempo atualizado!");
});

/* ACESSIBILIDADE */

let fontSize = load("c2_font", 16);

const preferences = load("c2_settings", {
    contrast: false,
    motion: false,
    soft: false,
    spacing: false
});

function applyPreferences() {
    document.body.classList.toggle(
        "high-contrast", preferences.contrast
    );

    document.body.classList.toggle(
        "reduce-motion", preferences.motion
    );

    document.body.classList.toggle(
        "soft-mode", preferences.soft
    );

    document.body.classList.toggle(
        "large-spacing", preferences.spacing
    );

    $("#contrast").checked = preferences.contrast;
    $("#motion").checked = preferences.motion;
    $("#soft").checked = preferences.soft;
    $("#spacing").checked = preferences.spacing;

    document.documentElement.style.setProperty(
        "--font-size", fontSize + "px"
    );

    save("c2_settings", preferences);
    save("c2_font", fontSize);
}

[
    ["contrast", "contrast"],
    ["motion", "motion"],
    ["soft", "soft"],
    ["spacing", "spacing"]
].forEach(([elementId, setting]) => {
    $("#" + elementId).addEventListener("change", event => {
        preferences[setting] = event.target.checked;
        applyPreferences();
    });
});

$("#fontUp").addEventListener("click", () => {
    fontSize = Math.min(24, fontSize + 1);
    applyPreferences();
});

$("#fontDown").addEventListener("click", () => {
    fontSize = Math.max(12, fontSize - 1);
    applyPreferences();
});

$("#resetSettings").addEventListener("click", () => {
    preferences.contrast = false;
    preferences.motion = false;
    preferences.soft = false;
    preferences.spacing = false;
    fontSize = 16;

    applyPreferences();
    notify("Preferências restauradas!");
});

/* INICIALIZAÇÃO */

function initialize() {
    renderTasks();
    renderRoutine();
    renderCommunication();
    renderMoods();
    renderNotes();
    applyPreferences();
    updateTimer();
}

initialize();
