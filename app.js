import { celebrate } from "./celebration.js";
import { categories, loadGoals, saveGoals } from "./goals-store.js";

const goalList = document.querySelector("#goalList");
const historyList = document.querySelector("#historyList");
const historyDialog = document.querySelector("#historyDialog");
const featuredGrid = document.querySelector("#featuredGrid");
const legendGallery = document.querySelector("#legendGallery");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#goalDialog");
const memoryDialog = document.querySelector("#memoryDialog");
const celebrationDialog = document.querySelector("#celebrationDialog");
const form = document.querySelector("#goalForm");
const titleInput = document.querySelector("#goalTitle");
const filterButtons = [...document.querySelectorAll(".filter-chip")];
let goals = [];
let activeFilter = "all";
let activeScreen = "challenges";
let editingId = null;
let subtaskDraft = [];
let memoryGoalId = null;
let celebratingGoalId = null;
let toastTimeout;
let habitDayTimeout;
let renderedHabitDate = "";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatDate(date, includeYear = true) {
  if (!date) return "Fecha no registrada";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Fecha no registrada";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", ...(includeYear && { year: "numeric" }) }).format(parsed);
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function completionDate(goal) {
  return goal.completedAt || goal.createdAt;
}

function completedGoals() {
  return goals.filter((goal) => goal.category !== "habit" && goal.completed);
}

function updateCounters() {
  const completed = completedGoals();
  document.querySelector("#headerDoneCount").textContent = String(completed.length);
  document.querySelector("#historyCount").textContent = String(completed.length);
  document.querySelector("#clearHistory").disabled = completed.length === 0;
  document.querySelector("#legendCount").textContent = String(completed.filter((goal) => goal.category === "legend").length);
}

