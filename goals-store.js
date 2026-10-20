const STORAGE_KEY = "rumbo-goals-v1";

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function completionDateKey(value) {
  if (typeof value !== "string" || !value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localDateKey(date);
}

export const categories = {
  habit: { label: "Hábito", emoji: "⚡" },
  class: { label: "Clase", emoji: "🎓" },
  laboral: { label: "Laboral", emoji: "💼" },
  vida: { label: "Vida", emoji: "🌱" },
  legend: { label: "Leyenda", emoji: "👑" },
};

const legacyCategories = {
  gold: "legend",
  silver: "class",
  bronze: "vida",
};

const legacyFields = new Set(["targetDate", "bestRecord", "recordHistory", "streakDays", "bestStreakDays"]);

const sampleGoals = [
  { id: "sample-marathon", title: "Correr mi primera media maratón", category: "vida", notes: "Empezar con tres salidas suaves por semana.", completed: false, createdAt: "2026-09-02T09:00:00.000Z", subtasks: [] },
  { id: "sample-reading", title: "Leer 12 libros este año", category: "class", notes: "", completed: false, createdAt: "2026-09-05T09:00:00.000Z", subtasks: [] },
  { id: "sample-creatine", title: "Tomar creatina cada mañana", category: "habit", lastCompletedDate: "", notes: "Dejar el vaso preparado junto al café.", completed: false, createdAt: "2026-09-09T09:00:00.000Z", subtasks: [] },
  { id: "sample-closet", title: "Ordenar el armario", category: "vida", notes: "", completed: false, createdAt: "2026-09-12T09:00:00.000Z", subtasks: [] },
  { id: "sample-legend-memory", title: "Completar mi primera certificación", category: "legend", notes: "Estudié un poco cada mañana durante tres meses.", completed: true, completedAt: "2026-06-21T15:30:00.000Z", pinned: true, reflection: "Me sentí orgullosa de mantener el compromiso incluso en los días difíciles.", tags: ["aprendizaje", "crecimiento"], notesHistory: [{ text: "Estudié un poco cada mañana durante tres meses.", createdAt: "2026-06-21T15:30:00.000Z" }], createdAt: "2026-03-01T09:00:00.000Z", subtasks: [] },
  { id: "sample-class-memory", title: "Leer 5 libros", category: "class", notes: "Encontré mi momento de lectura después de cenar.", completed: true, completedAt: "2026-08-30T18:00:00.000Z", pinned: false, reflection: "", tags: ["bienestar"], notesHistory: [{ text: "Encontré mi momento de lectura después de cenar.", createdAt: "2026-08-30T18:00:00.000Z" }], createdAt: "2026-04-10T09:00:00.000Z", subtasks: [] },
];

function normalizeGoal(goal) {
  const category = legacyCategories[goal.category] ?? goal.category;
  if (!categories[category]) return null;

  const savedGoal = Object.fromEntries(Object.entries(goal).filter(([key]) => !legacyFields.has(key)));
  const completed = category === "habit" ? false : Boolean(goal.completed);
  return {
    ...savedGoal,
    category,
    completed,
    completedAt: category === "habit" ? "" : goal.completedAt || (completed ? goal.createdAt : ""),
    pinned: category === "legend" && completed && Boolean(goal.pinned),
    reflection: typeof goal.reflection === "string" ? goal.reflection : "",
    tags: Array.isArray(goal.tags) ? goal.tags.filter((tag) => typeof tag === "string") : [],
    notesHistory: Array.isArray(goal.notesHistory)
      ? goal.notesHistory
      : goal.notes ? [{ text: goal.notes, createdAt: goal.createdAt }] : [],
    subtasks: Array.isArray(goal.subtasks)
      ? goal.subtasks
        .filter((subtask) => subtask && typeof subtask.title === "string" && subtask.title.trim())
        .map((subtask, index) => ({
          id: typeof subtask.id === "string" && subtask.id ? subtask.id : `${goal.id}-step-${index + 1}`,
          title: subtask.title.trim(),
          completed: Boolean(subtask.completed),
        }))
      : [],
    ...(category === "habit" && {
      lastCompletedDate: completionDateKey(goal.lastCompletedDate) || (goal.completed ? completionDateKey(goal.completedAt || goal.createdAt) : ""),
    }),
  };
}

export function loadGoals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleGoals));
      return { goals: structuredClone(sampleGoals), error: null };
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Los retos guardados no tienen un formato válido.");
    let goals = parsed
      .filter((goal) => goal && typeof goal.id === "string" && typeof goal.title === "string")
      .map(normalizeGoal)
      .filter(Boolean);
    const featuredIds = new Set(goals
      .filter((goal) => goal.category === "legend" && goal.completed && goal.pinned)
      .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0))
      .slice(0, 4)
      .map((goal) => goal.id));
    goals = goals.map((goal) => ({ ...goal, pinned: featuredIds.has(goal.id) }));
    let errorMessage = null;
    if (JSON.stringify(goals) !== JSON.stringify(parsed)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
      } catch (error) {
        console.error("No se pudieron guardar los cambios migrados de los retos.", error);
        errorMessage = "No se pudieron guardar los cambios migrados de tus retos.";
      }
    }
    return { goals, error: errorMessage };
  } catch (error) {
    console.error("No se pudieron cargar los retos guardados.", error);
    return { goals: structuredClone(sampleGoals), error: "No se pudieron cargar tus retos guardados." };
  }
}

export function saveGoals(goals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los retos.", error);
    return false;
  }
}
