"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/auth/LoginModal";
import { CANONICAL_HOST, LEGACY_VERCEL_HOST_PATTERN } from "@/lib/site";

const PENDING_CONSENTS_KEY = "verox_pending_consents_v1";
// Preview deployments must stay on their own host (visual review before
// merge). Only the production deployment canonicalizes the host.
const IS_PREVIEW_DEPLOYMENT = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

type ViewerProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

type PendingConsents = {
  termsAccepted: boolean;
  newsletterOptIn: boolean;
  source: string;
};

type LoginIntent = {
  reason?: string;
};

type AuthContextValue = {
  user: User | null;
  profile: ViewerProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  openLoginModal: (intent?: LoginIntent) => void;
  closeLoginModal: () => void;
  requestAuth: (action: () => void, intent?: LoginIntent) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readPendingConsentsFromStorage(): PendingConsents | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_CONSENTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingConsents>;
    if (typeof parsed !== "object" || !parsed) return null;
    return {
      termsAccepted: parsed.termsAccepted !== false,
      newsletterOptIn: parsed.newsletterOptIn === true,
      source: typeof parsed.source === "string" && parsed.source.trim() ? parsed.source.trim() : "login_modal",
    };
  } catch {
    return null;
  }
}

function storePendingConsentsInStorage(consents: PendingConsents) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(consents));
  } catch {
    // Ignore storage errors.
  }
}

function clearPendingConsentsStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_CONSENTS_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function resolvePreferredAuthOrigin(isPreview: boolean): string | null {
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol || "https:";
  const host = window.location.host;
  // Na preview deploymentu zůstaň na aktuálním (preview) hostu — nepřesměrovávej
  // login na produkci.
  if (isPreview) return `${protocol}//${host}`;
  if (LEGACY_VERCEL_HOST_PATTERN.test(host) && host.toLowerCase() !== CANONICAL_HOST) {
    return `${protocol}//${CANONICAL_HOST}`;
  }
  return `${protocol}//${host}`;
}

function redirectToPreferredAuthOriginIfNeeded(isPreview: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isPreview) return false;
  const preferredOrigin = resolvePreferredAuthOrigin(isPreview);
  if (!preferredOrigin) return false;
  const currentOrigin = `${window.location.protocol}//${window.location.host}`;
  if (preferredOrigin === currentOrigin) return false;
  window.location.replace(`${preferredOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`);
  return true;
}

