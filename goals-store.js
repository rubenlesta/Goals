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
];

export function loadGoals() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleGoals));
      return { goals: structuredClone(sampleGoals), error: null };
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new TypeError("El contenido guardado no es una lista.");
    return { goals: parsed.filter((goal) => goal && typeof goal.id === "string" && typeof goal.title === "string" && categories[goal.category]), error: null };
  } catch (error) {
    console.error("No se pudieron cargar los retos.", error);
    return { goals: structuredClone(sampleGoals), error: "No se pudieron cargar los retos guardados." };
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
