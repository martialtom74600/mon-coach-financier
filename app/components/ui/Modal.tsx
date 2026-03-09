'use client';

import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** z-index du modal. Default 50. EducationalModal utilise 100. */
  zIndex?: number;
  /** Overlay avec backdrop-blur. Default true. ConfirmDialog utilise false. */
  blur?: boolean;
  /** Cliquer sur l'overlay ferme le modal. Default true. */
  closeOnOverlayClick?: boolean;
  /** Classes additionnelles pour le conteneur du contenu (max-w, etc.) */
  contentClassName?: string;
  /** Attributs ARIA optionnels */
  'aria-labelledby'?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  zIndex = 50,
  blur = true,
  closeOnOverlayClick = true,
  contentClassName = '',
  'aria-labelledby': ariaLabelledBy,
}: ModalProps) {
  if (!open) return null;

  const overlayClass = blur
    ? 'bg-slate-900/60 backdrop-blur-md'
    : 'bg-slate-900/50';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-200`}
      style={{ zIndex }}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      {...(ariaLabelledBy && { 'aria-labelledby': ariaLabelledBy })}
    >
      <div className={`absolute inset-0 ${overlayClass}`} aria-hidden="true" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
