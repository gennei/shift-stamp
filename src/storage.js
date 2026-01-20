const STORAGE_PREFIX = "shift-plan";

export function loadPlan(ym) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}:${ym}`);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse localStorage plan", error);
    return {};
  }
}

export function savePlan(ym, plan) {
  localStorage.setItem(`${STORAGE_PREFIX}:${ym}`, JSON.stringify(plan));
}
