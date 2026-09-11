import { useCallback, useEffect, useRef, useState } from "react";

const SETTLE_DURATION_MS = 240;

type SettlingState = {
  value: number;
  settling: boolean;
  source: number;
  snapped: number;
};

export function useSettlingValue(raw: number, snapTo: number, idleMs = 140): {
  value: number;
  settling: boolean;
  settleNow: () => void;
} {
  const [state, setState] = useState<SettlingState>({ value: raw, settling: false, source: raw, snapped: raw });
  const rawRef = useRef(raw);
  const previousRawRef = useRef(raw);
  const mountedRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  rawRef.current = raw;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const settleNow = useCallback(() => {
    clearIdleTimer();
    clearSettleTimer();
    const source = rawRef.current;
    const snapped = Math.round(source / snapTo) * snapTo;
    setState({ value: snapped, settling: true, source, snapped });
    settleTimerRef.current = window.setTimeout(() => {
      setState((current) => ({ ...current, settling: false }));
      settleTimerRef.current = null;
    }, SETTLE_DURATION_MS);
  }, [clearIdleTimer, clearSettleTimer, snapTo]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (state.settling && raw === state.snapped) {
      return;
    }
    clearIdleTimer();
    clearSettleTimer();
    setState({ value: raw, settling: false, source: raw, snapped: raw });
    idleTimerRef.current = window.setTimeout(settleNow, idleMs);
  }, [clearIdleTimer, clearSettleTimer, idleMs, raw, settleNow]);

  useEffect(() => () => {
    clearIdleTimer();
    clearSettleTimer();
  }, [clearIdleTimer, clearSettleTimer]);

  const rawChanged = raw !== previousRawRef.current;
  previousRawRef.current = raw;
  const settling = state.settling && (raw === state.snapped || (!rawChanged && raw === state.source));
  return { value: settling ? state.value : raw, settling, settleNow };
}
