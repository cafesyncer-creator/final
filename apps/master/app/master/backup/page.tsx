'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { BackupView } from '@/components/master/backup-view';
import { DEMO_MASTER_BRANDS } from '@/lib/demo-master-data';
import { DEMO_ADMIN_SHOPS } from '@/lib/demo-admin-data';
import { Loader2 } from 'lucide-react';

export default function MasterBackupPage() {
  const { profile, isLive } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['master-backup-data', isLive],
    queryFn: async () => {
      if (!isLive) {
        return {
          brands: [],
          history: [],
          removals: [],
          batches: [],
        };
      }

      const [
        { data: dbBrands, error: brandsErr },
        { data: dbHistory, error: historyErr },
        { data: dbRemovals },
        { data: dbBatches },
      ] = await Promise.all([
        (supabase as any)
          .from('brands')
          .select('id, name, slug, status, shops(id, name, code)')
          .order('name', { ascending: true }),
        (supabase as any)
          .from('backup_log')
          .select('*, brands(name)')
          .order('created_at', { ascending: false })
          .limit(30),
        (supabase as any)
          .from('removal_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        (supabase as any)
          .from('import_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      if (brandsErr) console.error('Error fetching brands for backup:', brandsErr);
      if (historyErr) console.error('Error fetching backup log history:', historyErr);

      const brands = (dbBrands || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        status: b.status,
        shops_count: Array.isArray(b.shops) ? b.shops.length : 0,
        shops: Array.isArray(b.shops) ? b.shops : [],
      }));

      const history = (dbHistory || []).map((h: any) => ({
        id: h.id,
        scope: h.scope,
        brand_id: h.brand_id,
        date_range: h.date_range,
        file_size: h.file_size,
        row_counts: h.row_counts,
        created_at: h.created_at,
        brand_name: h.brands?.name || (h.scope === 'all' ? 'All Brands' : null),
      }));

      return {
        brands,
        history,
        removals: dbRemovals || [],
        batches: dbBatches || [],
      };
    },
  });

  const masterUser = {
    id: profile?.id,
    fullName: profile?.full_name || 'Platform Master',
    email: profile?.email || '',
    phone: profile?.phone || '',
    role: 'master' as const,
  };

  return (
    <SharedAppLayout user={masterUser}>
      {isLoading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#B9A58A] text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#C68846]" />
          <span>Loading platform backup archives &amp; recovery ledger...</span>
        </div>
      ) : (
        <BackupView
          brands={data.brands}
          initialHistory={data.history}
          initialRemovals={data.removals}
          initialBatches={data.batches}
        />
      )}
    </SharedAppLayout>
  );
}
