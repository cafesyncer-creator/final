import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { LoginFormClient } from './login-form';
import { PoweredByFooter } from '@/components/shared/powered-by-footer';

export default function LoginPage() {
  const isLiveSupabase = isSupabaseConfigured();

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-br from-[#EADBC8] via-[#DAC0A3] to-[#C8A987] text-[#3E2723]">
      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md mx-auto py-8">
        {/* Centered full CafeSync logo */}
        <div className="w-full max-w-[340px] sm:max-w-[380px] mb-6 flex justify-center">
          <img
            src="/brand/cafesync-logo-full.png"
            alt="CafeSync - Sales & Maintenance"
            className="w-full h-auto object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Master Sign In Form */}
        <LoginFormClient isLiveSupabase={isLiveSupabase} />
      </div>

      <PoweredByFooter variant="master" className="text-[#6D4C41]" />
    </div>
  );
}
