import { CLIENT_ID, SCOPES } from "./config.js";

let tokenClient = null;

export function ensureClientId() {
  if (!CLIENT_ID) {
    throw new Error(
      "CLIENT_ID is missing. Set window.SHIFT_PWA_CLIENT_ID or localStorage shift-client-id."
    );
  }
}

export function requestAccessToken({ prompt = "consent" } = {}) {
  ensureClientId();

  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error("Google Identity Services is not loaded.");
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    });
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response && response.access_token) {
        resolve({
          token: response.access_token,
          expiresIn: response.expires_in ?? 0,
        });
      } else {
        reject(new Error("Failed to obtain access token."));
      }
    };
    tokenClient.requestAccessToken({ prompt });
  });
}