function render() {
  document.querySelectorAll(".screen-view").forEach((screen) => {
    screen.hidden = screen.id !== `${activeScreen}View`;
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    const selected = item.dataset.screen === activeScreen;
    item.classList.toggle("is-active", selected);
    if (selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  document.querySelector("#addGoal").hidden = activeScreen !== "challenges";
  updateCounters();
  renderChallenges();
  renderShowcase();
  renderHistory();
  renderedHabitDate = localDateKey();
}

function cardMarkup(goal, index) {
  const category = categories[goal.category];
  const habitDoneToday = goal.category === "habit" && goal.lastCompletedDate === localDateKey();
  const completed = goal.completed || habitDoneToday;
  const completedClass = goal.completed ? " is-completed" : habitDoneToday ? " is-completed-day" : "";
  const completedSubtasks = (goal.subtasks ?? []).filter((subtask) => subtask.completed).length;
  const chainMarkup = goal.subtasks?.length ? `<div class="goal-chain">
      <button class="chain-toggle" type="button" data-toggle-chain aria-expanded="false">Camino <span>${completedSubtasks}/${goal.subtasks.length}</span></button>
      <div class="chain-steps" hidden>${goal.subtasks.map((subtask) => `<label class="chain-step"><input type="checkbox" data-subtask="${escapeHtml(subtask.id)}" ${subtask.completed ? "checked" : ""} ${goal.completed ? "disabled" : ""} /><span>${escapeHtml(subtask.title)}</span></label>`).join("")}</div>
    </div>` : "";
  const editMenuMarkup = goal.completed ? "" : `<div class="goal-menu-wrap">
      <button class="more-button" type="button" aria-label="Opciones de ${escapeHtml(goal.title)}" aria-haspopup="menu" aria-expanded="false">···</button>
      <div class="goal-menu" role="menu" hidden>
        <button class="goal-menu-item" type="button" role="menuitem">Editar / Notas y camino</button>
      </div>
    </div>`;
  return `<article class="goal-card${completedClass}" data-id="${escapeHtml(goal.id)}" data-category="${goal.category}" style="animation-delay:${Math.min(index * 45, 180)}ms">
    <input class="complete-toggle" type="checkbox" aria-label="${habitDoneToday ? "Hábito hecho hoy" : goal.completed ? "Reto conseguido" : `Completar ${escapeHtml(goal.title)}`}" ${completed ? "checked disabled" : ""} />
    <div class="goal-main" role="button" tabindex="0" aria-label="${goal.completed ? "Recordar" : "Editar"} ${escapeHtml(goal.title)}">
      <span class="goal-title">${escapeHtml(goal.title)}</span>
      <div class="goal-meta"><span class="category-badge"><span class="badge-emoji">${category.emoji}</span>${category.label}</span></div>
    </div>
    ${chainMarkup}
    ${editMenuMarkup}
  </article>`;
}

function achievementCardMarkup(goal, index, featured = false) {
  const category = categories[goal.category];
  const tags = (goal.tags ?? []).slice(0, 2).map((tag) => `<span class="achievement-tag">${escapeHtml(tag)}</span>`).join("");
  return `<article class="achievement-card${featured ? " featured-card" : ""}" style="animation-delay:${Math.min(index * 55, 220)}ms">
    <button class="pin-button${goal.pinned ? " is-pinned" : ""}" type="button" data-pin="${escapeHtml(goal.id)}" aria-label="${goal.pinned ? "Quitar de Mis logros" : "Añadir a Mis logros"}" aria-pressed="${Boolean(goal.pinned)}">${goal.pinned ? "★" : "☆"}</button>
    ${!featured ? `<button class="achievement-delete" type="button" data-delete-legend="${escapeHtml(goal.id)}" aria-label="Eliminar logro Leyenda: ${escapeHtml(goal.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>` : ""}
    <div class="achievement-open" role="button" tabindex="0" data-memory="${escapeHtml(goal.id)}" aria-label="Ver recuerdo: ${escapeHtml(goal.title)}">
      <span class="achievement-medal">${category.emoji}</span>
      <span class="achievement-category">${category.label} · HITO CONSEGUIDO</span>
      <strong class="achievement-title">${escapeHtml(goal.title)}</strong>
      <span class="achievement-date">${escapeHtml(formatDate(completionDate(goal)))}</span>
      ${tags ? `<span class="achievement-tags">${tags}</span>` : ""}
      <span class="achievement-view">Ver recuerdo <span aria-hidden="true">↗</span></span>
    </div>
  </article>`;
}

function renderChallenges() {
  const active = goals.filter((goal) => goal.category === "habit" || !goal.completed);
  const filtered = active.filter((goal) => activeFilter === "all" || goal.category === activeFilter);
  goalList.classList.remove("history-view");
  goalList.innerHTML = filtered.map((goal, index) => cardMarkup(goal, index)).join("");
  const noGoals = filtered.length === 0;
  emptyState.hidden = !noGoals;
  goalList.hidden = noGoals;
  document.querySelector("#emptyTitle").textContent = activeFilter === "all"
    ? "Todo empieza con una idea."
    : `Aún no hay retos de ${categories[activeFilter].label.toLowerCase()}.`;
  document.querySelector("#emptyCopy").textContent = "Añade tu primer reto y empieza a darle forma.";
}

function renderShowcase() {
  const pinned = completedGoals().filter((goal) => goal.category === "legend" && goal.pinned)
    .sort((a, b) => new Date(completionDate(b)) - new Date(completionDate(a)))
    .slice(0, 4);
  document.querySelector("#featuredCount").textContent = `${pinned.length} / 4`;
  featuredGrid.innerHTML = pinned.length
    ? pinned.map((goal, index) => achievementCardMarkup(goal, index, true)).join("")
    : `<div class="showcase-empty"><span class="showcase-empty-star" aria-hidden="true">✦</span><div><h3>Mis logros empiezan con una Leyenda.</h3><p>Expón hasta cuatro metas vitales desde el recuerdo de un logro Leyenda.</p><button class="text-button" type="button" data-go-history="true">Explorar logros <span aria-hidden="true">↗</span></button></div></div>`;

  const legends = completedGoals().filter((goal) => goal.category === "legend");
  updateThemeOptions(legends);
  const selectedTheme = document.querySelector("#legendTheme").value;
  const sort = document.querySelector("#legendSort").value;
  let filtered = legends.filter((goal) => selectedTheme === "all" || (goal.tags ?? []).includes(selectedTheme));
  if (sort === "oldest") filtered.sort((a, b) => new Date(completionDate(a)) - new Date(completionDate(b)));
  else if (sort === "theme") filtered.sort((a, b) => ((a.tags ?? [a.title])[0] ?? a.title).localeCompare((b.tags ?? [b.title])[0] ?? b.title, "es"));
  else filtered.sort((a, b) => new Date(completionDate(b)) - new Date(completionDate(a)));
  legendGallery.innerHTML = filtered.map((goal, index) => achievementCardMarkup(goal, index)).join("");
  const empty = filtered.length === 0;
  legendGallery.hidden = empty;
  document.querySelector("#legendEmpty").hidden = !empty;
  document.querySelector("#legendEmptyTitle").textContent = legends.length ? "No hay hitos para este tema." : "Aún no hay hitos Leyenda.";
  document.querySelector("#legendEmptyCopy").textContent = legends.length
    ? "Prueba con otro tema o vuelve a mostrar todos."
    : "Cuando consigas una meta vital, su recuerdo vivirá aquí.";
}

function updateThemeOptions(legends) {
  const select = document.querySelector("#legendTheme");
  const selected = select.value;
  const themes = [...new Set(legends.flatMap((goal) => goal.tags ?? []))].sort((a, b) => a.localeCompare(b, "es"));
  select.innerHTML = `<option value="all">Todos</option>${themes.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("")}`;
  select.value = themes.includes(selected) ? selected : "all";
}

function renderHistory() {
  const history = completedGoals()
    .sort((a, b) => new Date(completionDate(b)) - new Date(completionDate(a)));
  historyList.innerHTML = history.map((goal, index) => cardMarkup(goal, index)).join("");
  historyList.hidden = history.length === 0;
  document.querySelector("#historyEmpty").hidden = history.length > 0;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function persistGoals(updatedGoals) {
  if (!saveGoals(updatedGoals)) {
    showToast("No se pudieron guardar los cambios. Revisa el espacio disponible.");
    return false;
  }
  goals = updatedGoals;
  return true;
}

function openHistory() {
  document.querySelector("#includeLegendHistory").checked = false;
  renderHistory();
  historyDialog.showModal();
}

function clearHistory() {
  const archived = completedGoals();
  if (!archived.length) return;
  const includeLegend = document.querySelector("#includeLegendHistory").checked;
  const toDelete = archived.filter((goal) => includeLegend || goal.category !== "legend");
  if (!toDelete.length) {
    showToast("No hay otros logros que borrar. Activa la opción para incluir los logros Leyenda.");
    return;
  }
  const legendCount = toDelete.filter((goal) => goal.category === "legend").length;
  const confirmation = `¿Vaciar el historial? Se eliminarán ${toDelete.length} retos conseguidos${legendCount ? `, incluidos ${legendCount} Leyenda` : ""}. ${includeLegend ? "Los hábitos se conservarán." : "Los logros Leyenda y los hábitos se conservarán."}`;
  if (!window.confirm(confirmation)) return;
  const deletedIds = new Set(toDelete.map((goal) => goal.id));
  if (!persistGoals(goals.filter((goal) => !deletedIds.has(goal.id)))) return;
  render();
  showToast(includeLegend ? "Historial borrado, incluidos los logros Leyenda." : "Historial borrado. Los logros Leyenda se conservaron.");
}

function renderSubtaskEditor() {
  const list = document.querySelector("#subtaskEditorList");
  list.innerHTML = subtaskDraft.map((subtask, index) => `<div class="subtask-editor-row" data-subtask-index="${index}">
    <input class="text-input subtask-title-input" type="text" maxlength="100" value="${escapeHtml(subtask.title)}" aria-label="Etapa ${index + 1}" placeholder="Nombre de la etapa" />
    <button class="subtask-order-button" type="button" data-move-subtask="-1" aria-label="Subir etapa" ${index === 0 ? "disabled" : ""}>↑</button>
    <button class="subtask-order-button" type="button" data-move-subtask="1" aria-label="Bajar etapa" ${index === subtaskDraft.length - 1 ? "disabled" : ""}>↓</button>
    <button class="subtask-remove-button" type="button" data-remove-subtask aria-label="Eliminar etapa">×</button>
  </div>`).join("");
}

function openGoalDialog(goal = null) {
  editingId = goal?.id ?? null;
  form.reset();
  subtaskDraft = (goal?.subtasks ?? []).map((subtask) => ({ ...subtask }));
  dialog.classList.toggle("is-creating", !goal);
  document.querySelector("#dialogTitle").textContent = goal ? "Detalles del reto" : "Nuevo reto";
  document.querySelector("#deleteGoal").hidden = !goal;
  document.querySelector("#goalDetails").hidden = false;
  document.querySelector("#saveGoal").innerHTML = goal
    ? 'Guardar cambios <span aria-hidden="true">↗</span>'
    : 'Crear reto <span aria-hidden="true">↗</span>';
  titleInput.value = goal?.title ?? "";
  document.querySelector(`#goalForm input[name="category"][value="${goal?.category ?? "vida"}"]`).checked = true;
  document.querySelector("#goalNotes").value = goal?.notes ?? "";
  document.querySelector("#goalTags").value = (goal?.tags ?? []).join(", ");
  renderSubtaskEditor();
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

document.querySelector("#addSubtask").addEventListener("click", () => {
  subtaskDraft.push({ id: crypto.randomUUID(), title: "", completed: false });
  renderSubtaskEditor();
  document.querySelectorAll("#subtaskEditorList .subtask-title-input").at(-1)?.focus();
});
document.querySelector("#subtaskEditorList").addEventListener("input", (event) => {
  if (!event.target.matches(".subtask-title-input")) return;
  const index = Number(event.target.closest("[data-subtask-index]").dataset.subtaskIndex);
  if (subtaskDraft[index]) subtaskDraft[index].title = event.target.value;
});
document.querySelector("#subtaskEditorList").addEventListener("click", (event) => {
  const row = event.target.closest("[data-subtask-index]");
  if (!row) return;
  const index = Number(row.dataset.subtaskIndex);
  if (event.target.closest("[data-remove-subtask]")) subtaskDraft.splice(index, 1);
  else if (event.target.closest("[data-move-subtask]")) {
    const targetIndex = index + Number(event.target.closest("[data-move-subtask]").dataset.moveSubtask);
    if (targetIndex < 0 || targetIndex >= subtaskDraft.length) return;
    [subtaskDraft[index], subtaskDraft[targetIndex]] = [subtaskDraft[targetIndex], subtaskDraft[index]];
  } else return;
  renderSubtaskEditor();
});

function notesHistoryFor(goal, timestamp) {
  const history = [...(goal?.notesHistory ?? [])];
  if (goal?.notes && goal.notes !== goal.notesHistory?.at(-1)?.text) {
    history.push({ text: goal.notes, createdAt: goal.completedAt || goal.createdAt || timestamp });
  }
  return history;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const previous = goals.find((goal) => goal.id === editingId);
  const now = new Date().toISOString();
  const nextNotes = String(data.get("notes")).trim();
  const nextCategory = String(data.get("category"));
  const previousNotesHistory = notesHistoryFor(previous, now);
  if (previous && nextNotes && nextNotes !== previous.notes) previousNotesHistory.push({ text: nextNotes, createdAt: now });
  const subtasks = subtaskDraft
    .map((subtask) => ({ ...subtask, title: subtask.title.trim() }))
    .filter((subtask) => subtask.title);
  const goal = {
    id: editingId ?? crypto.randomUUID(),
    title: String(data.get("title")).trim(),
    category: nextCategory,
    notes: nextNotes,
    completed: nextCategory === "habit" ? false : previous?.completed ?? false,
    completedAt: nextCategory === "habit" ? "" : previous?.completedAt ?? "",
    pinned: nextCategory === "legend" ? previous?.pinned ?? false : false,
    reflection: previous?.reflection ?? "",
    tags: String(data.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean),
    notesHistory: previousNotesHistory,
    subtasks,
    ...(nextCategory === "habit" && { lastCompletedDate: previous?.category === "habit" ? previous.lastCompletedDate ?? "" : "" }),
    createdAt: previous?.createdAt ?? now,
  };
  if (!goal.title || !categories[goal.category]) return;
  const updatedGoals = previous ? goals.map((item) => item.id === editingId ? goal : item) : [goal, ...goals];
  if (!persistGoals(updatedGoals)) return;
  dialog.close();
  render();
  showToast(previous ? "Reto actualizado." : "Nuevo reto añadido. ¡A por ello!");
});

document.querySelector("#deleteGoal").addEventListener("click", () => {
  if (!editingId) return;
  const goal = goals.find((item) => item.id === editingId);
  if (!goal || !window.confirm(`¿Eliminar "${goal.title}"? Esta acción no se puede deshacer.`)) return;
  if (!persistGoals(goals.filter((item) => item.id !== editingId))) return;
  dialog.close();
  render();
  showToast("Reto eliminado.");
});

function togglePin(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal?.completed || goal.category !== "legend") return;
  const shouldPin = !goal.pinned;
  if (shouldPin && completedGoals().filter((item) => item.category === "legend" && item.pinned).length >= 4) {
    showToast("Mis logros admite hasta cuatro Leyendas. Quita una para hacer espacio.");
    return;
  }
  if (!persistGoals(goals.map((item) => item.id === goalId ? { ...item, pinned: shouldPin } : item))) return;
  render();
  if (memoryGoalId === goalId && memoryDialog.open) renderMemory(goalId);
  showToast(shouldPin ? "Logro añadido a Mis logros." : "Logro retirado de Mis logros.");
}

function openMemory(goalId) {
  const goal = goals.find((item) => item.id === goalId && item.completed);
  if (!goal) return;
  memoryGoalId = goal.id;
  renderMemory(goal.id);
  memoryDialog.showModal();
}

function renderMemory(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal) return;
  document.querySelector("#memoryTitle").textContent = goal.title;
  document.querySelector("#memoryBadges").innerHTML = `<span class="category-badge memory-category">${categories[goal.category].emoji} ${categories[goal.category].label}</span>${(goal.tags ?? []).map((tag) => `<span class="achievement-tag">${escapeHtml(tag)}</span>`).join("")}`;
  document.querySelector("#memoryDate").textContent = `Conseguido el ${formatDate(completionDate(goal))}`;
  const memoryChain = document.querySelector("#memoryChain");
  memoryChain.hidden = !goal.subtasks?.length;
  memoryChain.innerHTML = goal.subtasks?.length
    ? `<h3>Retos Cadena · ${goal.subtasks.filter((subtask) => subtask.completed).length}/${goal.subtasks.length}</h3><ol>${goal.subtasks.map((subtask) => `<li>${subtask.completed ? "✓" : "○"} ${escapeHtml(subtask.title)}</li>`).join("")}</ol>`
    : "";
  const notes = notesHistoryFor(goal, completionDate(goal));
  document.querySelector("#memoryNotes").innerHTML = notes.length
    ? notes.map((note) => `<p class="memory-log-entry"><span>${escapeHtml(formatDate(note.createdAt))}</span>${escapeHtml(note.text)}</p>`).join("")
    : '<p class="memory-log-empty">No se guardaron notas para este reto.</p>';
  document.querySelector("#finalReflection").value = goal.reflection ?? "";
  const pin = document.querySelector("#memoryPin");
  pin.hidden = goal.category !== "legend";
  pin.textContent = goal.pinned ? "★ En Mis logros" : "☆ Añadir a Mis logros";
  pin.classList.toggle("is-pinned", Boolean(goal.pinned));
}

document.querySelector("#saveReflection").addEventListener("click", () => {
  const goal = goals.find((item) => item.id === memoryGoalId);
  if (!goal) return;
  const reflection = document.querySelector("#finalReflection").value.trim();
  if (!persistGoals(goals.map((item) => item.id === goal.id ? { ...item, reflection } : item))) return;
  showToast("Reflexión guardada.");
  render();
});

document.querySelector("#memoryPin").addEventListener("click", () => togglePin(memoryGoalId));
document.querySelector("#closeMemory").addEventListener("click", () => memoryDialog.close());
memoryDialog.addEventListener("click", (event) => {
  if (event.target === memoryDialog) memoryDialog.close();
});

function finishLegendCelebration(pin) {
  const goal = goals.find((item) => item.id === celebratingGoalId);
  let pinnedOnFinish = pin;
  if (pin && goal && !goal.pinned) {
    const pinnedCount = completedGoals().filter((item) => item.category === "legend" && item.pinned).length;
    if (pinnedCount >= 4) {
      pinnedOnFinish = false;
      showToast("Mis logros está lleno. Puedes exponerlo más tarde desde el recuerdo.");
    } else pinnedOnFinish = persistGoals(goals.map((item) => item.id === goal.id ? { ...item, pinned: true } : item));
  }
  celebrationDialog.close();
  const card = goalList.querySelector(`[data-id="${CSS.escape(celebratingGoalId ?? "")}"]`);
  if (card) card.classList.add("is-completing");
  setTimeout(() => {
    celebratingGoalId = null;
    render();
    if (pinnedOnFinish) showToast("¡Hito celebrado en Mis logros!");
    else if (pin) showToast("¡Reto conseguido! Mis logros está lleno; puedes exponerlo desde el recuerdo.");
    else showToast("¡Reto conseguido! Un paso más en tu camino.");
  }, 380);
}

function openLegendCelebration(goal) {
  celebratingGoalId = goal.id;
  document.querySelector("#celebrationGoal").textContent = goal.title;
  celebrationDialog.showModal();
}

function completeGoal(goal, card) {
  const now = new Date().toISOString();
  const notesHistory = notesHistoryFor(goal, now);
  if (goal.notes && notesHistory.at(-1)?.text !== goal.notes) notesHistory.push({ text: goal.notes, createdAt: now });
  const completedGoal = { ...goal, completed: true, completedAt: now, notesHistory };
  if (!persistGoals(goals.map((item) => item.id === goal.id ? completedGoal : item))) return;
  celebrate().then(() => {
    if (completedGoal.category === "legend") openLegendCelebration(completedGoal);
    else {
      card?.classList.add("is-completing");
      setTimeout(() => {
        render();
        showToast("¡Reto conseguido! Un paso más en tu camino.");
      }, 380);
    }
  });
}

document.querySelector("#featureAchievement").addEventListener("click", () => finishLegendCelebration(true));
document.querySelector("#skipFeature").addEventListener("click", () => finishLegendCelebration(false));
celebrationDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  finishLegendCelebration(false);
});
celebrationDialog.addEventListener("click", (event) => {
  if (event.target === celebrationDialog) finishLegendCelebration(false);
});

