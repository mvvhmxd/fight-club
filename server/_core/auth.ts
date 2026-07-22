/**
 * auth.ts — Standard JWT authentication helpers (replaces Manus SDK)
 *
 * - signSession(userId): creates a signed JWT stored in an httpOnly cookie
 * - verifySession(token): verifies and decodes the JWT
 * - authenticateRequest(req): extracts and verifies the session from the request
 */
import jwt from "jsonwebtoken";
import type { Request } from "express";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";

export type SessionPayload = {
  userId: number;
  openId: string;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, ENV.jwtSecret, {
    expiresIn: "365d",
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extracts the session cookie from the request, verifies it, and returns
 * the decoded payload. Returns null if the cookie is missing or invalid.
 */
export function getSessionFromRequest(req: Request): SessionPayload | null {
  const cookies = parseCookie(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}
