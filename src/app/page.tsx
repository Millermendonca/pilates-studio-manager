'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/agenda');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <div className="w-10 h-10 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-semibold text-slate-500">Abrindo Agenda do Estúdio...</p>
    </div>
  );
}
