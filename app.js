import { celebrate } from "./celebration.js";
import { categories, loadGoals, parseStreakRecord, saveGoals } from "./goals-store.js";

const goalList = document.querySelector("#goalList");
const historyList = document.querySelector("#historyList");
const historyDialog = document.querySelector("#historyDialog");
const featuredGrid = document.querySelector("#featuredGrid");
const goldGallery = document.querySelector("#goldGallery");
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

function previousDateKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}

function completionDate(goal) {
  return goal.completedAt || goal.createdAt;
}

function completedGoals() {
  return goals.filter((goal) => goal.category !== "habit" && goal.completed);
}

function updateCounters() {
  const completed = completedGoals();
  const active = goals.filter((goal) => goal.category === "habit" || !goal.completed);
  document.querySelector("#activeCount").textContent = String(active.length);
  document.querySelector("#headerDoneCount").textContent = String(completed.length);
  document.querySelector("#historyCount").textContent = String(completed.length);
  document.querySelector("#clearHistory").disabled = completed.length === 0;
  document.querySelector("#goldCount").textContent = String(completed.filter((goal) => goal.category === "gold").length);
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
  const dateMarkup = goal.targetDate ? `<span class="goal-date"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M5 2v3M11 2v3M2.5 6.5h11"/></svg>${escapeHtml(formatDate(`${goal.targetDate}T12:00:00`))}</span>` : "";
  const habitStreak = goal.lastCompletedDate === localDateKey() || goal.lastCompletedDate === previousDateKey()
    ? Number(goal.streakDays) || 0
    : 0;
  const recordMarkup = goal.category === "habit"
    ? `<div class="goal-record">Racha actual <strong>· ${habitStreak} ${habitStreak === 1 ? "día" : "días"}</strong>${goal.bestStreakDays ? ` · Récord de racha <strong>${goal.bestStreakDays} ${goal.bestStreakDays === 1 ? "día" : "días"}</strong>` : ""}${goal.bestRecord && !parseStreakRecord(goal.bestRecord) ? `<br />Récord anotado <strong>· ${escapeHtml(goal.bestRecord)}</strong>` : ""}</div>`
    : goal.bestRecord ? `<div class="goal-record">Récord actual <strong>· ${escapeHtml(goal.bestRecord)}</strong></div>` : "";
  const pinMarkup = goal.completed ? `<button class="pin-button${goal.pinned ? " is-pinned" : ""}" type="button" data-pin="${escapeHtml(goal.id)}" aria-label="${goal.pinned ? "Quitar de la Vitrina" : "Fijar en la Vitrina"}" aria-pressed="${Boolean(goal.pinned)}">${goal.pinned ? "★" : "☆"}</button>` : "";
  const completedClass = goal.completed ? " is-completed" : habitDoneToday ? " is-completed-day" : "";
  const editMenuMarkup = goal.completed ? "" : `<div class="goal-menu-wrap">
      <button class="more-button" type="button" aria-label="Opciones de ${escapeHtml(goal.title)}" aria-haspopup="menu" aria-expanded="false">···</button>
      <div class="goal-menu" role="menu" hidden>
        <button class="goal-menu-item" type="button" role="menuitem">Editar / Detalles</button>
      </div>
    </div>`;
  return `<article class="goal-card${completedClass}" data-id="${escapeHtml(goal.id)}" data-category="${goal.category}" style="animation-delay:${Math.min(index * 45, 180)}ms">
    <input class="complete-toggle" type="checkbox" aria-label="${habitDoneToday ? "Hábito hecho hoy" : goal.completed ? "Reto conseguido" : `Completar ${escapeHtml(goal.title)}`}" ${completed ? "checked disabled" : ""} />
    <div class="goal-main" role="button" tabindex="0" aria-label="${goal.completed ? "Recordar" : "Editar"} ${escapeHtml(goal.title)}">
      <span class="goal-title">${escapeHtml(goal.title)}</span>
      <div class="goal-meta"><span class="category-badge"><span class="badge-emoji">${category.emoji}</span>${category.label}</span>${habitDoneToday ? '<span class="habit-done-badge">Hecho hoy</span>' : ""}${dateMarkup}</div>
      ${recordMarkup}
    </div>
    ${pinMarkup}
    ${editMenuMarkup}
  </article>`;
}

