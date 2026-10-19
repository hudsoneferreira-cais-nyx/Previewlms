import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/database.types";

// Chaves públicas (publicáveis): seguras no navegador. O que protege os dados
// são as regras de acesso (RLS) do banco.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://igsxucbtbcnyqtdtdfwz.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_FUdJPLmhBNzRNQlFdMBQjw_kq9hUtxE";

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
