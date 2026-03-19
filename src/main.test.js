// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { initApp } from "./main.js";

function buildDom() {
  document.body.innerHTML = `
    <input id="monthInput" />
    <div id="daysContainer"></div>
    <button id="saveButton">save</button>
    <button id="loginButton">login</button>
    <div id="statusShell" class="is-hidden">
      <div id="status"></div>
      <div id="loginBanner"></div>
    </div>
    <div id="loginSection"></div>
    <select id="calendarSelect"></select>
    <div data-gated class="gated"></div>
    <span id="countEarly"></span>
    <span id="countMiddle"></span>
    <span id="countLate"></span>
    <span id="countOff"></span>
  `;
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("initApp", () => {
  beforeEach(() => {
    buildDom();
    localStorage.clear();
    vi.restoreAllMocks();
    window.google = {
      accounts: {
        oauth2: {},
      },
    };
  });

  it("shows logged-in UI and sorts calendars after login", async () => {
    const requestAccessToken = vi.fn()
      .mockRejectedValueOnce(new Error("no session"))
      .mockResolvedValueOnce({ token: "login-token", expiresIn: 3600 });
    const listCalendars = vi.fn().mockResolvedValue([
      { id: "b", summary: "Sub" },
      { id: "a", summary: "Main", primary: true },
    ]);
    const app = initApp({
      requestAccessToken,
      listCalendars,
      syncMonth: vi.fn(),
      now: () => new Date("2026-03-19T00:00:00+09:00").getTime(),
    });

    await app.silentLoginPromise;

    const loginButton = document.getElementById("loginButton");
    const loginSection = document.getElementById("loginSection");
    const calendarSelect = document.getElementById("calendarSelect");
    const gated = document.querySelector("[data-gated]");

    loginButton.click();
    await flush();
    await flush();

    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: "consent" });
    expect(listCalendars).toHaveBeenLastCalledWith("login-token");
    expect(loginButton.classList.contains("is-hidden")).toBe(true);
    expect(loginSection.classList.contains("is-hidden")).toBe(true);
    expect(gated.classList.contains("is-visible")).toBe(true);
    expect([...calendarSelect.options].map((option) => option.textContent)).toEqual([
      "Main (primary)",
      "Sub",
    ]);
    expect(calendarSelect.value).toBe("a");
  });

  it("keeps login UI visible when silent login fails", async () => {
    const requestAccessToken = vi.fn().mockRejectedValue(new Error("no session"));
    const listCalendars = vi.fn();
    const app = initApp({
      requestAccessToken,
      listCalendars,
      syncMonth: vi.fn(),
    });

    await app.silentLoginPromise;

    expect(document.getElementById("status").textContent).toBe("ログインしてください。");
    expect(document.getElementById("loginBanner").textContent).toBe(
      "ログインが必要です。ログインボタンを押してください。",
    );
    expect(document.getElementById("loginButton").classList.contains("is-hidden")).toBe(false);
    expect(document.querySelector("[data-gated]").classList.contains("is-visible")).toBe(false);
    expect(listCalendars).not.toHaveBeenCalled();
  });

  it("refreshes auth on save and passes the new token to sync", async () => {
    const requestAccessToken = vi.fn()
      .mockRejectedValueOnce(new Error("no session"))
      .mockResolvedValueOnce({ token: "fresh-token", expiresIn: 3600 });
    const listCalendars = vi.fn().mockResolvedValue([{ id: "primary", summary: "Main", primary: true }]);
    const syncMonth = vi.fn().mockResolvedValue({ created: 1, updated: 2, deleted: 3 });
    const app = initApp({
      requestAccessToken,
      listCalendars,
      syncMonth,
      now: () => new Date("2026-03-19T00:00:00+09:00").getTime(),
    });

    await app.silentLoginPromise;

    document.getElementById("saveButton").click();
    await flush();
    await flush();

    expect(requestAccessToken).toHaveBeenLastCalledWith({ prompt: "none" });
    expect(syncMonth).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "fresh-token",
        calendarId: "primary",
        ym: "2026-04",
      }),
    );
    expect(document.getElementById("status").textContent).toBe("同期完了: 追加 1 / 更新 2 / 削除 3");
  });

  it("shows a relogin message when save-time refresh fails", async () => {
    const requestAccessToken = vi.fn()
      .mockRejectedValueOnce(new Error("no session"))
      .mockRejectedValueOnce(new Error("expired"));
    const app = initApp({
      requestAccessToken,
      listCalendars: vi.fn(),
      syncMonth: vi.fn(),
    });

    await app.silentLoginPromise;

    document.getElementById("saveButton").click();
    await flush();
    await flush();

    expect(document.getElementById("status").textContent).toBe(
      "エラー: ログインが切れました。再ログインしてください。",
    );
    expect(document.getElementById("loginBanner").textContent).toBe(
      "ログインが切れました。再ログインしてください。",
    );
    expect(document.getElementById("loginButton").classList.contains("is-hidden")).toBe(false);
    expect(document.querySelector("[data-gated]").classList.contains("is-visible")).toBe(false);
  });
});
