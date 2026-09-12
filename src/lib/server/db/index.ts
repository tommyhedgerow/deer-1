// The Drizzle client, created on first use rather than at import time.
//
// SvelteKit imports every server route during `vite build` to read route
// options, so anything that throws while this module is *evaluated* fails the
// build even though a connection is only ever needed to serve a request.
// Keeping construction lazy means the build needs no database secrets.
//
// `file:local.db` is fine in development. A serverless deploy needs a hosted
// libSQL database (e.g. `libsql://<db>-<org>.turso.io`) plus its auth token,
// because the deployment bundle is read-only on the deployed functions.
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type Db = ReturnType<typeof createDb>;

function createDb() {
	const url = env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	// A local file needs no token; a remote libSQL database requires one.
	const authToken = env.DATABASE_AUTH_TOKEN;

	return drizzle(createClient(authToken ? { url, authToken } : { url }), { schema });
}

let instance: Db | undefined;

/** Forwards to the real client, building it on first property access. */
export const db: Db = new Proxy({} as Db, {
	get(_target, prop) {
		instance ??= createDb();
		const value = Reflect.get(instance, prop, instance);
		return typeof value === 'function' ? value.bind(instance) : value;
	},
	has(_target, prop) {
		instance ??= createDb();
		return prop in instance;
	}
});
