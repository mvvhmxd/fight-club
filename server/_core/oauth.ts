/**
 * Google OAuth 2.0 authentication routes
 *
 * Flow:
 *   1. GET /api/auth/google          → redirect to Google consent screen
 *   2. GET /api/auth/google/callback → exchange code for tokens, upsert user, set session cookie
 *   3. POST /api/auth/logout         → clear session cookie
 */
import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import { serialize } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { upsertUser, getUserByOpenId } from "../db";
import { signSession } from "./auth";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

function getOAuthClient() {
  return new OAuth2Client(
    ENV.googleClientId,
    ENV.googleClientSecret,
    `${ENV.appUrl}/api/auth/google/callback`
  );
}

export function registerOAuthRoutes(app: Express) {
  // ── Step 1: Redirect to Google ──────────────────────────────────────────────
  app.get("/api/auth/google", (_req: Request, res: Response) => {
    const client = getOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    res.redirect(302, url);
  });

  // ── Step 2: Handle callback ─────────────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    try {
      const client = getOAuthClient();
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verify the ID token and extract user info
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: ENV.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        return res.status(400).json({ error: "Invalid Google token payload" });
      }

      const openId = `google:${payload.sub}`;
      const email = payload.email ?? null;
      const name = payload.name ?? email ?? "Member";

      // Auto-promote owner email to admin
      const isOwner = ENV.ownerEmail && email === ENV.ownerEmail;

      await upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
        ...(isOwner ? { role: "admin" } : {}),
      });

      const user = await getUserByOpenId(openId);
      if (!user) {
        return res.status(500).json({ error: "Failed to create user" });
      }

      const sessionToken = signSession({ userId: user.id, openId });
      const cookieOptions = getSessionCookieOptions(req);
      res.setHeader(
        "Set-Cookie",
        serialize(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS / 1000,
        })
      );
      return res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed:", error);
      return res.status(500).json({ error: "Authentication failed" });
    }
  });

  // ── Step 3: Logout ──────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.setHeader(
      "Set-Cookie",
      serialize(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 })
    );
    res.json({ success: true });
  });
}
