import { GCAL_API_BASE, SHIFT_APP_ID, SHIFT_DATE_PROPERTY, SHIFT_PROPERTY } from "./config.js";

async function gcalFetch(path, token, options = {}) {
  const response = await fetch(`${GCAL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listAppEvents(token, calendarId, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    privateExtendedProperty: `${SHIFT_PROPERTY}=${SHIFT_APP_ID}`,
    maxResults: "2500",
  });
  const path = `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const data = await gcalFetch(path, token);
  const items = data.items || [];
  return items.map((item) => ({
    id: item.id,
    summary: item.summary,
    extendedProperties: item.extendedProperties,
    shiftDate: item.extendedProperties?.private?.[SHIFT_DATE_PROPERTY],
  }));
}

export async function listCalendars(token) {
  const params = new URLSearchParams({
    maxResults: "250",
  });
  const path = `/users/me/calendarList?${params.toString()}`;
  const data = await gcalFetch(path, token);
  const items = data.items || [];
  return items.map((item) => ({
    id: item.id,
    summary: item.summary,
    primary: Boolean(item.primary),
  }));
}

export async function insertEvent(token, calendarId, event) {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
  return gcalFetch(path, token, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function patchEvent(token, calendarId, eventId, event) {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  return gcalFetch(path, token, {
    method: "PATCH",
    body: JSON.stringify(event),
  });
}

export async function deleteEvent(token, calendarId, eventId) {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  return gcalFetch(path, token, {
    method: "DELETE",
  });
}