function achievementCardMarkup(goal, index, featured = false) {
  const category = categories[goal.category];
  const tags = (goal.tags ?? []).slice(0, 2).map((tag) => `<span class="achievement-tag">${escapeHtml(tag)}</span>`).join("");
  return `<article class="achievement-card${featured ? " featured-card" : ""}" style="animation-delay:${Math.min(index * 55, 220)}ms">
    <button class="pin-button${goal.pinned ? " is-pinned" : ""}" type="button" data-pin="${escapeHtml(goal.id)}" aria-label="${goal.pinned ? "Quitar de la Vitrina" : "Quitar de la Vitrina"}" aria-pressed="true">★</button>
    <div class="achievement-open" role="button" tabindex="0" data-memory="${escapeHtml(goal.id)}" aria-label="Ver recuerdo: ${escapeHtml(goal.title)}">
      <span class="achievement-medal">${category.emoji}</span>
      <span class="achievement-category">${category.label} · HITO CONSEGUIDO</span>
      <strong class="achievement-title">${escapeHtml(goal.title)}</strong>
      <span class="achievement-date">${escapeHtml(formatDate(completionDate(goal)))}</span>
      ${goal.bestRecord ? `<span class="achievement-record">Récord · ${escapeHtml(goal.bestRecord)}</span>` : ""}
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
  const pinned = completedGoals().filter((goal) => goal.pinned)
    .sort((a, b) => new Date(completionDate(b)) - new Date(completionDate(a)))
    .slice(0, 3);
  document.querySelector("#featuredCount").textContent = `${pinned.length} / 3`;
  featuredGrid.innerHTML = pinned.length
    ? pinned.map((goal, index) => achievementCardMarkup(goal, index, true)).join("")
    : `<div class="showcase-empty"><span class="showcase-empty-star" aria-hidden="true">✦</span><div><h3>Tu vitrina empieza con un logro.</h3><p>Fija hasta tres momentos especiales desde cualquier recuerdo completado.</p><button class="text-button" type="button" data-go-history="true">Explorar logros <span aria-hidden="true">↗</span></button></div></div>`;

  const golds = completedGoals().filter((goal) => goal.category === "gold");
  updateThemeOptions(golds);
  const selectedTheme = document.querySelector("#goldTheme").value;
  const sort = document.querySelector("#goldSort").value;
  let filtered = golds.filter((goal) => selectedTheme === "all" || (goal.tags ?? []).includes(selectedTheme));
  if (sort === "oldest") filtered.sort((a, b) => new Date(completionDate(a)) - new Date(completionDate(b)));
  else if (sort === "theme") filtered.sort((a, b) => ((a.tags ?? [a.title])[0] ?? a.title).localeCompare((b.tags ?? [b.title])[0] ?? b.title, "es"));
  else filtered.sort((a, b) => new Date(completionDate(b)) - new Date(completionDate(a)));
  goldGallery.innerHTML = filtered.map((goal, index) => achievementCardMarkup(goal, index)).join("");
  const empty = filtered.length === 0;
  goldGallery.hidden = empty;
  document.querySelector("#goldEmpty").hidden = !empty;
  document.querySelector("#goldEmptyTitle").textContent = golds.length ? "No hay hitos para este tema." : "Aún no hay hitos Oro.";
  document.querySelector("#goldEmptyCopy").textContent = golds.length
    ? "Prueba con otro tema o vuelve a mostrar todos."
    : "Cuando alcances una meta de largo plazo, su recuerdo vivirá aquí.";
}

function updateThemeOptions(golds) {
  const select = document.querySelector("#goldTheme");
  const selected = select.value;
  const themes = [...new Set(golds.flatMap((goal) => goal.tags ?? []))].sort((a, b) => a.localeCompare(b, "es"));
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
  renderHistory();
  historyDialog.showModal();
}

function clearHistory() {
  const archived = completedGoals();
  if (!archived.length) return;
  if (!window.confirm(`¿Vaciar el historial? Se eliminarán ${archived.length} retos conseguidos. Los hábitos se conservarán.`)) return;
  if (!persistGoals(goals.filter((goal) => goal.category === "habit" || !goal.completed))) return;
  render();
  showToast("Historial borrado.");
}

function openGoalDialog(goal = null) {
  editingId = goal?.id ?? null;
  form.reset();
  dialog.classList.toggle("is-creating", !goal);
  document.querySelector("#dialogTitle").textContent = goal ? "Detalles del reto" : "Nuevo reto";
  document.querySelector("#deleteGoal").hidden = !goal;
  document.querySelector("#goalDetails").hidden = !goal;
  document.querySelector("#saveGoal").innerHTML = goal
    ? 'Guardar cambios <span aria-hidden="true">↗</span>'
    : 'Crear reto <span aria-hidden="true">↗</span>';
  titleInput.value = goal?.title ?? "";
  document.querySelector(`#goalForm input[name="category"][value="${goal?.category ?? "bronze"}"]`).checked = true;
  document.querySelector("#targetDate").value = goal?.targetDate ?? "";
  document.querySelector("#bestRecord").value = goal?.bestRecord ?? "";
  document.querySelector("#goalNotes").value = goal?.notes ?? "";
  document.querySelector("#goalTags").value = (goal?.tags ?? []).join(", ");
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

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
  const nextRecord = String(data.get("bestRecord")).trim();
  const nextCategory = String(data.get("category"));
  const previousNotesHistory = notesHistoryFor(previous, now);
  if (previous && nextNotes && nextNotes !== previous.notes) previousNotesHistory.push({ text: nextNotes, createdAt: now });
  const recordHistory = [...(previous?.recordHistory ?? [])];
  if (previous?.bestRecord && nextRecord !== previous.bestRecord) recordHistory.push({ value: previous.bestRecord, createdAt: now });
  const goal = {
    id: editingId ?? crypto.randomUUID(),
    title: String(data.get("title")).trim(),
    category: nextCategory,
    targetDate: String(data.get("targetDate")),
    bestRecord: nextRecord,
    notes: nextNotes,
    completed: nextCategory === "habit" ? false : previous?.completed ?? false,
    completedAt: nextCategory === "habit" ? "" : previous?.completedAt ?? "",
    pinned: nextCategory === "habit" ? false : previous?.pinned ?? false,
    reflection: previous?.reflection ?? "",
    tags: String(data.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean),
    notesHistory: previousNotesHistory,
    recordHistory,
    ...(nextCategory === "habit" && {
      lastCompletedDate: previous?.category === "habit" ? previous.lastCompletedDate ?? "" : "",
      streakDays: previous?.category === "habit" ? previous.streakDays ?? 0 : 0,
      bestStreakDays: previous?.category === "habit" ? previous.bestStreakDays ?? parseStreakRecord(nextRecord) : parseStreakRecord(nextRecord),
    }),
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
  if (!goal?.completed) return;
  const shouldPin = !goal.pinned;
  if (shouldPin && completedGoals().filter((item) => item.pinned).length >= 3) {
    showToast("Tu Vitrina admite hasta tres logros. Quita uno para hacer espacio.");
    return;
  }
  if (!persistGoals(goals.map((item) => item.id === goalId ? { ...item, pinned: shouldPin } : item))) return;
  render();
  if (memoryGoalId === goalId && memoryDialog.open) renderMemory(goalId);
  showToast(shouldPin ? "Logro añadido a tu Vitrina." : "Logro retirado de tu Vitrina.");
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
  document.querySelector("#memoryRecord").textContent = goal.bestRecord || "Un logro que no necesita récord.";
  const notes = notesHistoryFor(goal, completionDate(goal));
  document.querySelector("#memoryNotes").innerHTML = notes.length
    ? notes.map((note) => `<p class="memory-log-entry"><span>${escapeHtml(formatDate(note.createdAt))}</span>${escapeHtml(note.text)}</p>`).join("")
    : '<p class="memory-log-empty">No se guardaron notas para este reto.</p>';
  document.querySelector("#memoryRecords").innerHTML = goal.recordHistory?.length
    ? goal.recordHistory.map((record) => `<p class="memory-log-entry"><span>${escapeHtml(formatDate(record.createdAt))}</span>${escapeHtml(record.value)}</p>`).join("")
    : '<p class="memory-log-empty">Este fue tu primer récord guardado.</p>';
  document.querySelector("#finalReflection").value = goal.reflection ?? "";
  const pin = document.querySelector("#memoryPin");
  pin.textContent = goal.pinned ? "★ En tu Vitrina" : "☆ Añadir a la Vitrina";
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

function finishGoldCelebration(pin) {
  const goal = goals.find((item) => item.id === celebratingGoalId);
  let pinnedOnFinish = pin;
  if (pin && goal && !goal.pinned) {
    const pinnedCount = completedGoals().filter((item) => item.pinned).length;
    if (pinnedCount >= 3) {
      pinnedOnFinish = false;
      showToast("La Vitrina está llena. Puedes fijarlo más tarde desde el recuerdo.");
    } else pinnedOnFinish = persistGoals(goals.map((item) => item.id === goal.id ? { ...item, pinned: true } : item));
  }
  celebrationDialog.close();
  const card = goalList.querySelector(`[data-id="${CSS.escape(celebratingGoalId ?? "")}"]`);
  if (card) card.classList.add("is-completing");
  setTimeout(() => {
    celebratingGoalId = null;
    render();
    if (pinnedOnFinish) showToast("¡Hito celebrado en tu Vitrina!");
    else if (pin) showToast("¡Reto conseguido! Tu Vitrina está llena; puedes fijarlo desde el recuerdo.");
    else showToast("¡Reto conseguido! Un paso más en tu camino.");
  }, 380);
}

function openGoldCelebration(goal) {
  celebratingGoalId = goal.id;
  document.querySelector("#celebrationGoal").textContent = goal.title;
  celebrationDialog.showModal();
}

document.querySelector("#featureAchievement").addEventListener("click", () => finishGoldCelebration(true));
document.querySelector("#skipFeature").addEventListener("click", () => finishGoldCelebration(false));
celebrationDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  finishGoldCelebration(false);
});
celebrationDialog.addEventListener("click", (event) => {
  if (event.target === celebrationDialog) finishGoldCelebration(false);
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
  if (goal.bestRecord) {
    context.fillStyle = "#5e5f58";
    context.font = "500 30px sans-serif";
    context.fillText(`Récord · ${goal.bestRecord}`.slice(0, 60), 540, detailsY + 72);
  }
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
  const message = `He conseguido: ${goal.title} · ${formatDate(completionDate(goal))}${goal.bestRecord ? ` · Récord: ${goal.bestRecord}` : ""}`;
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
  if (event.target.matches(".complete-toggle") && goal.category === "habit" && goal.lastCompletedDate !== localDateKey()) {
    const today = localDateKey();
    const streakDays = goal.lastCompletedDate === previousDateKey() ? (Number(goal.streakDays) || 0) + 1 : 1;
    const updatedGoal = {
      ...goal,
      lastCompletedDate: today,
      streakDays,
      bestStreakDays: Math.max(Number(goal.bestStreakDays) || 0, streakDays),
    };
    if (!persistGoals(goals.map((item) => item.id === goal.id ? updatedGoal : item))) return;
    renderChallenges();
    celebrate().then(() => showToast("¡Hábito hecho hoy! Un día más de constancia."));
    return;
  }
  if (event.target.matches(".complete-toggle") && !goal.completed) {
    const now = new Date().toISOString();
    const history = notesHistoryFor(goal, now);
    if (goal.notes && history.at(-1)?.text !== goal.notes) history.push({ text: goal.notes, createdAt: now });
    const updatedGoal = { ...goal, completed: true, completedAt: now, notesHistory: history };
    if (!persistGoals(goals.map((item) => item.id === goal.id ? updatedGoal : item))) return;
    event.target.checked = true;
    event.target.disabled = true;
    celebrate().then(() => {
      if (goal.category === "gold") openGoldCelebration(updatedGoal);
      else {
        card.classList.add("is-completing");
        setTimeout(() => {
          render();
          showToast("¡Reto conseguido! Un paso más en tu camino.");
        }, 380);
      }
    });
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
goldGallery.addEventListener("click", handleAchievementClick);
function handleAchievementKeydown(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-memory]")) {
    event.preventDefault();
    openMemory(event.target.dataset.memory);
  }
}
featuredGrid.addEventListener("keydown", handleAchievementKeydown);
goldGallery.addEventListener("keydown", handleAchievementKeydown);

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
document.querySelector("#showHistory").addEventListener("click", openHistory);
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
document.querySelector("#goldSort").addEventListener("change", renderShowcase);
document.querySelector("#goldTheme").addEventListener("change", renderShowcase);

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