async function downloadAchievementCard(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f7f7f4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#c8ae73";
  context.lineWidth = 3;
  context.strokeRect(42, 42, 996, 1266);
  context.fillStyle = "#e9e4d4";
  context.beginPath();
  context.arc(540, 310, 108, 0, Math.PI * 2);
  context.fill();
  context.textAlign = "center";
  context.fillStyle = "#a9843d";
  context.font = "88px sans-serif";
  context.fillText(categories[goal.category].emoji, 540, 340);
  context.fillStyle = "#81827b";
  context.font = "600 24px sans-serif";
  context.fillText("UN LOGRO PERSONAL", 540, 512);
  context.fillStyle = "#20211e";
  context.font = "700 58px sans-serif";
  const words = goal.title.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > 850 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  lines.slice(0, 4).forEach((text, index) => context.fillText(text, 540, 630 + index * 78));
  const detailsY = 630 + Math.min(lines.length, 4) * 78 + 70;
  context.fillStyle = "#536d5a";
  context.font = "500 32px sans-serif";
  context.fillText(`Conseguido el ${formatDate(completionDate(goal))}`, 540, detailsY);
  context.fillStyle = "#536d5a";
  context.font = "800 38px sans-serif";
  context.fillText("rumbo.", 540, 1190);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    showToast("No se pudo crear la tarjeta. Inténtalo de nuevo.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rumbo-${goal.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "logro"}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Tu tarjeta de logro está lista.");
}

