// src/hooks/useApi.js
import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useApi(endpoint, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
  ).toString();

  const url = `${BASE_URL}${endpoint}${queryString ? "?" + queryString : ""}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export const API_BASE = BASE_URL;
