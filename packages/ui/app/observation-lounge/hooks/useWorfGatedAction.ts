'use client';

/**
 * Sole gateway for Aha mutations from UI components: trigger a WorfGateAction here and
 * render <WorfGateModal> with these handlers — never fetch a write endpoint directly.
 */

import { useCallback, useState } from 'react';
import type { WorfGateAction } from '../components/types';

export function useWorfGatedAction(): {
  pendingAction: WorfGateAction | null;
  trigger: (action: WorfGateAction) => void;
  onConfirm: (result: unknown) => void;
  onCancel: () => void;
  lastResult: unknown;
  lastError: string | null;
} {
  const [pendingAction, setPendingAction] = useState<WorfGateAction | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const trigger = useCallback((action: WorfGateAction) => {
    setPendingAction(action);
  }, []);

  const onConfirm = useCallback((result: unknown) => {
    setLastResult(result);
    setLastError(
      typeof result === 'object' && result !== null && 'error' in result
        ? String((result as { error: unknown }).error)
        : null
    );
    setPendingAction(null);
  }, []);

  const onCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  return { pendingAction, trigger, onConfirm, onCancel, lastResult, lastError };
}