export function AuthProvider({
  children,
  vercelEnv,
}: {
  children: React.ReactNode;
  vercelEnv?: string;
}) {
  // Spolehlivá detekce preview: VERCEL_ENV se předává ze serverového layoutu
  // (NEXT_PUBLIC_VERCEL_ENV se do klientského bundle nedostane).
  const isPreviewDeployment = vercelEnv === "preview" || IS_PREVIEW_DEPLOYMENT;
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [loading, setLoading] = useState(() => supabase !== null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<"google" | "facebook" | "email" | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const lastBootstrappedUserIdRef = useRef<string | null>(null);
  const lastSyncedAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    redirectToPreferredAuthOriginIfNeeded(isPreviewDeployment);
  }, [isPreviewDeployment]);

  const syncServerSession = useCallback(async (accessToken: string, refreshToken?: string | null) => {
    if (!accessToken) return;
    if (lastSyncedAccessTokenRef.current === accessToken) return;
    try {
      const response = await fetch("/api/auth/session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          refreshToken: refreshToken ?? undefined,
        }),
      });
      if (response.ok) {
        lastSyncedAccessTokenRef.current = accessToken;
      }
    } catch {
      // Sync is best-effort. Client session still works.
    }
  }, []);

  const clearServerSession = useCallback(async () => {
    await fetch("/api/auth/session-sync", { method: "DELETE" }).catch(() => {
      // Ignore best-effort cleanup errors.
    });
    lastSyncedAccessTokenRef.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const response = await fetch("/api/viewer/profile", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { profile?: ViewerProfile };
    if (payload.profile) {
      setProfile(payload.profile);
    }
  }, [supabase]);

  const bootstrapUser = useCallback(
    async (currentUser: User) => {
      const pendingConsents = readPendingConsentsFromStorage();
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsAccepted: pendingConsents?.termsAccepted ?? true,
          newsletterOptIn: pendingConsents?.newsletterOptIn ?? false,
          source: pendingConsents?.source ?? "session_sync",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        profile?: ViewerProfile;
        error?: string;
      };
      if (!response.ok) {
        setModalError(payload.error ?? "Přihlášení proběhlo, ale účet se nepodařilo inicializovat.");
      } else if (payload.profile) {
        setProfile(payload.profile);
        clearPendingConsentsStorage();
      }

      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        action();
      }

      setLoginModalOpen(false);
      setBusyProvider(null);
      if (!payload.error) {
        setModalError(null);
      }
      lastBootstrappedUserIdRef.current = currentUser.id;
    },
    []
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;
    void Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]).then(([userResult, sessionResult]) => {
      if (!mounted) return;
      setUser(userResult.data.user ?? null);
      const session = sessionResult.data.session;
      if (session?.access_token) {
        void syncServerSession(session.access_token, session.refresh_token ?? null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        lastBootstrappedUserIdRef.current = null;
        void clearServerSession();
      } else if (session.access_token) {
        void syncServerSession(session.access_token, session.refresh_token ?? null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearServerSession, supabase, syncServerSession]);

  useEffect(() => {
    if (!user) return;
    if (lastBootstrappedUserIdRef.current === user.id) return;
    const timer = window.setTimeout(() => {
      void bootstrapUser(user);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bootstrapUser, user]);

  const openLoginModal = useCallback((intent?: LoginIntent) => {
    setLoginReason(intent?.reason ?? null);
    setModalError(null);
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setBusyProvider(null);
  }, []);

  const requestAuth = useCallback(
    (action: () => void, intent?: LoginIntent): boolean => {
      if (user) {
        action();
        return true;
      }
      pendingActionRef.current = action;
      openLoginModal(intent);
      return false;
    },
    [openLoginModal, user]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await clearServerSession();
    setUser(null);
    setProfile(null);
    setLoginModalOpen(false);
    setModalError(null);
  }, [clearServerSession, supabase]);

  const handleOAuth = useCallback(
    async (provider: "google" | "facebook", options: { termsAccepted: boolean; newsletterOptIn: boolean }) => {
      if (!supabase) {
        setModalError("Přihlášení není dostupné: chybí konfigurace Supabase.");
        return;
      }
      if (redirectToPreferredAuthOriginIfNeeded(isPreviewDeployment)) {
        return;
      }
      setBusyProvider(provider);
      setModalError(null);
      storePendingConsentsInStorage({
        termsAccepted: options.termsAccepted,
        newsletterOptIn: options.newsletterOptIn,
        source: "login_modal",
      });
      const nextPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : "/live";
      const preferredOrigin = resolvePreferredAuthOrigin(isPreviewDeployment);
      const redirectTo =
        preferredOrigin
          ? `${preferredOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          : undefined;

      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (result.error) {
        setBusyProvider(null);
        setModalError(result.error.message);
      }
    },
    [supabase, isPreviewDeployment]
  );

  const handleEmail = useCallback(
    async (email: string, options: { termsAccepted: boolean; newsletterOptIn: boolean }) => {
      if (!supabase) {
        setModalError("Přihlášení není dostupné: chybí konfigurace Supabase.");
        return;
      }
      if (redirectToPreferredAuthOriginIfNeeded(isPreviewDeployment)) {
        return;
      }
      setBusyProvider("email");
      setModalError(null);
      storePendingConsentsInStorage({
        termsAccepted: options.termsAccepted,
        newsletterOptIn: options.newsletterOptIn,
        source: "magic_link",
      });

      const nextPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : "/live";
      const preferredOrigin = resolvePreferredAuthOrigin(isPreviewDeployment);
      const redirectTo =
        preferredOrigin
          ? `${preferredOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          : undefined;

      const result = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      setBusyProvider(null);
      if (result.error) {
        setModalError(result.error.message);
        return;
      }
      setModalError("Na e-mail jsme poslali bezpečný odkaz pro přihlášení.");
    },
    [supabase, isPreviewDeployment]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: Boolean(user),
      openLoginModal,
      closeLoginModal,
      requestAuth,
      signOut,
      refreshProfile,
    }),
    [closeLoginModal, loading, openLoginModal, profile, refreshProfile, requestAuth, signOut, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        key={`${loginModalOpen ? "open" : "closed"}-${user?.id ?? "anon"}`}
        open={loginModalOpen}
        reason={loginReason}
        busyProvider={busyProvider}
        errorMessage={modalError}
        onClose={closeLoginModal}
        onOAuth={handleOAuth}
        onEmail={handleEmail}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth musí být použito uvnitř AuthProvider.");
  }
  return value;
}
