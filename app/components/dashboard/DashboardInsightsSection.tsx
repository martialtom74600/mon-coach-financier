'use client';

import React, { useEffect, useState } from 'react';
import { EducationalModal } from '@/app/components/dashboard/EducationalModal';
import ProactiveInsightsCard, { type StoredInsight } from '@/app/components/dashboard/ProactiveInsightsCard';
import type { ActionGuide } from '@/app/lib/definitions';

export default function DashboardInsightsSection({
  initialInsights = [],
}: {
  initialInsights?: StoredInsight[];
}) {
  const [selectedGuide, setSelectedGuide] = useState<ActionGuide | null>(null);
  const [insights, setInsights] = useState<StoredInsight[]>(initialInsights);

  useEffect(() => {
    setInsights(initialInsights);
  }, [initialInsights]);

  if (insights.length === 0) return null;

  return (
    <>
      {selectedGuide && (
        <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
      )}
      <ProactiveInsightsCard
        insights={insights}
        onDismiss={(id) => setInsights((prev) => prev.filter((i) => i.id !== id))}
        onOpenGuide={(guide) => setSelectedGuide(guide)}
      />
    </>
  );
}
