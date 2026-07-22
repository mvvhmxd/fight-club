export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Redirect the user to the Google OAuth login flow.
 * Call this from an event handler only — never during render.
 */
export const startLogin = () => {
  window.location.href = "/api/auth/google";
};
