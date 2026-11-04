import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { account, session, user } from "./db/schema.js";

const username = "gizmo";
const email = "guillemot.clement35@gmail.com";

export async function ensureAdministrator() {
  return db.transaction(async (tx) => {
    // Serialize bootstrap when multiple API containers start together.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(188936, 1)`);
    const matches = await tx.select().from(user).where(or(eq(user.username, username), eq(user.email, email)));
    const existing = matches[0];
    if (matches.length > 1 || (existing && (existing.username !== username || (existing.email !== email && !existing.email.endsWith("@users.invalid"))))) {
      throw new Error("Impossible d’initialiser l’administrateur : identifiant ou email déjà utilisé par un autre compte.");
    }
    if (existing?.role === "admin") return { created: false, id: existing.id };

    const id = existing?.id || randomUUID();
    const password = await hashPassword("password");
    if (existing) {
      // Upgrade the pre-existing local gizmo account, preserving its library.
      await tx.update(user).set({ email, role: "admin", updatedAt: new Date() }).where(eq(user.id, id));
      await tx.delete(session).where(eq(session.userId, id));
    } else {
      await tx.insert(user).values({ id, username, displayUsername: username, name: username, email, role: "admin", emailVerified: false });
    }
    const [credential] = await tx.select().from(account).where(and(eq(account.userId, id), eq(account.providerId, "credential")));
    if (credential) await tx.update(account).set({ password, updatedAt: new Date() }).where(eq(account.id, credential.id));
    else await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password, createdAt: new Date(), updatedAt: new Date() });
    return { created: true, id };
  });
}
