"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useFragrances } from "@/lib/data";
import {
  BUDGET_VULGAR,
  FAMILY_VULGAR,
  INTENSITY_VULGAR,
  MOMENT_VULGAR,
  OCCASION_VULGAR,
  readProfileFromUser,
} from "@/lib/profile";

export default function ProfilePage() {
  const router = useRouter();
  const { wishlist, history } = useStore();
  const { user, loading: authLoading, signOut } = useAuth();
  const fragrances = useFragrances();
  const [signingOut, setSigningOut] = useState(false);

  const profile = readProfileFromUser(user);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  }

  const collections = wishlist
    .map((w) => fragrances.find((f) => f.key === w.fragranceId))
    .filter((x): x is (typeof fragrances)[number] => Boolean(x));

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="pb-16">

      {/* ── Identity hero ─────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0">
        {authLoading ? (
          <div className="flex gap-5 mb-8">
            <div className="w-20 h-20 bg-surface-container animate-pulse shrink-0" />
            <div className="flex-1 pt-2 space-y-2">
              <div className="h-2 w-16 bg-surface-container animate-pulse" />
              <div className="h-3 w-40 bg-surface-container animate-pulse" />
              <div className="h-2 w-24 bg-surface-container animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-start gap-5 mb-8">
            {/* Monogramme */}
            <div className="w-20 h-20 bg-primary text-on-primary flex items-center justify-center shrink-0 select-none">
              <span className="text-3xl font-bold tracking-tighter leading-none">
                {initial}
              </span>
            </div>

            <div className="flex-1 min-w-0 pt-1.5">
              <p className="text-[9px] uppercase tracking-[0.35em] text-outline mb-1.5">
                Profil
              </p>
              <p className="text-sm font-semibold leading-tight truncate">
                {user.email}
              </p>
              {memberSince && (
                <p className="text-[10px] text-outline mt-1.5 font-mono">
                  Membre depuis {memberSince}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="text-[9px] uppercase tracking-widest text-outline hover:text-error transition-colors pt-2 flex items-center gap-1 disabled:opacity-40 shrink-0"
            >
              <Icon name="logout" size={12} />
              {signingOut ? "…" : "Déco"}
            </button>
          </div>
        ) : (
          /* Non connecté */
          <div className="mb-8">
            <div className="w-20 h-20 border-2 border-dashed border-outline-variant flex items-center justify-center mb-5 text-outline">
              <Icon name="person" size={28} />
            </div>
            <p className="text-[9px] uppercase tracking-[0.35em] text-outline mb-2">
              Non connecté
            </p>
            <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed mb-5">
              Connecte-toi pour synchroniser ta wishlist, tes balades et ton ADN
              olfactif.
            </p>
            <Link
              href="/login?redirect=/profile"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-transform"
            >
              <Icon name="login" size={14} />
              Connexion
            </Link>
          </div>
        )}
      </div>

      {/* ── Stats strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px bg-outline-variant/50 border-y border-outline-variant/50">
        {[
          { value: wishlist.length, label: "Wishlist", href: "/wishlist" },
          { value: history.length, label: "Balades", href: null },
          {
            value: profile?.preferred_families.length ?? 0,
            label: "Familles",
            href: null,
          },
        ].map(({ value, label, href }) => {
          const inner = (
            <div className="bg-background py-7 text-center">
              <p className="text-[2.8rem] leading-none font-bold tracking-tighter font-mono">
                {value}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-outline mt-2">
                {label}
              </p>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>
              {inner}
            </Link>
          ) : (
            <div key={label}>{inner}</div>
          );
        })}
      </div>

      {/* ── ADN Olfactif ──────────────────────────────────────────── */}
      <section className="px-6 pt-10 pb-10 border-b border-outline-variant/50">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-outline mb-2">
              Signature
            </p>
            <h2 className="text-3xl font-light tracking-tight leading-tight">
              ADN{" "}
              <span className="italic font-serif">olfactif</span>
            </h2>
          </div>
          {profile && (
            <Link
              href="/onboarding"
              className="text-[9px] uppercase tracking-widest text-outline border-b border-outline/30 pb-px hover:text-on-background transition-colors"
            >
              Modifier
            </Link>
          )}
        </div>

        {profile ? (
          <div className="space-y-8">

            {/* Familles — lignes avec trait */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-outline mb-4">
                Univers olfactifs
              </p>
              <div className="space-y-4">
                {profile.preferred_families.map((f) => {
                  const data = FAMILY_VULGAR[f];
                  return (
                    <div key={f} className="flex items-center gap-4">
                      <span className="text-xl w-8 text-center shrink-0">
                        {data.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {data.title}
                        </p>
                        <p className="text-[10px] text-outline leading-tight">
                          {data.subtitle}
                        </p>
                      </div>
                      <div className="w-12 h-px bg-primary shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Intensité + Budget */}
            <div className="flex flex-wrap gap-2">
              <Tag>
                <span className="mr-1.5">
                  {INTENSITY_VULGAR[profile.intensity_preference].emoji}
                </span>
                {INTENSITY_VULGAR[profile.intensity_preference].title}
              </Tag>
              <Tag className="font-mono">
                {BUDGET_VULGAR[profile.budget].title}
              </Tag>
            </div>

            {/* Moments */}
            {profile.moments.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-outline mb-3">
                  Moments
                </p>
                <div className="flex flex-wrap gap-3">
                  {profile.moments.map((m) => (
                    <span
                      key={m}
                      className="flex items-center gap-1.5 text-xs text-on-surface-variant"
                    >
                      <span>{MOMENT_VULGAR[m].emoji}</span>
                      {MOMENT_VULGAR[m].title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Occasions */}
            {profile.occasions.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-outline mb-3">
                  Occasions
                </p>
                <div className="flex flex-wrap gap-3">
                  {profile.occasions.map((o) => (
                    <span
                      key={o}
                      className="flex items-center gap-1.5 text-xs text-on-surface-variant"
                    >
                      <span>{OCCASION_VULGAR[o].emoji}</span>
                      {OCCASION_VULGAR[o].title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Date de mise à jour */}
            <p className="text-[9px] font-mono uppercase tracking-widest text-outline/60">
              Mis à jour le{" "}
              {new Date(profile.completed_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        ) : user ? (
          <div className="border border-dashed border-outline-variant p-10 flex flex-col items-center text-center gap-5">
            <div className="w-12 h-12 border border-outline-variant flex items-center justify-center text-outline">
              <Icon name="biotech" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                Aucun ADN olfactif défini
              </p>
              <p className="text-xs text-on-surface-variant max-w-xs">
                5 questions pour affiner tes recommandations.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 text-[10px] uppercase tracking-widest font-bold active:scale-95 transition-transform"
            >
              <Icon name="play_arrow" size={14} />
              Démarrer
            </Link>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            Connecte-toi pour définir ton ADN olfactif.
          </p>
        )}
      </section>

      {/* ── Collection ────────────────────────────────────────────── */}
      <section className="pt-10 pb-10 border-b border-outline-variant/50">
        <div className="flex items-end justify-between px-6 mb-6">
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-outline mb-2">
              Ma
            </p>
            <h2 className="text-3xl font-light tracking-tight leading-tight">
              Collection
            </h2>
          </div>
          {collections.length > 0 && (
            <Link
              href="/wishlist"
              className="text-[9px] uppercase tracking-widest text-outline border-b border-outline/30 pb-px hover:text-on-background transition-colors"
            >
              Voir tout
            </Link>
          )}
        </div>

        {collections.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-1">
            {collections.slice(0, 8).map((f) => (
              <Link
                key={f.key}
                href={`/fragrance/${f.key}`}
                className="shrink-0 w-28 block group"
              >
                <div className="aspect-[2/3] bg-surface-container-low overflow-hidden mb-2">
                  {f.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={f.imageUrl}
                      alt={f.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <Icon name="water_drop" size={22} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-semibold truncate leading-tight">
                  {f.name}
                </p>
                <p className="text-[9px] text-outline truncate mt-0.5">
                  {f.brand}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6">
            <p className="text-sm text-on-surface-variant mb-4">
              Aucun parfum enregistré.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 border border-outline-variant px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:border-primary transition-colors"
            >
              <Icon name="search" size={14} />
              Explorer les parfums
            </Link>
          </div>
        )}
      </section>

      {/* ── Balades ───────────────────────────────────────────────── */}
      <section className="px-6 pt-10">
        <div className="mb-6">
          <p className="text-[9px] uppercase tracking-[0.4em] text-outline mb-2">
            Mes
          </p>
          <h2 className="text-3xl font-light tracking-tight leading-tight">
            Balades
          </h2>
        </div>

        {history.length > 0 ? (
          <div>
            {history.map((b, i) => (
              <div
                key={b.id}
                className={`py-5 flex items-start gap-5 ${
                  i < history.length - 1
                    ? "border-b border-outline-variant/30"
                    : ""
                }`}
              >
                {/* Date column */}
                <div className="w-12 shrink-0 pt-0.5">
                  <p className="text-[10px] font-mono text-outline leading-tight uppercase tracking-wider">
                    {new Date(b.finishedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight mb-1">
                    Balade{" "}
                    <span className="font-light">
                      {b.mode === "free" ? "libre" : "guidée"}
                    </span>
                  </p>
                  <p className="text-[10px] text-outline uppercase tracking-wider">
                    {b.tested.length} parfum{b.tested.length > 1 ? "s" : ""} ·{" "}
                    {b.placements.length} pose
                    {b.placements.length > 1 ? "s" : ""}
                  </p>
                </div>

                {/* Mode indicator */}
                <div className="shrink-0">
                  <Icon
                    name={b.mode === "free" ? "explore" : "route"}
                    size={16}
                    className="text-outline"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-outline-variant/50">
            <Icon
              name="directions_walk"
              size={28}
              className="text-outline mx-auto mb-3"
            />
            <p className="text-sm text-on-surface-variant mb-4">
              Aucune balade terminée.
            </p>
            <Link
              href="/balade"
              className="inline-flex items-center gap-2 border border-outline-variant px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:border-primary transition-colors"
            >
              <Icon name="add" size={14} />
              Commencer une balade
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function Tag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center border border-outline-variant px-3 py-2 text-[10px] uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  );
}
