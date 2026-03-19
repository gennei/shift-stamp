import { renderDays, setStatus as defaultSetStatus } from "./ui.js";
import { requestAccessToken as defaultRequestAccessToken } from "./auth.js";
import { syncMonth as defaultSyncMonth } from "./sync.js";
import { listCalendars as defaultListCalendars } from "./gcal.js";
import { SHIFT_TYPES } from "./shift.js";

export function initApp({
  document: doc = document,
  window: win = window,
  now = () => Date.now(),
  requestAccessToken = defaultRequestAccessToken,
  syncMonth = defaultSyncMonth,
  listCalendars = defaultListCalendars,
  setStatus = defaultSetStatus,
} = {}) {
  const monthInput = doc.getElementById("monthInput");
  const daysContainer = doc.getElementById("daysContainer");
  const saveButton = doc.getElementById("saveButton");
  const loginButton = doc.getElementById("loginButton");
  const statusEl = doc.getElementById("status");
  const statusShell = doc.getElementById("statusShell");
  const calendarSelect = doc.getElementById("calendarSelect");
  const loginBanner = doc.getElementById("loginBanner");
  const loginSection = doc.getElementById("loginSection");
  const gatedSections = doc.querySelectorAll("[data-gated]");
  const countEarly = doc.getElementById("countEarly");
  const countMiddle = doc.getElementById("countMiddle");
  const countLate = doc.getElementById("countLate");
  const countOff = doc.getElementById("countOff");

  let currentPlan = {};
  let accessToken = "";
  let tokenExpiresAt = 0;
  const calendarStorageKey = "shift-calendar-id";

  function setAuth(auth) {
    accessToken = auth.token;
    tokenExpiresAt = now() + auth.expiresIn * 1000 - 60 * 1000;
  }

  async function waitForGsiReady() {
    if (win.google?.accounts?.oauth2) {
      return;
    }
    await new Promise((resolve, reject) => {
      const start = now();
      const timer = win.setInterval(() => {
        if (win.google?.accounts?.oauth2) {
          win.clearInterval(timer);
          resolve();
        } else if (now() - start > 5000) {
          win.clearInterval(timer);
          reject(new Error("Google Identity Services is not loaded."));
        }
      }, 100);
    });
  }

  function getCurrentYm() {
    return monthInput.value;
  }

  function refreshStatusShell() {
    const hasBanner = Boolean(loginBanner.textContent.trim());
    const hasStatus = Boolean(statusEl.textContent.trim());
    statusShell.classList.toggle("is-hidden", !hasBanner && !hasStatus);
  }

  function updateStatus(message, tone = "info") {
    setStatus(statusEl, message, tone);
    refreshStatusShell();
  }

  function showLoginBanner(message) {
    loginBanner.textContent = message;
    loginBanner.classList.add("is-visible");
    refreshStatusShell();
  }

  function hideLoginBanner() {
    loginBanner.textContent = "";
    loginBanner.classList.remove("is-visible");
    refreshStatusShell();
  }

  function setGatedVisible(visible) {
    gatedSections.forEach((section) => {
      section.classList.toggle("is-visible", visible);
    });
  }

  function setLoggedInUI(loggedIn) {
    loginButton.classList.toggle("is-hidden", loggedIn);
    loginSection.classList.toggle("is-hidden", loggedIn);
  }

  function renderCalendars(calendars) {
    calendarSelect.innerHTML = "";
    const saved = win.localStorage.getItem(calendarStorageKey);
    const sorted = [...calendars].sort((a, b) => {
      if (a.primary) return -1;
      if (b.primary) return 1;
      return a.summary.localeCompare(b.summary);
    });

    sorted.forEach((calendar) => {
      const option = doc.createElement("option");
      option.value = calendar.id;
      option.textContent = calendar.primary
        ? `${calendar.summary} (primary)`
        : calendar.summary;
      calendarSelect.appendChild(option);
    });

    if (saved && sorted.some((item) => item.id === saved)) {
      calendarSelect.value = saved;
    } else if (sorted.length) {
      calendarSelect.value = sorted[0].id;
    }
  }

  async function loadCalendars() {
    updateStatus("カレンダー一覧を取得中...");
    const calendars = await listCalendars(accessToken);
    renderCalendars(calendars);
    hideLoginBanner();
    updateStatus("");
  }

  function updateSummary() {
    const counts = {
      [SHIFT_TYPES.EARLY]: 0,
      [SHIFT_TYPES.MIDDLE]: 0,
      [SHIFT_TYPES.LATE]: 0,
      [SHIFT_TYPES.OFF]: 0,
    };

    const radios = daysContainer.querySelectorAll('input[type="radio"]:checked');
    radios.forEach((radio) => {
      if (counts[radio.value] !== undefined) {
        counts[radio.value] += 1;
      }
    });

    countEarly.textContent = String(counts[SHIFT_TYPES.EARLY]);
    countMiddle.textContent = String(counts[SHIFT_TYPES.MIDDLE]);
    countLate.textContent = String(counts[SHIFT_TYPES.LATE]);
    countOff.textContent = String(counts[SHIFT_TYPES.OFF]);
  }

  function loadMonth(ym) {
    currentPlan = {};
    renderDays(daysContainer, ym, currentPlan, (dateString, shiftType) => {
      currentPlan[dateString] = shiftType;
      updateSummary();
    });
    updateSummary();
    updateStatus(`${ym} を表示しました。`);
  }

  function initMonthInput() {
    const current = new Date(now());
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    monthInput.value = ym;
    loadMonth(ym);
  }

  async function handleLogin() {
    try {
      loginButton.disabled = true;
      updateStatus("Google ログイン中...");
      await waitForGsiReady();
      const auth = await requestAccessToken({ prompt: "consent" });
      setAuth(auth);
      setGatedVisible(true);
      setLoggedInUI(true);
      hideLoginBanner();
      await loadCalendars();
    } catch (error) {
      setLoggedInUI(false);
      showLoginBanner("ログインが必要です。ログインボタンを押してください。");
      updateStatus(`エラー: ${error.message}`, "error");
    } finally {
      loginButton.disabled = false;
    }
  }

  async function handleSaveAndSync() {
    const ym = getCurrentYm();
    const calendarId = calendarSelect.value || "primary";

    try {
      saveButton.disabled = true;
      if (!accessToken || now() >= tokenExpiresAt) {
        updateStatus("認証を更新中...");
        try {
          await waitForGsiReady();
          const auth = await requestAccessToken({ prompt: "none" });
          setAuth(auth);
          await loadCalendars();
        } catch (error) {
          setGatedVisible(false);
          setLoggedInUI(false);
          showLoginBanner("ログインが切れました。再ログインしてください。");
          throw new Error("ログインが切れました。再ログインしてください。");
        }
      }

      updateStatus("保存して同期します...");
      const result = await syncMonth({
        ym,
        plan: currentPlan,
        token: accessToken,
        calendarId,
        onProgress: (message) => updateStatus(message),
      });

      updateStatus(
        `同期完了: 追加 ${result.created} / 更新 ${result.updated} / 削除 ${result.deleted}`,
      );
    } catch (error) {
      updateStatus(`エラー: ${error.message}`, "error");
    } finally {
      saveButton.disabled = false;
    }
  }

  async function trySilentLogin() {
    try {
      await waitForGsiReady();
      const auth = await requestAccessToken({ prompt: "none" });
      setAuth(auth);
      setGatedVisible(true);
      setLoggedInUI(true);
      hideLoginBanner();
      await loadCalendars();
    } catch (error) {
      setGatedVisible(false);
      setLoggedInUI(false);
      updateStatus("ログインしてください。");
      showLoginBanner("ログインが必要です。ログインボタンを押してください。");
    }
  }

  monthInput.addEventListener("change", () => {
    loadMonth(getCurrentYm());
  });

  saveButton.addEventListener("click", () => {
    handleSaveAndSync();
  });

  loginButton.addEventListener("click", () => {
    handleLogin();
  });

  calendarSelect.addEventListener("change", () => {
    win.localStorage.setItem(calendarStorageKey, calendarSelect.value);
  });

  initMonthInput();
  setGatedVisible(false);
  setLoggedInUI(false);
  updateStatus("ログインしてください。");
  showLoginBanner("ログインが必要です。ログインボタンを押してください。");

  const silentLoginPromise = trySilentLogin();

  return {
    handleLogin,
    handleSaveAndSync,
    trySilentLogin,
    silentLoginPromise,
    getState() {
      return {
        accessToken,
        tokenExpiresAt,
        currentPlan: { ...currentPlan },
      };
    },
  };
}

if (
  typeof document !== "undefined" &&
  typeof window !== "undefined" &&
  document.getElementById("monthInput")
) {
  initApp();
}
