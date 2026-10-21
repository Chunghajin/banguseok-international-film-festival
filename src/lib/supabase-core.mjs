import { randomBytes } from "node:crypto";

export class G1Error extends Error {
  constructor(status, code = "REQUEST_FAILED") {
    super(`G1 request failed (${status}, ${/^[A-Za-z0-9_]+$/.test(code) ? code : "REQUEST_FAILED"})`);
    this.status = status;
    this.code = code;
  }
}

// Node-only core. Product callers must enter through the server-only validated facade.
export function createG1Client(env, fetcher = fetch) {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !secret) throw new Error("G1_CONFIG_MISSING");
  const base = new URL(url);
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
    || (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) {
    throw new Error("G1_CONFIG_INVALID_URL");
  }

  /** @param {string} path @param {{method?:string,token?:string,admin?:boolean,body?:unknown,prefer?:string}} [options] */
  async function request(path, { method = "GET", token, admin = false, body, prefer } = {}) {
    const target = new URL(path, base);
    if (target.origin !== base.origin) throw new G1Error(400, "INVALID_TARGET");
    let response;
    try {
      response = await fetcher(target, {
        method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: {
          apikey: admin ? secret : publicKey,
          // New publishable keys are not JWTs. Only bearer access tokens or legacy service-role JWTs go here.
          ...(admin ? { Authorization: `Bearer ${secret}` } : token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(prefer ? { Prefer: prefer } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new G1Error(503, "NETWORK_OR_TIMEOUT"); }
    let data = null;
    try { data = await response.json(); } catch { /* DELETE may have no response body. */ }
    if (!response.ok) {
      // Auth's numeric code is an HTTP status; error_code carries the machine-readable reason.
      const code = typeof data?.code === "string" ? data.code
        : typeof data?.error_code === "string" ? data.error_code : undefined;
      throw new G1Error(response.status, code);
    }
    return data;
  }

  async function user(token) {
    if (!token) throw new G1Error(401, "UNAUTHENTICATED");
    let verified;
    try {
      verified = await request("/auth/v1/user", { token });
    } catch (error) {
      // Auth may reject a non-JWT public token with 403; it never grants an identity.
      if (error instanceof G1Error && [401, 403].includes(error.status)) {
        throw new G1Error(401, "UNAUTHENTICATED");
      }
      throw error;
    }
    if (!verified?.id || verified.is_anonymous !== true) throw new G1Error(401, "UNAUTHENTICATED");
    return verified.id;
  }

  async function read(token, id) {
    await user(token);
    const rows = await request(`/rest/v1/festivals?id=eq.${encodeURIComponent(id)}&select=*`, { token });
    if (rows.length !== 1) throw new G1Error(404, "NOT_FOUND");
    return rows[0];
  }

  return {
    request,
    async signIn(captchaToken) {
      const session = await request("/auth/v1/signup", {
        method: "POST", body: { data: {}, ...(captchaToken ? { gotrue_meta_security: { captcha_token: captchaToken } } : {}) },
      });
      if (!session?.access_token || !session.user?.id || session.user.is_anonymous !== true) {
        throw new G1Error(401, "ANONYMOUS_SESSION_REQUIRED");
      }
      return session;
    },
    user, read,
    async save(token, input) {
      const owner = await user(token);
      // The runner owns this fixture, not a browser. Product input validation and result calculation are a later step.
      if (Buffer.byteLength(JSON.stringify(input)) > 16384) throw new G1Error(400, "INPUT_TOO_LARGE");
      const name = input.p_nickname.trim().normalize("NFC").replace(/[\p{Cc}]/gu, "") || "익명의 집행위원장";
      if ([...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(name)].length > 12) {
        throw new G1Error(400, "INVALID_NICKNAME");
      }
      return request("/rest/v1/rpc/save_festival", {
        admin: true, method: "POST", body: { ...input, p_nickname: name, p_owner: owner },
      });
    },
    async publish(token, id, revision, unpublish = false) {
      const owner = await user(token);
      return request("/rest/v1/rpc/publish_festival", {
        admin: true, method: "POST", body: {
          p_owner: owner, p_id: id, p_expected_revision: revision,
          p_token: randomBytes(32).toString("base64url"), p_unpublish: unpublish,
        },
      });
    },
    async publicRead(shareToken) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(shareToken)) throw new G1Error(404, "NOT_FOUND");
      const rows = await request(`/rest/v1/festival_shares?token=eq.${shareToken}&select=public_snapshot`, { admin: true });
      if (rows.length !== 1) throw new G1Error(404, "NOT_FOUND");
      return rows[0].public_snapshot;
    },
    async remove(token, id, revision) {
      const owner = await user(token);
      const rows = await request(`/rest/v1/festivals?id=eq.${encodeURIComponent(id)}&owner_id=eq.${owner}&revision=eq.${revision}`, {
        admin: true, method: "DELETE", prefer: "return=representation",
      });
      if (!rows.length) {
        await read(token, id);
        throw new G1Error(409, "CONFLICT");
      }
    },
  };
}
