// src/app/login/login-flow.tsx
// Flux de connexion en 2 étapes (email → code à 6 chiffres) façon écran de
// connexion iPhone, puis animation de succès (voir plug-animation.tsx)
// avant la redirection. L'authentification passe par Firebase : le code à
// 6 chiffres est le mot de passe du compte Firebase Authentication — un
// signInWithEmailAndPassword réussi EST la preuve que l'utilisateur existe
// dans la base d'authentification (pas de liste blanche séparée).
//
// Une seule étape est montée à la fois (rendu conditionnel, jamais les deux
// côte à côte) : ça élimine tout risque de chevauchement ou de largeur qui
// déborde, l'entrée/sortie anime juste le panneau monté (animate-step-in-*,
// voir globals.css). Le code à 6 chiffres est saisi via un vrai <input>
// numérique (clavier natif du téléphone), superposé en transparence sur 6
// cases visuelles — pas de pavé numérique maison.

"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { authClient } from "@/lib/firebase/client";
import { PlugAnimation } from "./plug-animation";

type Etape = "email" | "code";
type Direction = "avant" | "arriere";

const LONGUEUR_CODE = 6;
const NOMBRE_ETAPES = 2;

// Styles partagés entre les deux étapes — un seul endroit à faire évoluer
// pour garder champs et boutons identiques.
const CHAMP =
  "w-full rounded-2xl border border-border-strong bg-surface px-4 py-3.5 text-center text-base text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";
const BOUTON_PRIMAIRE =
  "w-full rounded-2xl bg-brand px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm shadow-brand/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";

export function LoginFlow() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("email");
  const [direction, setDirection] = useState<Direction>("avant");
  const [connecte, setConnecte] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [secoue, setSecoue] = useState(false);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function allerAuCode(e: FormEvent) {
    e.preventDefault();
    if (!emailValide) return;
    setErreur(null);
    setDirection("avant");
    setEtape("code");
  }

  function revenirAlEmail() {
    setDirection("arriere");
    setEtape("email");
    setCode("");
    setErreur(null);
  }

  const tenterConnexion = useCallback(
    async (codeSaisi: string) => {
      setEnCours(true);
      setErreur(null);
      try {
        const identifiants = await signInWithEmailAndPassword(authClient, email.trim(), codeSaisi);
        const idToken = await identifiants.user.getIdToken();

        const reponse = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!reponse.ok) throw new Error("session");

        setConnecte(true);
        window.setTimeout(() => {
          router.push("/routeurs");
          router.refresh();
        }, 2200);
      } catch (err) {
        setErreur(messageErreur(err));
        setCode("");
        setSecoue(true);
        window.setTimeout(() => setSecoue(false), 420);
      } finally {
        setEnCours(false);
      }
    },
    [email, router],
  );

  useEffect(() => {
    if (code.length === LONGUEUR_CODE && !enCours && !connecte) {
      tenterConnexion(code);
    }
  }, [code, enCours, connecte, tenterConnexion]);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-bg sm:px-6 sm:py-10">
      <FondAnime />

      <div className="relative flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overflow-y-auto bg-surface/95 shadow-xl backdrop-blur-xl sm:min-h-[600px] sm:max-w-[380px] sm:rounded-[32px] sm:border sm:border-border/70">
        {connecte ? (
          <PlugAnimation />
        ) : (
          <>
            <Entete etape={etape} />

            <div
              key={etape}
              className={`flex flex-1 flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2 ${
                direction === "avant" ? "animate-step-in-avant" : "animate-step-in-arriere"
              }`}
            >
              {etape === "email" ? (
                <SlideEmail email={email} setEmail={setEmail} onSuivant={allerAuCode} valide={emailValide} />
              ) : (
                <SlideCode
                  email={email}
                  code={code}
                  setCode={setCode}
                  erreur={erreur}
                  secoue={secoue}
                  enCours={enCours}
                  onRetour={revenirAlEmail}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function messageErreur(err: unknown): string {
  const code = (err as { code?: string } | undefined)?.code;
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-email":
      return "Email ou code incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives — réessayez dans quelques minutes.";
    default:
      return "Connexion impossible pour le moment.";
  }
}

function Entete({ etape }: { etape: Etape }) {
  const numero = etape === "email" ? 1 : 2;
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-[max(2.75rem,calc(env(safe-area-inset-top)+1.5rem))] sm:pt-10">
      <Image
        src="/logo.png"
        alt="Ndiaye Mikrotik"
        width={76}
        height={76}
        className="rounded-full shadow-md"
        priority
      />
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-strong">
          Étape {numero} sur {NOMBRE_ETAPES}
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: NOMBRE_ETAPES }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === numero - 1 ? "w-6 bg-brand" : "w-1.5 bg-border-strong"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideEmail({
  email,
  setEmail,
  onSuivant,
  valide,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSuivant: (e: FormEvent) => void;
  valide: boolean;
}) {
  return (
    <form onSubmit={onSuivant} className="flex flex-1 flex-col justify-between gap-8 pt-6">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Bienvenue</h1>
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Connectez-vous avec votre email pour accéder au parc.
          </p>
        </div>

        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={CHAMP}
        />
      </div>

      <button type="submit" disabled={!valide} className={BOUTON_PRIMAIRE}>
        Continuer
      </button>
    </form>
  );
}

function SlideCode({
  email,
  code,
  setCode,
  erreur,
  secoue,
  enCours,
  onRetour,
}: {
  email: string;
  code: string;
  setCode: (c: string) => void;
  erreur: string | null;
  secoue: boolean;
  enCours: boolean;
  onRetour: () => void;
}) {
  const champRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    champRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-between gap-8 pt-6">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <button
            type="button"
            onClick={onRetour}
            className="mx-auto flex items-center gap-1 text-xs font-medium text-ink-faint transition-colors hover:text-ink-muted"
          >
            <IconeChevronGauche className="h-3 w-3" />
            {email}
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Code d&apos;accès</h1>
          <p className="text-[15px] text-ink-muted">Entrez votre code à 6 chiffres.</p>
        </div>

        {/* Cases visuelles décoratives + vrai champ numérique transparent
            superposé : ouvre le clavier natif du téléphone (aucun pavé
            maison), tout en gardant l'esthétique "cases" attendue. */}
        <div className="relative mx-auto w-full max-w-[300px]">
          <div className={`flex justify-between gap-2 ${secoue ? "animate-shake" : ""}`} aria-hidden="true">
            {Array.from({ length: LONGUEUR_CODE }).map((_, i) => (
              <div
                key={i}
                className={`flex h-14 flex-1 items-center justify-center rounded-2xl border-2 font-mono text-xl font-semibold text-ink transition-colors ${
                  erreur ? "border-critical" : i === code.length ? "border-brand" : "border-border-strong"
                }`}
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          <input
            ref={champRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={LONGUEUR_CODE}
            value={code}
            disabled={enCours}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, LONGUEUR_CODE))}
            aria-label="Code d'accès à 6 chiffres"
            className="absolute inset-0 h-full w-full border-0 bg-transparent text-center text-base text-transparent caret-transparent opacity-0"
          />
        </div>

        <p className="h-4 text-center text-xs font-medium text-critical">{erreur}</p>
      </div>

      <p className="h-4 text-center text-xs text-ink-faint">{enCours ? "Vérification…" : ""}</p>
    </div>
  );
}

function FondAnime() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="animate-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div
        className="animate-blob absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-signal/10 blur-3xl"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="animate-blob absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-brand-strong/10 blur-3xl"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
}

function IconeChevronGauche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
