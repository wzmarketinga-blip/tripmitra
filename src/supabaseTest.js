import { supabase } from "./lib/supabase";

console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Supabase Client:", supabase);