"use client";

import { useEffect } from "react";

function send(path: string, body: unknown) {
  const data = JSON.stringify(body);
  if (navigator.sendBeacon?.(path, new Blob([data], { type: "application/json" }))) return;
  fetch(path, { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

/** Counts taps on WhatsApp buttons (links with data-wa), for the dashboard. */
export function TrackClicks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[data-wa]");
      if (!link) return;
      send("/api/track", { intent: link.getAttribute("data-wa"), product: link.getAttribute("data-product") });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

/** Counts one view of a jersey page per browser session. */
export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    const key = `cs-view:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // private mode: count anyway
    }
    send("/api/view", { id });
  }, [id]);
  return null;
}
