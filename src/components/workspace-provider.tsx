"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listDatasets, listRunSummaries, listTemplates } from "@/lib/db";
import type { Dataset, RunSummary, Template } from "@/lib/types";

interface WorkspaceValue {
  datasets: Dataset[];
  templates: Template[];
  runs: RunSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextDatasets, nextTemplates, nextRuns] = await Promise.all([
        listDatasets(),
        listTemplates(),
        listRunSummaries(),
      ]);
      setDatasets(nextDatasets);
      setTemplates(nextTemplates);
      setRuns(nextRuns);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The local workspace could not be opened. Check that browser storage is available.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ datasets, templates, runs, loading, error, refresh }),
    [datasets, templates, runs, loading, error, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return context;
}