async function shareAchievement(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal) return;
  const message = `He conseguido: ${goal.title} · ${formatDate(completionDate(goal))}`;
  if (!navigator.share) {
    await downloadAchievementCard(goalId);
    return;
  }
  try {
    await navigator.share({ title: "Un logro en Rumbo", text: message });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("No se pudo compartir el logro.", error);
      showToast("No se pudo compartir el logro.");
    }
  }
}

document.querySelector("#memoryDownload").addEventListener("click", () => downloadAchievementCard(memoryGoalId));
document.querySelector("#memoryShare").addEventListener("click", () => shareAchievement(memoryGoalId));
document.querySelector("#celebrationDownload").addEventListener("click", () => downloadAchievementCard(celebratingGoalId));
document.querySelector("#celebrationShare").addEventListener("click", () => shareAchievement(celebratingGoalId));

function handleGoalListClick(event) {
  const pinButton = event.target.closest("[data-pin]");
  if (pinButton) {
    event.stopPropagation();
    togglePin(pinButton.dataset.pin);
    return;
  }
  const card = event.target.closest(".goal-card");
  if (!card) return;
  const goal = goals.find((item) => item.id === card.dataset.id);
  if (!goal) return;
  const chainToggle = event.target.closest("[data-toggle-chain]");
  if (chainToggle) {
    const steps = chainToggle.nextElementSibling;
    steps.hidden = !steps.hidden;
    chainToggle.setAttribute("aria-expanded", String(!steps.hidden));
    return;
  }
  if (event.target.matches("[data-subtask]")) {
    if (goal.completed) return;
    const subtaskId = event.target.dataset.subtask;
    const updatedGoal = {
      ...goal,
      subtasks: goal.subtasks.map((subtask) => subtask.id === subtaskId
        ? { ...subtask, completed: event.target.checked }
        : subtask),
    };
    if (!persistGoals(goals.map((item) => item.id === goal.id ? updatedGoal : item))) return;
    const allComplete = updatedGoal.subtasks.length > 0 && updatedGoal.subtasks.every((subtask) => subtask.completed);
    if (allComplete && window.confirm(`Has completado todas las etapas de "${goal.title}". ¿Marcar también el reto principal como conseguido?`)) {
      if (goal.category === "habit") {
        if (!persistGoals(goals.map((item) => item.id === goal.id ? { ...updatedGoal, lastCompletedDate: localDateKey() } : item))) return;
        renderChallenges();
        celebrate().then(() => showToast("¡Camino completado! Hábito hecho hoy."));
      } else completeGoal(updatedGoal, card);
      return;
    }
    renderChallenges();
    const refreshedCard = goalList.querySelector(`[data-id="${CSS.escape(goal.id)}"]`);
    if (refreshedCard) {
      const toggle = refreshedCard.querySelector("[data-toggle-chain]");
      toggle.nextElementSibling.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }
    return;
  }
  if (event.target.matches(".complete-toggle") && goal.category === "habit" && goal.lastCompletedDate !== localDateKey()) {
    const updatedGoal = { ...goal, lastCompletedDate: localDateKey() };
    if (!persistGoals(goals.map((item) => item.id === goal.id ? updatedGoal : item))) return;
    renderChallenges();
    celebrate().then(() => showToast("¡Hábito hecho hoy! Un día más de constancia."));
    return;
  }
  if (event.target.matches(".complete-toggle") && !goal.completed) {
    completeGoal(goal, card);
    return;
  }
  const moreButton = event.target.closest(".more-button");
  if (moreButton) {
    const menu = moreButton.nextElementSibling;
    const shouldOpen = menu.hidden;
    document.querySelectorAll(".goal-menu").forEach((item) => {
      item.hidden = true;
      item.previousElementSibling.setAttribute("aria-expanded", "false");
    });
    menu.hidden = !shouldOpen;
    moreButton.setAttribute("aria-expanded", String(shouldOpen));
    return;
  }
  if (event.target.closest(".goal-menu-item")) {
    const menu = event.target.closest(".goal-menu");
    menu.hidden = true;
    menu.previousElementSibling.setAttribute("aria-expanded", "false");
    openGoalDialog(goal);
    return;
  }
  if (event.target.closest(".goal-main")) {
    if (goal.completed) openMemory(goal.id);
    else openGoalDialog(goal);
  }
}

