"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function SessionKeepAlive({ endpoint }: { endpoint: string }) {
  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      const response = await fetch(endpoint, { method: "POST", cache: "no-store" }).catch(() => null);
      if (response?.status === 401) window.location.reload();
    }

    void refresh();
    const interval = window.setInterval(refresh, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [endpoint]);

  return null;
}