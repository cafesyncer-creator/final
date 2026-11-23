'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/master/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#EFE8E1] text-[#3E2723] flex items-center justify-center p-4">
      <span className="text-xs text-[#6D4C41]">Loading CafeSync Master...</span>
    </div>
  );
}
