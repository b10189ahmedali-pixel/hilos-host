import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "./api";

export interface ListState<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useList<T>(path: string): ListState<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<T[]>(path)
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
