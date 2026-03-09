'use client';

import React from 'react';
import Button from './Button';
import Modal from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <Modal open={open} onClose={onCancel} blur={false} contentClassName="max-w-sm w-full border border-slate-200 shadow-xl" aria-labelledby="confirm-dialog-title">
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button size="sm" className={confirmClass} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
