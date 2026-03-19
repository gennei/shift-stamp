import { describe, expect, it } from "vitest";

import {
  SHIFT_APP_ID,
  SHIFT_DATE_PROPERTY,
  SHIFT_PROPERTY,
  SHIFT_TYPE_PROPERTY,
  TIME_ZONE,
} from "./config.js";
import { SHIFT_TYPES, buildEvent, formatDayLabel, getPeriodDays } from "./shift.js";

describe("getPeriodDays", () => {
  it("returns the custom period from the 6th to the 5th", () => {
    const days = getPeriodDays("2026-03");

    expect(days[0]).toBe("2026-03-06");
    expect(days.at(-1)).toBe("2026-04-05");
    expect(days).toHaveLength(31);
  });
});

describe("formatDayLabel", () => {
  it("formats month/day with Japanese weekday", () => {
    expect(formatDayLabel("2026-03-19")).toBe("3/19 (木)");
  });
});

describe("buildEvent", () => {
  it("builds a calendar event payload for a shift", () => {
    expect(buildEvent("2026-03-19", SHIFT_TYPES.MIDDLE)).toEqual({
      summary: "中番",
      start: {
        dateTime: "2026-03-19T12:00:00+09:00",
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: "2026-03-19T20:00:00+09:00",
        timeZone: TIME_ZONE,
      },
      extendedProperties: {
        private: {
          [SHIFT_PROPERTY]: SHIFT_APP_ID,
          [SHIFT_DATE_PROPERTY]: "2026-03-19",
          [SHIFT_TYPE_PROPERTY]: SHIFT_TYPES.MIDDLE,
        },
      },
    });
  });
});
