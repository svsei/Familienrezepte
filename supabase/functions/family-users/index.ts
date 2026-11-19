import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {createHandler} from './handler.mjs';
Deno.serve(createHandler({env:(name:string)=>Deno.env.get(name),createClient}));
