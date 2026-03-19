// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { renderDays, setStatus } from "./ui.js";

describe("renderDays", () => {
  it("renders one row per period day and applies the selected plan", () => {
    const container = document.createElement("div");

    renderDays(
      container,
      "2026-03",
      {
        "2026-03-07": "LATE",
      },
      vi.fn(),
    );

    expect(container.querySelectorAll(".day-row")).toHaveLength(31);
    expect(container.querySelector('[name="shift-2026-03-07"][value="LATE"]').checked).toBe(true);
    expect(container.querySelector(".day-date")?.textContent).toBe("3/6 (金)");
  });

  it("calls onChange when a shift is changed", () => {
    const container = document.createElement("div");
    const onChange = vi.fn();

    renderDays(container, "2026-03", {}, onChange);

    const input = container.querySelector('[name="shift-2026-03-06"][value="EARLY"]');
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith("2026-03-06", "EARLY");
  });
});

describe("setStatus", () => {
  it("updates the message and tone", () => {
    const target = document.createElement("div");

    setStatus(target, "同期中", "error");

    expect(target.textContent).toBe("同期中");
    expect(target.dataset.tone).toBe("error");
  });
});