goalList.addEventListener("click", handleGoalListClick);
historyList.addEventListener("click", handleGoalListClick);

function handleGoalListKeydown(event) {
  if ((event.key !== "Enter" && event.key !== " ") || !event.target.matches(".goal-main")) return;
  event.preventDefault();
  const goal = goals.find((item) => item.id === event.target.closest(".goal-card").dataset.id);
  if (goal?.completed) openMemory(goal.id);
  else if (goal) openGoalDialog(goal);
}
goalList.addEventListener("keydown", handleGoalListKeydown);
historyList.addEventListener("keydown", handleGoalListKeydown);

function handleAchievementClick(event) {
  const deleteButton = event.target.closest("[data-delete-legend]");
  if (deleteButton) {
    event.stopPropagation();
    const goal = goals.find((item) => item.id === deleteButton.dataset.deleteLegend && item.category === "legend" && item.completed);
    if (!goal || !window.confirm(`¿Eliminar "${goal.title}" del Archivo Leyenda? Esta acción no se puede deshacer.`)) return;
    if (!persistGoals(goals.filter((item) => item.id !== goal.id))) return;
    render();
    if (memoryGoalId === goal.id && memoryDialog.open) memoryDialog.close();
    showToast("Logro eliminado del Archivo Leyenda.");
    return;
  }
  const pinButton = event.target.closest("[data-pin]");
  if (pinButton) {
    event.stopPropagation();
    togglePin(pinButton.dataset.pin);
    return;
  }
  const openButton = event.target.closest("[data-memory]");
  if (openButton) openMemory(openButton.dataset.memory);
  if (event.target.closest("[data-go-history]")) openHistory();
}
featuredGrid.addEventListener("click", handleAchievementClick);
legendGallery.addEventListener("click", handleAchievementClick);
function handleAchievementKeydown(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-memory]")) {
    event.preventDefault();
    openMemory(event.target.dataset.memory);
  }
}
featuredGrid.addEventListener("keydown", handleAchievementKeydown);
legendGallery.addEventListener("keydown", handleAchievementKeydown);

