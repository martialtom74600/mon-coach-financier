'use client';

import { ShoppingBag } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import { formatCurrency } from '@/app/lib/definitions';
import { PURCHASE_TYPES, PAYMENT_MODES } from '@/app/lib/definitions';
import type { Purchase, PaymentMode } from '@/app/lib/definitions';

interface PurchaseRecapProps {
  purchase: Purchase;
}

export function PurchaseRecap({ purchase }: PurchaseRecapProps) {
  const typeInfo =
    purchase.type && purchase.type in PURCHASE_TYPES
      ? PURCHASE_TYPES[purchase.type]
      : { label: purchase.type ?? 'Inconnu', color: 'bg-gray-100 text-gray-600' };
  const paymentLabel =
    purchase.paymentMode in PAYMENT_MODES
      ? PAYMENT_MODES[purchase.paymentMode as PaymentMode]
      : purchase.paymentMode;

  return (
    <Card className="p-5 border-slate-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{purchase.name}</h3>
          <div className="text-sm text-slate-500">
            {formatCurrency(purchase.amount)} • {paymentLabel}
          </div>
        </div>
      </div>
    </Card>
  );
}
