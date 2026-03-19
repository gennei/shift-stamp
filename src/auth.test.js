import { beforeEach, describe, expect, it, vi } from "vitest";

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

async function loadAuthModule({ clientId = "", google } = {}) {
  vi.resetModules();

  if (clientId) {
    vi.stubGlobal("window", {
      SHIFT_PWA_CLIENT_ID: clientId,
      google,
    });
  } else {
    vi.stubGlobal("window", { google });
  }

  vi.stubGlobal("localStorage", createStorage());

  return import("./auth.js");
}

describe("auth", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the client id is missing", async () => {
    const { ensureClientId } = await loadAuthModule();

    expect(() => ensureClientId()).toThrow(
      "CLIENT_ID is missing. Set window.SHIFT_PWA_CLIENT_ID or localStorage shift-client-id.",
    );
  });

  it("throws when Google Identity Services is not loaded", async () => {
    const { requestAccessToken } = await loadAuthModule({ clientId: "client-id" });

    expect(() => requestAccessToken()).toThrow("Google Identity Services is not loaded.");
  });

  it("requests a token and resolves the auth payload", async () => {
    const tokenClient = {
      callback: () => {},
      requestAccessToken: vi.fn(({ prompt }) => {
        expect(prompt).toBe("consent");
        tokenClient.callback({
          access_token: "token-123",
          expires_in: 3600,
        });
      }),
    };
    const initTokenClient = vi.fn(() => tokenClient);
    const google = {
      accounts: {
        oauth2: {
          initTokenClient,
        },
      },
    };

    const { requestAccessToken } = await loadAuthModule({
      clientId: "client-id",
      google,
    });

    await expect(requestAccessToken()).resolves.toEqual({
      token: "token-123",
      expiresIn: 3600,
    });
    expect(initTokenClient).toHaveBeenCalledOnce();
    expect(tokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: "consent" });
  });

  it("rejects when no access token is returned", async () => {
    const tokenClient = {
      callback: () => {},
      requestAccessToken: vi.fn(() => {
        tokenClient.callback({});
      }),
    };
    const google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => tokenClient),
        },
      },
    };

    const { requestAccessToken } = await loadAuthModule({
      clientId: "client-id",
      google,
    });

    await expect(requestAccessToken({ prompt: "none" })).rejects.toThrow(
      "Failed to obtain access token.",
    );
    expect(tokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: "none" });
  });
});
