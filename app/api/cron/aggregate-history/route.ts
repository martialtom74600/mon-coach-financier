/**
 * F.3 — Rétention AssetHistory
 * CRON job : agrège les snapshots > 12 mois en points mensuels.
 * Protégé par CRON_SECRET (Vercel Cron envoie Authorization: Bearer <CRON_SECRET>).
 */

import { NextRequest, NextResponse } from 'next/server';
import { assetService } from '@/app/services';
import { logger } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    logger.warn('CRON_AGGREGATE_HISTORY', { reason: 'CRON_SECRET not configured' });
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await assetService.aggregateAssetHistory();
    logger.info('CRON_AGGREGATE_HISTORY', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error('CRON_AGGREGATE_HISTORY', {}, error);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 });
  }
}
