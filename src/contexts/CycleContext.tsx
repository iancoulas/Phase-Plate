import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchCycleOverride, fetchLogsForMonth, saveCycleOverride, CycleOverride } from '../services/supabase';

interface CycleState {
  lastPeriodDate: Date;
  cycleLength: number;
  periodLength: number;
  loading: boolean;
  isDefaultData: boolean; // true when no override or logged period data was found
}

interface CycleContextValue extends CycleState {
  updateCycleSettings: (override: CycleOverride) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_STATE: CycleState = {
  lastPeriodDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  cycleLength: 28,
  periodLength: 5,
  loading: true,
  isDefaultData: true,
};

const CycleContext = createContext<CycleContextValue>({
  ...DEFAULT_STATE,
  loading: false,
  updateCycleSettings: async () => {},
  refresh: async () => {},
});

export function CycleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CycleState>(DEFAULT_STATE);

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const override = await fetchCycleOverride();
      if (override) {
        setState({
          lastPeriodDate: new Date(override.last_period_date),
          cycleLength: override.cycle_length,
          periodLength: override.period_length,
          loading: false,
          isDefaultData: false,
        });
        return;
      }

      // Derive from logged period days if no override
      const now = new Date();
      const logs = await fetchLogsForMonth(now.getFullYear(), now.getMonth() + 1);
      const periodLogs = logs
        .filter(l => l.flow_level && l.flow_level !== 'none')
        .sort((a, b) => a.log_date.localeCompare(b.log_date));

      if (periodLogs.length > 0) {
        setState({
          lastPeriodDate: new Date(periodLogs[0].log_date),
          cycleLength: 28,
          periodLength: 5,
          loading: false,
          isDefaultData: false,
        });
      } else {
        setState(s => ({ ...s, loading: false, isDefaultData: true }));
      }
    } catch (err) {
      console.warn('[CycleContext] load error:', err);
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCycleSettings = useCallback(async (override: CycleOverride) => {
    await saveCycleOverride(override);
    setState({
      lastPeriodDate: new Date(override.last_period_date),
      cycleLength: override.cycle_length,
      periodLength: override.period_length,
      loading: false,
      isDefaultData: false,
    });
  }, []);

  return (
    <CycleContext.Provider value={{ ...state, updateCycleSettings, refresh: load }}>
      {children}
    </CycleContext.Provider>
  );
}

export function useCycle() {
  return useContext(CycleContext);
}
