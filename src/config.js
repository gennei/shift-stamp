export const TIME_ZONE = "Asia/Tokyo";
export const SHIFT_APP_ID = "v1";
export const SHIFT_PROPERTY = "shiftPwa";
export const SHIFT_DATE_PROPERTY = "shiftDate";
export const SHIFT_TYPE_PROPERTY = "shiftType";

const browserWindow = typeof window !== "undefined" ? window : undefined;
const browserStorage = typeof localStorage !== "undefined" ? localStorage : undefined;

export const CLIENT_ID =
  browserWindow?.SHIFT_PWA_CLIENT_ID ||
  browserStorage?.getItem("shift-client-id") ||
  "";

export const SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
export const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";
