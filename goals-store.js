const STORAGE_KEY = "rumbo-goals-v1";

export const categories = {
  gold: { label: "Oro", emoji: "🥇" },
  silver: { label: "Plata", emoji: "🥈" },
  bronze: { label: "Bronce", emoji: "🥉" },
  habit: { label: "Hábito", emoji: "⚡" },
};

const sampleGoals = [
  { id: "sample-marathon", title: "Correr mi primera media maratón", category: "gold", targetDate: "2027-04-18", bestRecord: "10 km sin parar", notes: "Empezar con tres salidas suaves por semana.", completed: false, createdAt: "2026-09-02T09:00:00.000Z" },
  { id: "sample-reading", title: "Leer 12 libros este año", category: "silver", targetDate: "2026-12-31", bestRecord: "7 libros", notes: "", completed: false, createdAt: "2026-09-05T09:00:00.000Z" },
  { id: "sample-creatine", title: "Tomar creatina cada mañana", category: "habit", targetDate: "", bestRecord: "12 días seguidos", notes: "Dejar el vaso preparado junto al café.", completed: false, createdAt: "2026-09-09T09:00:00.000Z" },
  { id: "sample-closet", title: "Ordenar el armario", category: "bronze", targetDate: "", bestRecord: "", notes: "", completed: false, createdAt: "2026-09-12T09:00:00.000Z" },
  { id: "sample-gold-memory", title: "Completar mi primera certificación", category: "gold", targetDate: "2026-06-21", bestRecord: "Certificación avanzada", notes: "Estudié un poco cada mañana durante tres meses.", completed: true, completedAt: "2026-06-21T15:30:00.000Z", pinned: true, reflection: "Me sentí orgullosa de mantener el compromiso incluso en los días difíciles.", tags: ["aprendizaje", "crecimiento"], notesHistory: [{ text: "Estudié un poco cada mañana durante tres meses.", createdAt: "2026-06-21T15:30:00.000Z" }], recordHistory: [{ value: "Curso completado", createdAt: "2026-05-14T10:00:00.000Z" }], createdAt: "2026-03-01T09:00:00.000Z" },
  { id: "sample-silver-memory", title: "Leer 5 libros", category: "silver", targetDate: "", bestRecord: "5 libros", notes: "Encontré mi momento de lectura después de cenar.", completed: true, completedAt: "2026-08-30T18:00:00.000Z", pinned: false, reflection: "", tags: ["bienestar"], notesHistory: [{ text: "Encontré mi momento de lectura después de cenar.", createdAt: "2026-08-30T18:00:00.000Z" }], recordHistory: [], createdAt: "2026-04-10T09:00:00.000Z" },
];

export function loadGoals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleGoals));
      return { goals: structuredClone(sampleGoals), error: null };
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Los retos guardados no tienen un formato válido.");
    return {
      goals: parsed
        .filter((goal) => goal && typeof goal.id === "string" && typeof goal.title === "string" && categories[goal.category])
        .map((goal) => ({
          ...goal,
          completedAt: goal.completedAt || (goal.completed ? goal.createdAt : ""),
          pinned: Boolean(goal.pinned),
          reflection: typeof goal.reflection === "string" ? goal.reflection : "",
          tags: Array.isArray(goal.tags) ? goal.tags.filter((tag) => typeof tag === "string") : [],
          notesHistory: Array.isArray(goal.notesHistory) ? goal.notesHistory : goal.notes ? [{ text: goal.notes, createdAt: goal.createdAt }] : [],
          recordHistory: Array.isArray(goal.recordHistory) ? goal.recordHistory : [],
        })),
      error: null,
    };
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
