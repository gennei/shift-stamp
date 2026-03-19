import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadPlan, savePlan } from "./storage.js";

function createStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    clear() {
      store.clear();
    },
  };
}

describe("storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("returns an empty object when no saved plan exists", () => {
    expect(loadPlan("2026-03")).toEqual({});
  });

  it("saves and loads a plan", () => {
    const plan = { "2026-03-19": "EARLY" };

    savePlan("2026-03", plan);

    expect(loadPlan("2026-03")).toEqual(plan);
  });

  it("returns an empty object when stored JSON is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    localStorage.setItem("shift-plan:2026-03", "{broken");

    expect(loadPlan("2026-03")).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});
