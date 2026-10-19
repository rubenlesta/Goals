import { categories, loadGoals, saveGoals } from "./goals-store.js";

const list = document.querySelector("#goalList");
const dialog = document.querySelector("#goalDialog");
const form = document.querySelector("#goalForm");
const loaded = loadGoals();
let goals = loaded.goals;
let filter = "all";
let showingHistory = false;
let editingId = null;
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatDate(date) {
  if (!date) return "";
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? "" : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("is-visible"), 2600);
}

function persist(updated) {
  if (!saveGoals(updated)) {
    toast("No se pudieron guardar los cambios. Comprueba el almacenamiento del navegador.");
    return false;
  }
  goals = updated;
  return true;
}

function card(goal, index) {
  const category = categories[goal.category];
  const date = goal.targetDate ? `<span>${escapeHtml(formatDate(goal.targetDate))}</span>` : "";
  const record = goal.bestRecord ? `<div class="goal-record">Récord actual <strong>· ${escapeHtml(goal.bestRecord)}</strong></div>` : "";
  return `<article class="goal-card" data-id="${escapeHtml(goal.id)}" data-category="${goal.category}" style="animation-delay:${Math.min(index * 40, 160)}ms">
    <input class="complete-toggle" type="checkbox" aria-label="Completar ${escapeHtml(goal.title)}" />
    <div class="goal-main" role="button" tabindex="0"><span class="goal-title">${escapeHtml(goal.title)}</span><div class="goal-meta"><span class="category-badge">${category.emoji} ${category.label}</span>${date}</div>${record}</div>
    <button class="more-button" type="button" aria-label="Editar ${escapeHtml(goal.title)}">···</button>
  </article>`;
}

function render() {
  const active = goals.filter((goal) => !goal.completed);
  const completed = goals.filter((goal) => goal.completed);
  const source = showingHistory ? completed : active;
  const filtered = source.filter((goal) => showingHistory || filter === "all" || goal.category === filter);
  list.innerHTML = filtered.map(card).join("");
  list.hidden = filtered.length === 0;
  document.querySelector("#emptyState").hidden = filtered.length !== 0;
  document.querySelector("#emptyTitle").textContent = showingHistory ? "Tus logros aparecerán aquí." : "Todo empieza con una idea.";
  document.querySelector("#emptyCopy").textContent = showingHistory ? "Completa un reto y vuelve para revivir el momento." : "Añade tu primer reto y empieza a darle forma.";
  document.querySelector("#emptyAdd").hidden = showingHistory;
  document.querySelector("#activeCount").textContent = String(showingHistory ? completed.length : active.length);
  document.querySelector("#listKicker").textContent = showingHistory ? "RETOS CONSEGUIDOS" : "EN MARCHA";
  document.querySelector("#listTitle").childNodes[0].textContent = showingHistory ? "Conseguidos " : "Mis retos ";
  document.querySelector("#showHistory").textContent = showingHistory ? "Volver a mis retos ↗" : "Conseguidos ↗";
  document.querySelector("#progressNumbers").textContent = `${completed.length} de ${goals.length}`;
  document.querySelector("#progressLabel").textContent = completed.length ? "Mira todo lo que has avanzado" : "Tu camino, a tu ritmo";
  document.querySelector("#overallProgress").style.width = `${goals.length ? (completed.length / goals.length) * 100 : 0}%`;
}

function openEditor(goal = null) {
  editingId = goal?.id ?? null;
  form.reset();
  document.querySelector("#dialogTitle").textContent = goal ? "Editar reto" : "Nuevo reto";
  document.querySelector("#deleteGoal").hidden = !goal;
  form.elements.title.value = goal?.title ?? "";
  form.elements.category.value = goal?.category ?? "bronze";
  form.elements.targetDate.value = goal?.targetDate ?? "";
  form.elements.bestRecord.value = goal?.bestRecord ?? "";
  form.elements.notes.value = goal?.notes ?? "";
  dialog.showModal();
  requestAnimationFrame(() => form.elements.title.focus());
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const previous = goals.find((goal) => goal.id === editingId);
  const data = new FormData(form);
  const goal = {
    id: editingId ?? crypto.randomUUID(),
    title: String(data.get("title")).trim(),
    category: String(data.get("category")),
    targetDate: String(data.get("targetDate")),
    bestRecord: String(data.get("bestRecord")).trim(),
    notes: String(data.get("notes")).trim(),
    completed: previous?.completed ?? false,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
  if (!goal.title || !categories[goal.category]) return;
  const updated = previous ? goals.map((item) => item.id === goal.id ? goal : item) : [goal, ...goals];
  if (!persist(updated)) return;
  dialog.close();
  render();
  toast(previous ? "Reto actualizado." : "Nuevo reto añadido.");
});

document.querySelector("#deleteGoal").addEventListener("click", () => {
  const goal = goals.find((item) => item.id === editingId);
  if (!goal || !confirm(`¿Eliminar "${goal.title}"?`)) return;
  if (!persist(goals.filter((item) => item.id !== editingId))) return;
  dialog.close();
  render();
  toast("Reto eliminado.");
});

list.addEventListener("click", (event) => {
  const item = event.target.closest(".goal-card");
  const goal = goals.find((value) => value.id === item?.dataset.id);
  if (!goal) return;
  if (event.target.matches(".complete-toggle")) {
    if (!persist(goals.map((value) => value.id === goal.id ? { ...value, completed: true } : value))) return;
    render();
    toast("¡Reto conseguido!");
    return;
  }
  if (event.target.closest(".more-button") || event.target.closest(".goal-main")) openEditor(goal);
});
list.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".goal-main")) {
    event.preventDefault();
    const goal = goals.find((item) => item.id === event.target.closest(".goal-card").dataset.id);
    if (goal) openEditor(goal);
  }
});

document.querySelector("#addGoal").addEventListener("click", () => openEditor());
document.querySelector("#emptyAdd").addEventListener("click", () => openEditor());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#showHistory").addEventListener("click", () => { showingHistory = !showingHistory; render(); });
document.querySelectorAll(".filter-chip").forEach((button) => button.addEventListener("click", () => {
  filter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach((item) => item.classList.toggle("is-selected", item === button));
  render();
}));

render();
if (loaded.error) toast(loaded.error);
