import { renderDays, setStatus } from "./ui.js";
import { requestAccessToken } from "./auth.js";
import { syncMonth } from "./sync.js";
import { listCalendars } from "./gcal.js";

const monthInput = document.getElementById("monthInput");
const daysContainer = document.getElementById("daysContainer");
const saveButton = document.getElementById("saveButton");
const loginButton = document.getElementById("loginButton");
const statusEl = document.getElementById("status");
const calendarSelect = document.getElementById("calendarSelect");
const loginBanner = document.getElementById("loginBanner");
const loginSection = document.getElementById("loginSection");
const gatedSections = document.querySelectorAll("[data-gated]");

let currentPlan = {};
let accessToken = "";
let tokenExpiresAt = 0;
const calendarStorageKey = "shift-calendar-id";

function setAuth(auth) {
  accessToken = auth.token;
  tokenExpiresAt = Date.now() + auth.expiresIn * 1000 - 60 * 1000;
}

async function waitForGsiReady() {
  if (window.google?.accounts?.oauth2) {
    return;
  }
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > 5000) {
        clearInterval(timer);
        reject(new Error("Google Identity Services is not loaded."));
      }
    }, 100);
  });
}

function getCurrentYm() {
  return monthInput.value;
}

function updateStatus(message, tone = "info") {
  setStatus(statusEl, message, tone);
}

function showLoginBanner(message) {
  loginBanner.textContent = message;
  loginBanner.classList.add("is-visible");
}

function hideLoginBanner() {
  loginBanner.textContent = "";
  loginBanner.classList.remove("is-visible");
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
  const saved = localStorage.getItem(calendarStorageKey);
  const sorted = [...calendars].sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });

  sorted.forEach((calendar) => {
    const option = document.createElement("option");
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

function loadMonth(ym) {
  currentPlan = {};
  renderDays(daysContainer, ym, currentPlan, (dateString, shiftType) => {
    currentPlan[dateString] = shiftType;
  });
  updateStatus(`${ym} を表示しました。`);
}

function initMonthInput() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  monthInput.value = ym;
  loadMonth(ym);
}

monthInput.addEventListener("change", () => {
  loadMonth(getCurrentYm());
});

saveButton.addEventListener("click", () => {
  handleSaveAndSync();
});

loginButton.addEventListener("click", async () => {
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
});

calendarSelect.addEventListener("change", () => {
  localStorage.setItem(calendarStorageKey, calendarSelect.value);
});

async function handleSaveAndSync() {
  const ym = getCurrentYm();
  const calendarId = calendarSelect.value || "primary";

  try {
    saveButton.disabled = true;
    if (!accessToken || Date.now() >= tokenExpiresAt) {
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
      `同期完了: 追加 ${result.created} / 更新 ${result.updated} / 削除 ${result.deleted}`
    );
  } catch (error) {
    updateStatus(`エラー: ${error.message}`, "error");
  } finally {
    saveButton.disabled = false;
  }
}

initMonthInput();
setGatedVisible(false);
setLoggedInUI(false);
updateStatus("ログインしてください。");
showLoginBanner("ログインが必要です。ログインボタンを押してください。");

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

trySilentLogin();
