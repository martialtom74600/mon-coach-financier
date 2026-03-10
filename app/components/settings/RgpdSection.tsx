'use client';

import React, { useState } from 'react';
import { Shield, Download, Trash2 } from 'lucide-react';
import ContextToggle from '@/app/components/ui/ContextToggle';
import Button from '@/app/components/ui/Button';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import { useToast } from '@/app/components/ui/Toast';

export interface RgpdSectionProps {
  consentAnalytics: boolean;
  consentMarketing: boolean;
  onConsentAnalyticsChange: (enabled: boolean) => void;
  onConsentMarketingChange: (enabled: boolean) => void;
  saving?: boolean;
}

export default function RgpdSection({
  consentAnalytics,
  consentMarketing,
  onConsentAnalyticsChange,
  onConsentMarketingChange,
  saving = false,
}: RgpdSectionProps) {
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/me/export');
      if (!res.ok) {
        showToast('Rien à exporter pour l\'instant.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export téléchargé !', 'success');
    } catch {
      showToast('Oups, l\'export a coincé. Tu réessaies ?', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/me', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Oups, la suppression a coincé. Tu réessaies ?', 'error');
        setDeleteOpen(false);
        return;
      }
      showToast('C\'est fait. À bientôt !', 'success');
      setDeleteOpen(false);
      window.location.href = '/';
    } catch {
      showToast('Oups, la suppression a coincé. Tu réessaies ?', 'error');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <ContextToggle
          label="Statistiques anonymes"
          subLabel="On utilise des données agrégées pour améliorer le service"
          icon={Shield}
          checked={consentAnalytics}
          onChange={onConsentAnalyticsChange}
          variant="indigo"
          disabled={saving}
        />
        <ContextToggle
          label="Offres et actualités"
          subLabel="Recevoir des offres et actualités (optionnel)"
          icon={Shield}
          checked={consentMarketing}
          onChange={onConsentMarketingChange}
          variant="indigo"
          disabled={saving}
        />
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-3">
        <p className="text-sm font-medium text-slate-700">Tes données</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download size={16} className="mr-2" />
            Exporter mes données
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            <Trash2 size={16} className="mr-2" />
            Supprimer mon compte
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer mon compte"
        message="C'est définitif. Toutes tes données seront supprimées."
        confirmLabel="Supprimer définitivement"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
