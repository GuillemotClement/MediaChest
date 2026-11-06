import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './drizzle.js';
import * as schema from '../db/index.js';

export const auth = betterAuth({
  trustedOrigins: [process.env.FRONT_URL ?? 'http://localhost:5173'],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
});
