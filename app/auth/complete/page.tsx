'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handoff = searchParams.get('handoff');
    if (!handoff) {
      setError('Chybí přihlašovací token.');
      return;
    }

    let cancelled = false;

    async function finish() {
      try {
        const response = await fetch('/api/auth/complete-handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handoff }),
        });

        const data = (await response.json()) as {
          redirect_to?: string;
          error?: string;
        };

        if (!response.ok || !data.redirect_to) {
          throw new Error(data.error || 'Přihlášení se nepodařilo dokončit.');
        }

        if (!cancelled) {
          router.replace(data.redirect_to);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Přihlášení se nepodařilo dokončit.');
        }
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <a href="/nazory" className="text-[#c8a84b] hover:underline">
            Zpět na Názory
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <p className="text-white/70">Dokončuji přihlášení…</p>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
          <p className="text-white/70">Dokončuji přihlášení…</p>
        </div>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