document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".goal-menu-wrap")) return;
  document.querySelectorAll(".goal-menu").forEach((menu) => {
    menu.hidden = true;
    menu.previousElementSibling.setAttribute("aria-expanded", "false");
  });
});
document.querySelector("#addGoal").addEventListener("click", () => openGoalDialog());
document.querySelector("#emptyAdd").addEventListener("click", () => openGoalDialog());
document.querySelector("#historyShortcut").addEventListener("click", openHistory);
document.querySelector("#closeHistory").addEventListener("click", () => historyDialog.close());
document.querySelector("#clearHistory").addEventListener("click", clearHistory);
historyDialog.addEventListener("click", (event) => {
  if (event.target === historyDialog) historyDialog.close();
});

function navigate(screen) {
  activeScreen = screen;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.screen)));
filterButtons.forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filterButtons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  renderChallenges();
}));
document.querySelector("#legendSort").addEventListener("change", renderShowcase);
document.querySelector("#legendTheme").addEventListener("change", renderShowcase);

function refreshHabitDay() {
  const today = localDateKey();
  if (today === renderedHabitDate) return;
  renderChallenges();
  renderedHabitDate = today;
}

function scheduleHabitDayRefresh() {
  clearTimeout(habitDayTimeout);
  const nextDay = new Date();
  nextDay.setHours(24, 0, 0, 250);
  habitDayTimeout = setTimeout(() => {
    refreshHabitDay();
    scheduleHabitDayRefresh();
  }, nextDay.getTime() - Date.now());
}

window.addEventListener("focus", refreshHabitDay);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshHabitDay();
});

document.addEventListener("rumbo:unlocked", () => {
  const loadedGoals = loadGoals();
  goals = loadedGoals.goals;
  render();
  scheduleHabitDayRefresh();
  if (loadedGoals.error) showToast(loadedGoals.error);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("No se pudo activar el modo sin conexión.", error);
    });
  }
}, { once: true });
