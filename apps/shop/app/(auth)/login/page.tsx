import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { LoginFormClient } from './login-form';
import { PoweredByFooter } from '@/components/shared/powered-by-footer';

export default function LoginPage() {
  const isLiveSupabase = isSupabaseConfigured();

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-br from-[#F5EBE1] via-[#EADBCE] to-[#D4BFA8] text-[#3E2723]">
      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md mx-auto py-8">
        {/* Centered CafeSync full logo */}
        <div className="w-full max-w-[320px] sm:max-w-[360px] mb-6 flex justify-center">
          <img
            src="/brand/cafesync-logo-full.png"
            alt="CafeSync - Sales & Maintenance"
            className="w-full h-auto object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Shop Manager Sign In Form */}
        <LoginFormClient isLiveSupabase={isLiveSupabase} />
      </div>

      <PoweredByFooter variant="brand" className="text-[#6D4C41]" />
    </div>
  );
}
