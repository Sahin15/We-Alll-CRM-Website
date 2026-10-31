import { jest, describe, test, expect, beforeAll, afterAll } from "@jest/globals";

const mockMessageUpdate = jest.fn();
const mockMessageFindOne = jest.fn();
const mockStateUpdate = jest.fn();

jest.unstable_mockModule("../src/models/emailMessageModel.js", () => ({
  default: {
    findOneAndUpdate: mockMessageUpdate,
    findOne: mockMessageFindOne,
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/emailAccountModel.js", () => ({
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/gmailOAuthStateModel.js", () => ({
  default: {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: mockStateUpdate,
  },
}));

const envKeys = [
  "EMAIL_TOKEN_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function sampleMessage(id) {
  return {
    id,
    threadId: "thread-1",
    labelIds: id === "m2" ? ["INBOX", "UNREAD"] : ["INBOX"],
    snippet: "Weekly update",
    internalDate: "1761900000000",
    payload: {
      headers: [
        { name: "From", value: "Ada Lovelace <ada@example.com>" },
        { name: "To", value: "me@gmail.com" },
        { name: "Subject", value: "Status <script>" },
      ],
    },
  };
}

describe("Gmail inbox", () => {
  let encryptSecret;
  let toPublicAccount;
  let buildGoogleAuthUrl;
  let buildMessageFilter;
  let syncAccountInbox;
  let getOwnedMessageDetail;
  let completeGmailOAuth;
  let getValidAccessToken;
  let sanitizeEmailHtml;
  let normalizeGmailMessage;
  let safeGmailError;

  beforeAll(async () => {
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:5000/api/email/gmail/callback";

    ({ encryptSecret } = await import("../src/services/gmail/tokenCrypto.js"));
    ({ toPublicAccount } = await import("../src/services/gmail/gmailPresenter.js"));
    ({ sanitizeEmailHtml } = await import("../src/services/gmail/htmlSanitize.js"));
    ({ normalizeGmailMessage } = await import("../src/services/gmail/mime.js"));
    ({ safeGmailError } = await import("../src/services/gmail/gmailConfig.js"));
    ({ buildGoogleAuthUrl, completeGmailOAuth } = await import("../src/services/gmail/gmailOAuthService.js"));
    ({ buildMessageFilter, syncAccountInbox, getOwnedMessageDetail } = await import("../src/services/gmail/emailSyncService.js"));
    ({ getValidAccessToken } = await import("../src/services/gmail/accessToken.js"));
  });

  afterAll(() => {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  });

  test("encrypts tokens and keeps them off the public account", () => {
    const stored = encryptSecret("ya29.secret-access");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(stored).not.toContain("ya29.secret-access");
    const account = toPublicAccount({
      _id: "acc-1",
      provider: "gmail",
      email: "sahin.wealll@gmail.com",
      displayName: "Sahin",
      syncStatus: "idle",
      isActive: true,
      encryptedAccessToken: stored,
      encryptedRefreshToken: stored,
    });
    const body = JSON.stringify(account);
    expect(body).not.toContain("encrypted");
    expect(body).not.toContain("ya29");
    expect(account.email).toBe("sahin.wealll@gmail.com");
  });

  test("authorization URL requests read-only Gmail and hides the client secret", () => {
    const url = buildGoogleAuthUrl({
      clientId: "google-client",
      redirectUri: "http://localhost:5000/api/email/gmail/callback",
      state: "ab".repeat(32),
      loginHint: "sahin.wealll@gmail.com",
    });
    expect(url).toContain("login_hint=sahin.wealll%40gmail.com");
    expect(url).toContain("gmail.readonly");
    expect(url).toContain("access_type=offline");
    expect(url).not.toContain("google-secret");
    expect(url).not.toContain("gmail.modify");
    expect(url).not.toContain("gmail.send");
  });

  test("sanitizes HTML email content", () => {
    const clean = sanitizeEmailHtml(
      '<script>alert(1)</script><a href="javascript:alert(1)">bad</a><p onclick="alert(1)">Hello</p>'
    );
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("Hello");
  });

  test("marks unread messages and parses the sender", () => {
    const parsed = normalizeGmailMessage(sampleMessage("m2"));
    expect(parsed.isRead).toBe(false);
    expect(parsed.from.email).toBe("ada@example.com");
    expect(parsed.from.name).toBe("Ada Lovelace");
    expect(parsed.subject).toBe("Status <script>");
  });

  test("scopes mailbox search to the signed-in user", () => {
    const filter = buildMessageFilter("user-a", { q: "invoice", unread: "1" });
    expect(filter.user).toBe("user-a");
    expect(filter.isRead).toBe(false);
    expect(JSON.stringify(filter)).not.toContain("user-b");
  });

  test("rejects a cancelled or invalid OAuth return", async () => {
    mockStateUpdate.mockResolvedValue({ acknowledged: true });
    await expect(completeGmailOAuth({
      error: "access_denied",
      state: "ab".repeat(32),
    })).rejects.toMatchObject({ code: "access_denied" });
    expect(mockStateUpdate).toHaveBeenCalled();

    await expect(completeGmailOAuth({
      code: "auth-code",
      state: "not-a-valid-state",
    })).rejects.toMatchObject({ code: "invalid_state" });
  });

  test("refreshes an expired access token without returning it in a public field", async () => {
    const account = {
      encryptedAccessToken: encryptSecret("ya29.old-token"),
      encryptedRefreshToken: encryptSecret("refresh-token"),
      tokenExpiry: new Date(Date.now() - 10_000),
      save: jest.fn(async function save() { return this; }),
    };
    const fetchImpl = jest.fn(async () => jsonResponse({
      access_token: "ya29.refreshed",
      expires_in: 3600,
    }));
    const token = await getValidAccessToken(account, { fetchImpl });
    expect(token).toBe("ya29.refreshed");
    expect(account.save).toHaveBeenCalled();
    expect(account.encryptedAccessToken).not.toContain("ya29.refreshed");
    expect(JSON.stringify(toPublicAccount({
      _id: "acc",
      provider: "gmail",
      email: "a@gmail.com",
      isActive: true,
      encryptedAccessToken: account.encryptedAccessToken,
    }))).not.toContain("ya29");
  });

  test("syncs each Gmail id once and stops at the limit", async () => {
    mockMessageUpdate.mockImplementation(async (filter) => ({ _id: filter.gmailMessageId }));
    const account = {
      _id: "acc-1",
      user: "user-a",
      encryptedAccessToken: encryptSecret("ya29.current"),
      encryptedRefreshToken: encryptSecret("refresh-token"),
      tokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn(async function save() { return this; }),
    };
    const fetchImpl = jest.fn(async (url) => {
      const href = String(url);
      if (href.includes("pageToken=next")) {
        return jsonResponse({ messages: [{ id: "m1" }, { id: "m2" }] });
      }
      if (href.includes("/messages?")) {
        return jsonResponse({ messages: [{ id: "m1" }], nextPageToken: "next" });
      }
      const id = href.includes("/messages/m2") ? "m2" : "m1";
      return jsonResponse(sampleMessage(id));
    });

    const result = await syncAccountInbox(account, { limit: 10, fetchImpl });
    expect(result.synced).toBe(2);
    const ids = mockMessageUpdate.mock.calls.map((call) => call[0].gmailMessageId);
    expect(ids).toEqual(["m1", "m2"]);
    expect(mockMessageUpdate.mock.calls[0][0]).toEqual({
      emailAccount: "acc-1",
      gmailMessageId: "m1",
    });

    mockMessageUpdate.mockClear();
    await syncAccountInbox(account, { limit: 1, fetchImpl });
    expect(mockMessageUpdate).toHaveBeenCalledTimes(1);
  });

  test("does not open another user's message", async () => {
    mockMessageFindOne.mockResolvedValue(null);
    await expect(getOwnedMessageDetail("user-b", "507f1f77bcf86cd799439011"))
      .rejects.toMatchObject({ status: 404, code: "not_found" });
    expect(mockMessageFindOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      user: "user-b",
    });
  });

  test("strips tokens from logged sync errors", () => {
    expect(safeGmailError("failed ya29.secret-access Bearer abc")).not.toContain("ya29.secret-access");
    expect(safeGmailError("failed ya29.secret-access Bearer abc")).toContain("[token]");
  });
});
