import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Dit dwingt Windows om het exacte, absolute pad naar .env.local te gebruiken
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});