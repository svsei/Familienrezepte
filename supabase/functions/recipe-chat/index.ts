import { createHandler } from './handler.mjs';

// Auth is checked against Supabase Auth on every request inside the handler.
// No service-role key is used; membership reads use the caller's JWT and RLS.
Deno.serve(createHandler({ env: (name: string) => Deno.env.get(name) }));
