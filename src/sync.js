import { SHIFT_TYPES, buildEvent, getMonthDays } from "./shift.js";
import { listAppEvents, insertEvent, patchEvent, deleteEvent } from "./gcal.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncMonth({ ym, plan, token, calendarId, onProgress }) {
  const days = getMonthDays(ym);
  const [year, month] = ym.split("-").map(Number);
  const timeMin = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

  onProgress?.(`既存イベント取得中...`);
  const existingEvents = await listAppEvents(token, calendarId, timeMin, timeMax);
  const eventMap = new Map();
  existingEvents.forEach((event) => {
    if (event.shiftDate) {
      eventMap.set(event.shiftDate, event);
    }
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const dateString of days) {
    const desired = plan[dateString] || SHIFT_TYPES.OFF;
    const existing = eventMap.get(dateString);

    if (desired === SHIFT_TYPES.OFF) {
      if (existing) {
        onProgress?.(`${dateString} を削除中...`);
        await deleteEvent(token, calendarId, existing.id);
        deleted += 1;
        await delay(120);
      }
      continue;
    }

    const eventPayload = buildEvent(dateString, desired);

    if (existing) {
      onProgress?.(`${dateString} を更新中...`);
      await patchEvent(token, calendarId, existing.id, eventPayload);
      updated += 1;
    } else {
      onProgress?.(`${dateString} を追加中...`);
      await insertEvent(token, calendarId, eventPayload);
      created += 1;
    }

    await delay(120);
  }

  return { created, updated, deleted };
}
