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
import { useFragrances, type Fragrance } from "@/lib/data";
import { useStore } from "@/lib/store";

/** Delay (ms) before the picker sheet opens after a zone tap. Lets the 3D
 *  camera zoom + pulse animation play first. */
const PICKER_DELAY_MS = 450;

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
  /** Exact world-space point on the body where the user just clicked. Stored
   *  alongside selectedZone so the placement is "drawn" precisely there. */
  const [selectedPosition, setSelectedPosition] = useState<
    [number, number, number] | null
  >(null);
  /** Picker state machine:
   *  - "closed": nothing on screen
   *  - "choose": tiny floating bar with [Rechercher | Scanner]
   *  - "search": the search-the-catalog sheet
   *  - "scan":   the camera-scan sheet
   */
  const [pickerStep, setPickerStep] = useState<
    "closed" | "choose" | "search" | "scan"
  >("closed");
  const [editingFragranceId, setEditingFragranceId] = useState<string | null>(
    null,
  );
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pickerTimerRef.current) clearTimeout(pickerTimerRef.current);
    },
    [],
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

  function openChooserDelayed() {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
    pickerTimerRef.current = setTimeout(() => {
      setPickerStep("choose");
      pickerTimerRef.current = null;
    }, PICKER_DELAY_MS);
  }

  function handleBodyClick(
    zone: BodyZone,
    position: [number, number, number],
  ) {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }

    if (editingFragranceId) {
      // Moving an existing placement to the new point.
      movePlacement(editingFragranceId, zone, position);
      setEditingFragranceId(null);
      setSelectedZone(zone);
      setSelectedPosition(position);
      return;
    }

    // Every click = new placement. To remove an existing one, use the delete
    // button in the Poses list below.
    setSelectedZone(zone);
    setSelectedPosition(position);
    openChooserDelayed();
  }

  function assign(fragrance: Fragrance) {
    if (!selectedZone) return;
    layerOnBody(selectedZone, fragrance.key, selectedPosition ?? undefined);
    setPickerStep("closed");
    // Keep selectedZone / selectedPosition so the marker stays highlighted +
    // camera stays focused on the just-placed point.
  }

  function closePicker() {
    setPickerStep("closed");
    setSelectedZone(null);
    setSelectedPosition(null);
  }

  function startMove(fragranceId: string) {
    setEditingFragranceId(fragranceId);
    setPickerStep("closed");
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

      <p className="text-xs text-on-surface-variant mb-4">
        {editingFragranceId
          ? "Touche un nouveau point sur le corps pour déplacer la pose."
          : "Touche n'importe où sur le corps pour assigner un parfum."}
      </p>

      <section className="bg-surface-container-low border border-outline-variant py-6 mb-8">
        <BodySilhouette
          filledMarkers={filledMarkers}
          highlightedZone={selectedZone}
          onBodyClick={handleBodyClick}
        />
      </section>

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
              const f = fragrances.find((x) => x.key === p.fragranceId);
              if (!f) return null;
              const isEditing = editingFragranceId === f.key;
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
                      <span className="w-9 h-9 bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold font-mono">
                        {fragranceInitials(f.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-outline">
                          {BODY_ZONE_LABELS[p.zone]}
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
                        onClick={() => startMove(f.key)}
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

      <section className="flex flex-col gap-2">
        <Link
          href="/search"
          className="w-full py-3 border border-outline-variant rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-primary text-center transition-all flex items-center justify-center gap-2"
        >
          <Icon name="search" size={14} />
          Trouver via Search
        </Link>
        <Link
          href="/scan"
          className="w-full py-3 border border-outline-variant rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-primary text-center transition-all flex items-center justify-center gap-2"
        >
          <Icon name="qr_code_scanner" size={14} />
          Identifier via Scan
        </Link>
      </section>

      {pickerStep === "choose" && selectedZone && (
        <ZoneActionChooser
          zoneLabel={BODY_ZONE_LABELS[selectedZone]}
          onSearch={() => setPickerStep("search")}
          onScan={() => setPickerStep("scan")}
          onClose={closePicker}
        />
      )}
      {pickerStep === "search" && selectedZone && (
        <SearchSheet
          zoneLabel={BODY_ZONE_LABELS[selectedZone]}
          fragrances={fragrances}
          onPick={assign}
          onBack={() => setPickerStep("choose")}
          onClose={closePicker}
        />
      )}
      {pickerStep === "scan" && selectedZone && (
        <ScanSheet
          zoneLabel={BODY_ZONE_LABELS[selectedZone]}
          fragrances={fragrances}
          onPick={assign}
          onBack={() => setPickerStep("choose")}
          onClose={closePicker}
        />
      )}
    </div>
  );
}


/* -------------------------------------------------------------------------
 * ZoneActionChooser — tiny floating bar shown right after a body click.
 *
 * Just two actions (Rechercher / Scanner) + the zone label + a close button.
 * Sits at the bottom of the viewport, ~60px tall, doesn't cover the
 * mannequin. Once the user picks one, the corresponding sheet opens.
 * --------------------------------------------------------------------- */

function ZoneActionChooser({
  zoneLabel,
  onSearch,
  onScan,
  onClose,
}: {
  zoneLabel: string;
  onSearch: () => void;
  onScan: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
      aria-modal
      role="dialog"
    >
      <div
        className={clsx(
          "pointer-events-auto bg-background border border-outline-variant shadow-2xl flex items-stretch m-4 mb-6 safe-bottom transition-all duration-300",
          mounted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4",
        )}
      >
        <div className="px-4 py-2 flex flex-col justify-center min-w-0 max-w-[40vw]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-outline">
            Assigner à
          </p>
          <p className="text-xs font-semibold tracking-tight truncate">
            {zoneLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center gap-1.5 px-4 border-l border-outline-variant/40 hover:bg-surface-container-low active:bg-surface-container transition-colors"
        >
          <Icon name="search" size={14} />
          <span className="text-[10px] uppercase tracking-widest font-bold">
            Rechercher
          </span>
        </button>
        <button
          type="button"
          onClick={onScan}
          className="flex items-center gap-1.5 px-4 border-l border-outline-variant/40 hover:bg-surface-container-low active:bg-surface-container transition-colors"
        >
          <Icon name="qr_code_scanner" size={14} />
          <span className="text-[10px] uppercase tracking-widest font-bold">
            Scanner
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Annuler"
          className="px-3 border-l border-outline-variant/40 hover:bg-surface-container-low active:bg-surface-container transition-colors text-outline hover:text-on-background"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * SearchSheet + ScanSheet — full-purpose sheets opened from the chooser.
 *
 * Each wraps the existing inner panel (SearchPanel / ScanPanel) with a slide
 * animation, header (zone label + back button + close), and ~50vh max-height.
 * --------------------------------------------------------------------- */

function PickerSheet({
  zoneLabel,
  title,
  icon,
  onBack,
  onClose,
  children,
}: {
  zoneLabel: string;
  title: string;
  icon: string;
  onBack: () => void;
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
          "relative w-full max-w-screen-md bg-background border-t border-outline-variant max-h-[50vh] flex flex-col safe-bottom shadow-2xl transition-transform duration-300 ease-out",
          mounted ? "translate-y-0" : "translate-y-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>
        <div className="px-6 pt-2 pb-3 flex items-center justify-between gap-3 border-b border-outline-variant/40">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="text-outline hover:text-on-background flex-shrink-0"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-outline flex items-center justify-center gap-1.5">
              <Icon name={icon} size={11} />
              {title}
            </p>
            <p className="text-sm font-semibold tracking-tight truncate">
              {zoneLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-outline hover:text-on-background flex-shrink-0"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

function SearchSheet({
  zoneLabel,
  fragrances,
  onPick,
  onBack,
  onClose,
}: {
  zoneLabel: string;
  fragrances: Fragrance[];
  onPick: (f: Fragrance) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      zoneLabel={zoneLabel}
      title="Rechercher"
      icon="search"
      onBack={onBack}
      onClose={onClose}
    >
      <SearchPanel fragrances={fragrances} onPick={onPick} />
    </PickerSheet>
  );
}

function ScanSheet({
  zoneLabel,
  fragrances,
  onPick,
  onBack,
  onClose,
}: {
  zoneLabel: string;
  fragrances: Fragrance[];
  onPick: (f: Fragrance) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      zoneLabel={zoneLabel}
      title="Scanner"
      icon="qr_code_scanner"
      onBack={onBack}
      onClose={onClose}
    >
      <ScanPanel fragrances={fragrances} onPick={onPick} />
    </PickerSheet>
  );
}

/* ---- Search panel ---------------------------------------------------- */

function SearchPanel({
  fragrances,
  onPick,
}: {
  fragrances: Fragrance[];
  onPick: (f: Fragrance) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? fragrances.filter((f) =>
        (f.name + " " + f.brand + " " + (f.tags ?? []).join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : fragrances;

  return (
    <>
      <div className="px-6 py-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, marque, famille…"
          className="w-full bg-transparent border-b border-outline-variant py-2 text-sm focus:outline-none focus:border-primary"
          autoFocus
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-xs text-on-surface-variant text-center">
          Aucun parfum trouvé.
        </p>
      ) : (
        <ul className="overflow-y-auto flex-1">
          {filtered.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-surface-container-low text-left border-b border-outline-variant/30"
              >
                <div className="w-10 h-12 bg-surface-container-low overflow-hidden flex-shrink-0">
                  {f.imageUrl && (
                    <img
                      src={f.imageUrl}
                      alt=""
                      className="w-full h-full object-cover grayscale"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-outline">
                    {f.brand}
                  </p>
                  <p className="text-sm font-medium truncate">{f.name}</p>
                </div>
                <Icon name="add" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
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
