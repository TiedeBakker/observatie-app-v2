import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts", // Hier gaan we zo het schema in zetten
  out: "./drizzle",         // Hier komen de SQL-migratiebestanden
  dialect: "turso",         // We vertellen Drizzle dat we Turso (libSQL) gebruiken
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});