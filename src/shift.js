import { SHIFT_APP_ID, SHIFT_DATE_PROPERTY, SHIFT_PROPERTY, SHIFT_TYPE_PROPERTY, TIME_ZONE } from "./config.js";

export const SHIFT_TYPES = {
  OFF: "OFF",
  EARLY: "EARLY",
  MIDDLE: "MIDDLE",
  LATE: "LATE",
};

export const SHIFT_DEFINITIONS = {
  [SHIFT_TYPES.EARLY]: {
    label: "早番",
    start: "09:00",
    end: "17:00",
  },
  [SHIFT_TYPES.MIDDLE]: {
    label: "中番",
    start: "12:00",
    end: "20:00",
  },
  [SHIFT_TYPES.LATE]: {
    label: "遅番",
    start: "14:00",
    end: "22:00",
  },
};

export const SHIFT_OPTIONS = [
  { type: SHIFT_TYPES.EARLY, label: "早番" },
  { type: SHIFT_TYPES.MIDDLE, label: "中番" },
  { type: SHIFT_TYPES.LATE, label: "遅番" },
  { type: SHIFT_TYPES.OFF, label: "休み" },
];

export function getMonthDays(ym) {
  const [year, month] = ym.split("-").map(Number);
  const lastDate = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, month - 1, day);
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

export function formatDayLabel(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${d} (${weekday})`;
}

export function buildEvent(dateString, shiftType) {
  const def = SHIFT_DEFINITIONS[shiftType];
  const startDateTime = `${dateString}T${def.start}:00+09:00`;
  const endDateTime = `${dateString}T${def.end}:00+09:00`;

  return {
    summary: def.label,
    start: {
      dateTime: startDateTime,
      timeZone: TIME_ZONE,
    },
    end: {
      dateTime: endDateTime,
      timeZone: TIME_ZONE,
    },
    extendedProperties: {
      private: {
        [SHIFT_PROPERTY]: SHIFT_APP_ID,
        [SHIFT_DATE_PROPERTY]: dateString,
        [SHIFT_TYPE_PROPERTY]: shiftType,
      },
    },
  };
}
