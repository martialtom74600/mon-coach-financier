'use client';

import { useState, useCallback } from 'react';

export interface ConfirmDeleteState {
  open: boolean;
  id: string | null;
}

export function useConfirmDelete() {
  const [state, setState] = useState<ConfirmDeleteState>({ open: false, id: null });

  const openConfirm = useCallback((id: string) => {
    setState({ open: true, id });
  }, []);

  const closeConfirm = useCallback(() => {
    setState({ open: false, id: null });
  }, []);

  const wrapConfirm = useCallback(
    (deleteFn: (id: string) => Promise<void>) => async () => {
      const id = state.id;
      closeConfirm();
      if (!id) return;
      await deleteFn(id);
    },
    [state.id, closeConfirm]
  );

  return { state, openConfirm, closeConfirm, wrapConfirm };
}
