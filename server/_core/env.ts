export const ENV = {
  // App
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "3000"),

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Auth
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  sessionMaxAgeMs: 1000 * 60 * 60 * 24 * 365, // 1 year

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // The full URL of your deployed app, e.g. https://fightclub.example.com
  appUrl: process.env.APP_URL ?? "http://localhost:3000",

  // Email (optional — leave blank to disable notifications)
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Fight Club <noreply@example.com>",

  // Owner — this user is auto-promoted to admin on first login
  ownerEmail: process.env.OWNER_EMAIL ?? "",
};
