import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { username } from "better-auth/plugins";
import { config } from "./config.js";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

export const auth = betterAuth({
  appName: "MediaChest",
  baseURL: config.authUrl,
  secret: config.authSecret,
  advanced: { ipAddress: { ipAddressHeaders: ["x-mediachest-client-ip"] } },
  trustedOrigins: [config.frontOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 })],
  disabledPaths: ["/sign-in/email", "/change-email", "/update-user", "/request-password-reset", "/reset-password"],
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const login = ctx.body?.username;
      if (typeof login !== "string" || !/^[a-zA-Z0-9_.]{3,30}$/.test(login)) {
        throw new APIError("BAD_REQUEST", {
          message: "L’identifiant doit contenir 3 à 30 lettres, chiffres, points ou underscores.",
        });
      }
      // Better Auth requires an email internally; no deliverable address is collected.
      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            username: login.toLowerCase(),
            displayUsername: login,
            name: login,
            email: `${randomUUID()}@users.invalid`,
          },
        },
      };
    }),
  },
});
