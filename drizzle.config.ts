import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	// `turso` is libSQL, the same driver the app uses. It accepts an authToken
	// for a hosted database and still works against `file:local.db` locally.
	dialect: 'turso',
	dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN },
	verbose: true,
	strict: true
});
