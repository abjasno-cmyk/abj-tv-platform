import { createBrowserClient } from "@supabase/ssr";

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function maybeExtractAssignedValue(value?: string, expectedKey?: string): string | undefined {
  const sanitized = sanitizeEnvValue(value);
  if (!sanitized) {
    return undefined;
  }

  if (expectedKey && sanitized.startsWith(`${expectedKey}=`)) {
    return sanitizeEnvValue(sanitized.slice(expectedKey.length + 1));
  }

  return sanitized;
}

export function createSupabaseBrowserClient() {
  const supabaseUrl = maybeExtractAssignedValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL"
  );
  const supabaseAnonKey = maybeExtractAssignedValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars not set");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
