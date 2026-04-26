"use client";

/**
 * Tiny window-event bus for opening the ConciergeWidget from anywhere in
 * the app, optionally pre-filling the input with a question.
 *
 * Used when Fragella has no result for a search and we want to offer the
 * user a "demande à la conciergerie" CTA that opens the chat with a
 * sensible draft like "Trouve-moi le parfum: <query>".
 */

const EVENT_NAME = "la-niche:open-concierge";

export type OpenConciergeDetail = {
  /** Pre-fill the input with this text. Empty = open with no draft. */
  message?: string;
  /** When true, the widget auto-submits the message immediately. */
  autosend?: boolean;
};

/** Fire from anywhere (client-side) to open the concierge chat. */
export function openConcierge(detail: OpenConciergeDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenConciergeDetail>(EVENT_NAME, { detail }),
  );
}

/** Subscribe to open-requests. Returns an unsubscribe function. Used by
 *  the ConciergeWidget itself. */
export function onOpenConcierge(
  handler: (detail: OpenConciergeDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapped = (e: Event) => {
    const ce = e as CustomEvent<OpenConciergeDetail>;
    handler(ce.detail ?? {});
  };
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}
