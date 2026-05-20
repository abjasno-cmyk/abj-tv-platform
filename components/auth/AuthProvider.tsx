"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/auth/LoginModal";

const PENDING_CONSENTS_KEY = "verox_pending_consents_v1";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<"google" | "facebook" | "email" | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const lastBootstrappedUserIdRef = useRef<string | null>(null);

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
      setLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        lastBootstrappedUserIdRef.current = null;
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    if (lastBootstrappedUserIdRef.current === user.id) return;
    void bootstrapUser(user);
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
    setUser(null);
    setProfile(null);
    setLoginModalOpen(false);
    setModalError(null);
  }, [supabase]);

  const handleOAuth = useCallback(
    async (provider: "google" | "facebook", options: { termsAccepted: boolean; newsletterOptIn: boolean }) => {
      if (!supabase) {
        setModalError("Přihlášení není dostupné: chybí konfigurace Supabase.");
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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
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
    [supabase]
  );

  const handleEmail = useCallback(
    async (email: string, options: { termsAccepted: boolean; newsletterOptIn: boolean }) => {
      if (!supabase) {
        setModalError("Přihlášení není dostupné: chybí konfigurace Supabase.");
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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
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
    [supabase]
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
