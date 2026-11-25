'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/shop/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <p className="text-sm text-slate-600">Redirecting to Outlet Portal...</p>
    </div>
  );
}
