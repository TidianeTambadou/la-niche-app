"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";
import {
  BodySilhouette,
  fragranceInitials,
} from "@/components/BodySilhouette";
import {
  BODY_ZONE_LABELS,
  type BodyZone,
} from "@/lib/fragrances";
import { fragranceKey, useFragrances, type Fragrance } from "@/lib/data";
import { useStore, type BodyPlacement } from "@/lib/store";
import { agentSearch } from "@/lib/agent-client";
import type { SearchCandidate } from "@/lib/agent";

export default function FreeBaladePage() {
  const router = useRouter();
  const fragrances = useFragrances();
  const {
    activeBalade,
    startBalade,
    layerOnBody,
    movePlacement,
    removePlacementAt,
  } = useStore();

  const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
  /** Last clicked point on the body — kept for camera focus continuity after
   *  a placement so the user keeps seeing the spot they just drew. */
  const [selectedPosition, setSelectedPosition] = useState<
    [number, number, number] | null
  >(null);
  /**
   * Free-balade flow state machine. Reflects the real perfumery sequence:
   * smell first (search OR scan a perfume), THEN decide where on the body
   * you want it.
   *
   *   idle       → user can drag/zoom the model. Body taps do not place.
   *   searching  → SearchSheet open
   *   scanning   → ScanSheet open
   *   placing    → fragrance picked, body becomes interactive: next tap on
   *                the mannequin draws the marker at the click point.
   */
  type Flow =
    | { kind: "idle" }
    | { kind: "scanning" }
    | { kind: "placing"; fragrance: Fragrance }
    /** User has tapped a body point but hasn't confirmed yet. The preview
     *  marker is drawn at `position`. Re-tapping moves the preview; the
     *  ConfirmBanner is the only way to commit. */
    | {
        kind: "confirming";
        fragrance: Fragrance;
        zone: BodyZone;
        position: [number, number, number];
      };
  const [flow, setFlow] = useState<Flow>({ kind: "idle" });
  const [editingFragranceId, setEditingFragranceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!activeBalade) {
      startBalade({ mode: "free" });
    } else if (activeBalade.mode !== "free") {
      router.replace("/balade/guided/active");
    }
  }, [activeBalade, startBalade, router]);

  const placements = activeBalade?.placements ?? [];

  const filledMarkers = useMemo(
    () =>
      placements
        .map((p) => {
          const f = fragrances.find((x) => x.key === p.fragranceId);
          if (!f) return null;
          return {
            fragranceId: p.fragranceId,
            zone: p.zone,
            label: fragranceInitials(f.name),
            position: p.position,
          };
        })
        .filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [placements, fragrances],
  );

  function handleBodyClick(
    zone: BodyZone,
    position: [number, number, number],
  ) {
    // 1) MOVE flow takes priority (user clicked "déplacer" on an existing
    //    placement and is now picking a new point). Move is INSTANT (the user
    //    explicitly chose to relocate; no second confirmation).
    if (editingFragranceId) {
      movePlacement(editingFragranceId, zone, position);
      setEditingFragranceId(null);
      setSelectedZone(zone);
      setSelectedPosition(position);
      return;
    }

    // 2) PLACEMENT flow: tap = preview only. Move into "confirming" state,
    //    keep the same fragrance, store the candidate zone/position. The
    //    ConfirmBanner button is the only way to actually commit.
    if (flow.kind === "placing" || flow.kind === "confirming") {
      const fragrance =
        flow.kind === "placing" ? flow.fragrance : flow.fragrance;
      setFlow({ kind: "confirming", fragrance, zone, position });
      setSelectedZone(zone);
      setSelectedPosition(position);
      return;
    }

    // 3) IDLE: tap only zooms (handled internally by BodySilhouette3D).
  }

  function confirmPlacement() {
    if (flow.kind !== "confirming") return;
    // Snapshot the fragrance meta (incl. image URL) so the marker/list/banner
    // keep rendering proper data even for external Fragrantica candidates
    // that aren't in the local shop_stock catalog.
    const meta: BodyPlacement["fragranceMeta"] = {
      name: flow.fragrance.name,
      brand: flow.fragrance.brand,
      imageUrl: flow.fragrance.imageUrl,
    };
    layerOnBody(flow.zone, flow.fragrance.key, flow.position, meta);
    setFlow({ kind: "idle" });
  }

  /** Called by SearchSheet / ScanSheet when the user picks a fragrance from
   *  the local catalog. */
  function onFragranceChosen(fragrance: Fragrance) {
    setFlow({ kind: "placing", fragrance });
  }

  /** Called when the user picks a Fragrantica candidate from the inline
   *  autocomplete. We synthesize a Fragrance object so the rest of the flow
   *  (placing → confirming → marker) is unchanged. */
  function onCandidatePicked(c: SearchCandidate) {
    const synthetic: Fragrance = {
      key: fragranceKey(c.brand, c.name),
      id: fragranceKey(c.brand, c.name),
      name: c.name,
      brand: c.brand,
      imageUrl: c.image_url ?? null,
      reference: `FR-${fragranceKey(c.brand, c.name).slice(0, 6).toUpperCase()}`,
      availability: [],
      bestPrice: null,
      tags: c.notes_brief ? [c.notes_brief] : [],
      family: c.family,
    };
    setFlow({ kind: "placing", fragrance: synthetic });
  }

  function cancelFlow() {
    setFlow({ kind: "idle" });
    setEditingFragranceId(null);
    setSelectedZone(null);
    setSelectedPosition(null);
  }

  function startMove(fragranceId: string) {
    setEditingFragranceId(fragranceId);
    setFlow({ kind: "idle" });
    setSelectedZone(null);
  }

  return (
    <div className="px-6 pt-4 pb-12">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-outline block mb-2">
            Balade libre
          </span>
          <h1 className="text-3xl font-bold tracking-tighter leading-none">
            Carte du corps
          </h1>
        </div>
        <Link
          href="/balade/end"
          className="text-[10px] uppercase tracking-widest font-bold border-b border-primary pb-0.5"
        >
          Terminer
        </Link>
      </header>

      {/* Conditional view: question screen by default, mannequin only when
          something is in progress (placing/confirming/editing). */}
      {flow.kind === "placing" ||
      flow.kind === "confirming" ||
      editingFragranceId ? (
        <>
          <p className="text-xs text-on-surface-variant mb-4">
            {editingFragranceId
              ? "Touche un nouveau point sur le corps pour déplacer la pose."
              : flow.kind === "placing"
                ? `Où as-tu mis ${flow.fragrance.name} ? Touche le corps pour positionner.`
                : flow.kind === "confirming"
                  ? `Re-touche pour ajuster, ou confirme la pose en bas.`
                  : null}
          </p>
          <section className="bg-surface-container-low border border-primary py-6 mb-8 transition-colors">
            <BodySilhouette
              filledMarkers={filledMarkers}
              highlightedZone={selectedZone}
              onBodyClick={handleBodyClick}
              placementMode
            />
          </section>
        </>
      ) : (
        <QuestionScreen
          step={placements.length + 1}
          onScan={() => setFlow({ kind: "scanning" })}
          onCandidatePicked={onCandidatePicked}
        />
      )}

      <section className="mb-8">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3">
          Poses ({placements.length})
        </h2>
        {placements.length === 0 ? (
          <p className="text-xs text-outline italic">
            Aucune pose pour le moment.
          </p>
        ) : (
          <ul className="border-t border-outline-variant/40">
            {placements.map((p) => {
              // Try local catalog first; fall back to placement.fragranceMeta
              // for external Fragrantica picks not in the shop_stock catalog.
              const catalogFrag = fragrances.find(
                (x) => x.key === p.fragranceId,
              );
              const display = catalogFrag
                ? {
                    key: catalogFrag.key,
                    name: catalogFrag.name,
                    brand: catalogFrag.brand,
                    imageUrl: catalogFrag.imageUrl,
                    isExternal: false,
                  }
                : p.fragranceMeta
                  ? {
                      key: p.fragranceId,
                      name: p.fragranceMeta.name,
                      brand: p.fragranceMeta.brand,
                      imageUrl: p.fragranceMeta.imageUrl ?? null,
                      isExternal: true,
                    }
                  : null;
              if (!display) return null;
              const isEditing = editingFragranceId === display.key;
              const layerCount = placements.filter(
                (q) => q.zone === p.zone,
              ).length;
              return (
                <li
                  key={`${p.zone}::${p.fragranceId}`}
                  className={clsx(
                    "py-4 border-b border-outline-variant/40",
                    isEditing && "bg-surface-container-low",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <PlacementThumbnail
                        imageUrl={display.imageUrl}
                        name={display.name}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {display.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-outline">
                          {display.brand} · {BODY_ZONE_LABELS[p.zone]}
                          {layerCount > 1 && (
                            <span className="ml-2 text-primary">
                              · LAYER {layerCount}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startMove(display.key)}
                        className={clsx(
                          "p-2 hover:text-primary transition-colors",
                          isEditing && "text-primary",
                        )}
                        aria-label="Déplacer"
                      >
                        <Icon name="open_with" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlacementAt(p.zone, p.fragranceId)}
                        className="p-2 hover:text-error transition-colors"
                        aria-label="Supprimer cette pose"
                      >
                        <Icon name="delete_outline" size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Floating banner — three variants depending on flow. The thumbnail
          image identifies the fragrance at a glance instead of an abstract
          color tag. */}
      {flow.kind === "placing" && (
        <ActionBanner
          label="Touche le corps pour positionner"
          fragranceName={flow.fragrance.name}
          fragranceImage={flow.fragrance.imageUrl}
          onCancel={cancelFlow}
        />
      )}
      {flow.kind === "confirming" && (
        <ActionBanner
          label="Confirmer la pose ici ?"
          fragranceName={flow.fragrance.name}
          fragranceImage={flow.fragrance.imageUrl}
          onCancel={cancelFlow}
          confirmLabel="Confirmer"
          onConfirm={confirmPlacement}
        />
      )}
      {editingFragranceId && flow.kind === "idle" && (() => {
        const f = fragrances.find((f) => f.key === editingFragranceId);
        const meta = placements.find(
          (p) => p.fragranceId === editingFragranceId,
        )?.fragranceMeta;
        return (
          <ActionBanner
            label="Déplace vers un nouveau point"
            fragranceName={f?.name ?? meta?.name ?? ""}
            fragranceImage={f?.imageUrl ?? meta?.imageUrl ?? null}
            onCancel={cancelFlow}
          />
        );
      })()}

      {/* SearchSheet removed — search is now an inline autocomplete in
          QuestionScreen, hitting the AI agent (Fragrantica web_search).
          Only Scan still needs a fullscreen sheet (camera). */}
      {flow.kind === "scanning" && (
        <ScanSheet
          fragrances={fragrances}
          onPick={onFragranceChosen}
          onClose={cancelFlow}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * PlacementThumbnail — square image with initials fallback when load fails.
 * --------------------------------------------------------------------- */

function PlacementThumbnail({
  imageUrl,
  name,
  size = "md",
}: {
  imageUrl: string | null | undefined;
  name: string;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "w-7 h-7 text-[9px]" : "w-10 h-10 text-[10px]";

  if (!imageUrl || failed) {
    return (
      <span
        className={clsx(
          "flex items-center justify-center font-bold font-mono bg-surface-container-high text-on-surface-variant border border-outline-variant flex-shrink-0",
          dim,
        )}
        aria-hidden
      >
        {fragranceInitials(name)}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "block bg-surface-container-low overflow-hidden flex-shrink-0",
        dim,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------
 * QuestionScreen — the default view between placements.
 *
 * Asks "Qu'est-ce que tu as senti ?" with two big CTAs (Scanner / Rechercher).
 * Replaces the mannequin while idle: once the user has identified a perfume,
 * the page swaps to the mannequin view so they can pick the body zone.
 * After commit, we come back here for the next perfume.
 * --------------------------------------------------------------------- */

function QuestionScreen({
  step,
  onScan,
  onCandidatePicked,
}: {
  step: number;
  onScan: () => void;
  /** Called when the user picks a fragrance from the autocomplete dropdown. */
  onCandidatePicked: (candidate: SearchCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search: 800ms after the last keystroke, hit /api/agent.
  // Minimum 3 chars before firing — keeps the rate-limit-tight Anthropic
  // budget healthy. Same query within 5 min comes from the client cache.
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (q.length < 3) {
      setCandidates([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const results = await agentSearch(q, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setCandidates(results);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!ctrl.signal.aborted) {
          setError(e instanceof Error ? e.message : "Erreur inconnue");
          setLoading(false);
        }
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <section className="bg-surface-container-low border border-outline-variant px-5 py-8 mb-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-outline mb-3 text-center">
        Étape {String(step).padStart(2, "0")} · Identification
      </p>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tighter leading-[1.05] mb-5 text-center">
        Qu&apos;est-ce que
        <br />
        <span className="italic font-serif font-light">tu as senti ?</span>
      </h2>

      {/* Inline autocomplete — no modal. Hits the AI agent (Fragrantica
          web_search) with 600ms debounce. */}
      <div className="relative mb-3">
        <div className="flex items-center gap-2 border-b-2 border-primary pb-2">
          <Icon name="search" size={16} className="text-outline" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tape un nom (ex: Aventus, Vetiver)…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-outline/60"
            autoComplete="off"
          />
          {loading && (
            <Icon name="progress_activity" size={14} className="text-outline animate-spin" />
          )}
        </div>

        {/* Dropdown */}
        {(candidates.length > 0 || error || (query.length >= 3 && !loading)) && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-outline-variant shadow-2xl z-20 max-h-64 overflow-y-auto">
            {error && (
              <p className="px-4 py-3 text-xs text-error">{error}</p>
            )}
            {!error && candidates.length === 0 && !loading && (
              <p className="px-4 py-3 text-xs text-outline italic">
                Aucun résultat sur Fragrantica pour « {query} ».
              </p>
            )}
            {candidates.map((c, i) => (
              <button
                key={`${c.brand}-${c.name}-${i}`}
                type="button"
                onClick={() => {
                  setQuery("");
                  setCandidates([]);
                  onCandidatePicked(c);
                }}
                className="w-full text-left px-3 py-2 hover:bg-surface-container-low border-b border-outline-variant/30 last:border-0 flex items-center gap-3"
              >
                <PlacementThumbnail
                  imageUrl={c.image_url}
                  name={c.name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-outline">
                    {c.brand}
                  </p>
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.notes_brief && (
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                      {c.notes_brief}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-outline-variant/40" />
        <span className="text-[9px] uppercase tracking-widest text-outline">
          ou
        </span>
        <div className="flex-1 h-px bg-outline-variant/40" />
      </div>

      <button
        type="button"
        onClick={onScan}
        className="w-full py-3 bg-primary text-on-primary rounded-full text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Icon name="qr_code_scanner" size={16} />
        Scanner un flacon
      </button>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * ActionBanner — pinned at the bottom while the user has a pending action
 * (place a new perfume OR move an existing one). Tells them what to do +
 * cancel.
 * --------------------------------------------------------------------- */

function ActionBanner({
  label,
  fragranceName,
  fragranceImage,
  onCancel,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  fragranceName: string;
  /** Bottle image — shown as a 12×12 thumbnail at the left of the banner. */
  fragranceImage?: string | null;
  onCancel: () => void;
  /** When provided, render a primary confirm button on the right. */
  confirmLabel?: string;
  onConfirm?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const hasConfirm = Boolean(confirmLabel && onConfirm);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-24 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={clsx(
          "pointer-events-auto bg-primary text-on-primary shadow-2xl flex items-stretch max-w-md w-full transition-all duration-300",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        {fragranceImage && (
          <div className="w-12 h-auto flex-shrink-0 bg-on-primary/10 overflow-hidden">
            <img
              src={fragranceImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">
              {label}
            </p>
            <p className="text-sm font-semibold tracking-tight truncate">
              {fragranceName}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuler"
            className="opacity-70 hover:opacity-100 active:scale-95 transition-all flex-shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {hasConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className="bg-on-primary text-primary px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-bold active:scale-95 transition-transform flex items-center gap-1.5 flex-shrink-0"
          >
            <Icon name="check" size={14} />
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------
 * SearchSheet + ScanSheet — bottom sheets for the perfume identification
 * step. Header just shows the action title (no zone yet — placement comes
 * AFTER picking the fragrance).
 * --------------------------------------------------------------------- */

function PickerSheet({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-primary/10 transition-opacity duration-300"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={clsx(
          "relative w-full max-w-screen-md bg-background border-t border-outline-variant max-h-[38vh] flex flex-col safe-bottom shadow-2xl transition-transform duration-300 ease-out",
          mounted ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-1.5 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between gap-3 border-b border-outline-variant/40">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
            <Icon name={icon} size={12} />
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-outline hover:text-on-background flex-shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

function ScanSheet({
  fragrances,
  onPick,
  onClose,
}: {
  fragrances: Fragrance[];
  onPick: (f: Fragrance) => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      title="Scanner un parfum"
      icon="qr_code_scanner"
      onClose={onClose}
    >
      <ScanPanel fragrances={fragrances} onPick={onPick} />
    </PickerSheet>
  );
}

/* ---- Scan panel — inline camera + mock recognition ------------------- */

function ScanPanel({
  fragrances,
  onPick,
}: {
  fragrances: Fragrance[];
  onPick: (f: Fragrance) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<"idle" | "live" | "scanning" | "result">(
    "idle",
  );
  const [result, setResult] = useState<Fragrance | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }
  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError(null);
    if (fragrances.length === 0) {
      setError("Aucun parfum dans le catalogue à reconnaître.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage("live");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Caméra indisponible : ${e.message}`
          : "Caméra indisponible",
      );
      setStage("idle");
    }
  }

  function captureAndIdentify() {
    if (fragrances.length === 0) return;
    setStage("scanning");
    setTimeout(() => {
      const pick =
        fragrances[Math.floor(Math.random() * fragrances.length)];
      stopCamera();
      setResult(pick);
      setStage("result");
    }, 1200);
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto">
      {stage === "idle" && (
        <div className="flex flex-col items-center justify-center text-center gap-4 py-6">
          <Icon
            name="qr_code_scanner"
            size={36}
            className="text-on-surface-variant"
          />
          <p className="text-xs text-on-surface-variant max-w-xs">
            Pointe sur un flacon. La reconnaissance s&apos;active à la capture.
          </p>
          {error && (
            <p className="text-[11px] text-error border border-error/40 px-3 py-2 max-w-xs">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={startCamera}
            className="px-6 py-3 bg-primary text-on-primary rounded-full text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-transform flex items-center gap-2"
          >
            <Icon name="photo_camera" size={14} />
            Ouvrir la caméra
          </button>
        </div>
      )}

      {(stage === "live" || stage === "scanning") && (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video bg-on-background overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-2/3 aspect-square border border-on-primary/80" />
            </div>
            {stage === "scanning" && (
              <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-on-primary rounded-full animate-pulse" />
                  <span
                    className="w-2 h-2 bg-on-primary rounded-full animate-pulse"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-on-primary rounded-full animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-widest font-mono bg-background/80 px-2 py-1 border border-outline-variant">
              {stage === "scanning" ? "ANALYSE…" : "CADRE"}
            </span>
          </div>
          <button
            type="button"
            onClick={captureAndIdentify}
            disabled={stage === "scanning"}
            className="w-full py-3 bg-primary text-on-primary rounded-full text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon name="center_focus_strong" size={14} />
            {stage === "scanning" ? "Analyse en cours" : "Capturer"}
          </button>
        </div>
      )}

      {stage === "result" && result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 border border-outline-variant p-3">
            <div className="w-12 h-16 bg-surface-container-low overflow-hidden flex-shrink-0">
              {result.imageUrl && (
                <img
                  src={result.imageUrl}
                  alt=""
                  className="w-full h-full object-cover grayscale"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.15em] text-outline">
                {result.brand}
              </p>
              <p className="text-sm font-medium truncate">{result.name}</p>
              <p className="text-[10px] uppercase tracking-widest text-primary mt-0.5">
                Match 96%
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setStage("idle");
              }}
              className="flex-1 py-3 border border-outline-variant rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-primary transition-colors"
            >
              Re-scanner
            </button>
            <button
              type="button"
              onClick={() => onPick(result)}
              className="flex-1 py-3 bg-primary text-on-primary rounded-full text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-transform"
            >
              Poser ici
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
