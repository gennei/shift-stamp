import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listAppEvents = vi.fn();
const insertEvent = vi.fn();
const patchEvent = vi.fn();
const deleteEvent = vi.fn();

vi.mock("./gcal.js", () => ({
  listAppEvents,
  insertEvent,
  patchEvent,
  deleteEvent,
}));

describe("syncMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates, updates, and deletes events to match the plan", async () => {
    const { syncMonth } = await import("./sync.js");
    const onProgress = vi.fn();

    listAppEvents.mockResolvedValue([
      { id: "event-early", shiftDate: "2026-03-07" },
      { id: "event-off", shiftDate: "2026-03-08" },
    ]);
    insertEvent.mockResolvedValue({});
    patchEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue({});

    const promise = syncMonth({
      ym: "2026-03",
      plan: {
        "2026-03-06": "EARLY",
        "2026-03-07": "LATE",
        "2026-03-08": "OFF",
      },
      token: "token",
      calendarId: "primary",
      onProgress,
    });

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({
      created: 1,
      updated: 1,
      deleted: 1,
    });

    expect(listAppEvents).toHaveBeenCalledOnce();
    expect(insertEvent).toHaveBeenCalledWith(
      "token",
      "primary",
      expect.objectContaining({ summary: "早番" }),
    );
    expect(patchEvent).toHaveBeenCalledWith(
      "token",
      "primary",
      "event-early",
      expect.objectContaining({ summary: "遅番" }),
    );
    expect(deleteEvent).toHaveBeenCalledWith("token", "primary", "event-off");
    expect(onProgress).toHaveBeenCalledWith("既存イベント取得中...");
  });
});
