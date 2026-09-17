// src/app/login/login-flow.tsx
// Flux de connexion en 2 slides (email → code à 6 chiffres) façon écran de
// verrouillage iPhone, puis animation de succès (voir plug-animation.tsx)
// avant la redirection. L'authentification passe par Firebase : le code à
// 6 chiffres est le mot de passe du compte Firebase Authentication — un
// signInWithEmailAndPassword réussi EST la preuve que l'utilisateur existe
// dans la base d'authentification (pas de liste blanche séparée).

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { authClient } from "@/lib/firebase/client";
import { PlugAnimation } from "./plug-animation";

type Etape = "email" | "code";

const LONGUEUR_CODE = 6;

export function LoginFlow() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("email");
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
    setEtape("code");
  }

  function revenirAlEmail() {
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

  useEffect(() => {
    if (etape !== "code" || connecte) return;
    function surTouche(e: KeyboardEvent) {
      if (enCours) return;
      if (/^[0-9]$/.test(e.key)) {
        setCode((c) => (c.length < LONGUEUR_CODE ? c + e.key : c));
      } else if (e.key === "Backspace") {
        setCode((c) => c.slice(0, -1));
      }
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [etape, enCours, connecte]);

  function saisirChiffre(chiffre: string) {
    if (enCours) return;
    setCode((c) => (c.length < LONGUEUR_CODE ? c + chiffre : c));
  }

  function effacer() {
    if (enCours) return;
    setCode((c) => c.slice(0, -1));
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-bg sm:px-6">
      <FondAnime />

      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-surface/90 shadow-xl backdrop-blur-xl sm:min-h-0 sm:max-w-[420px] sm:rounded-[32px] sm:border sm:border-border/70">
        {connecte ? (
          <PlugAnimation />
        ) : (
          <>
            <Entete etape={etape} />

            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ transform: etape === "code" ? "translateX(-50%)" : "translateX(0%)" }}
              >
                <div className="w-full shrink-0 px-7 pb-10 pt-2">
                  <SlideEmail email={email} setEmail={setEmail} onSuivant={allerAuCode} valide={emailValide} />
                </div>
                <div className="w-full shrink-0 px-7 pb-10 pt-2">
                  <SlideCode
                    email={email}
                    code={code}
                    erreur={erreur}
                    secoue={secoue}
                    enCours={enCours}
                    onChiffre={saisirChiffre}
                    onEffacer={effacer}
                    onRetour={revenirAlEmail}
                  />
                </div>
              </div>
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
  return (
    <div className="flex flex-col items-center gap-3 px-7 pt-10 sm:pt-9">
      <Image src="/logo.png" alt="" width={56} height={56} className="rounded-full shadow-sm" priority />
      <div className="flex gap-1.5" aria-hidden="true">
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            etape === "email" ? "w-5 bg-brand" : "w-1.5 bg-border-strong"
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            etape === "code" ? "w-5 bg-brand" : "w-1.5 bg-border-strong"
          }`}
        />
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
    <form onSubmit={onSuivant} className="flex flex-col gap-6 pt-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Bienvenue</h1>
        <p className="text-sm text-ink-muted">Connectez-vous avec votre email pour accéder au parc.</p>
      </div>

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        placeholder="vous@exemple.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-2xl border border-border-strong bg-surface px-4 py-3.5 text-center text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
      />

      <button
        type="submit"
        disabled={!valide}
        className="w-full rounded-2xl bg-brand px-4 py-3.5 text-[15px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40"
      >
        Continuer
      </button>
    </form>
  );
}

function SlideCode({
  email,
  code,
  erreur,
  secoue,
  enCours,
  onChiffre,
  onEffacer,
  onRetour,
}: {
  email: string;
  code: string;
  erreur: string | null;
  secoue: boolean;
  enCours: boolean;
  onChiffre: (c: string) => void;
  onEffacer: () => void;
  onRetour: () => void;
}) {
  return (
    <div className="flex flex-col gap-7 pt-6">
      <div className="space-y-1.5 text-center">
        <button
          type="button"
          onClick={onRetour}
          className="mx-auto flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-ink-muted"
        >
          <IconeChevronGauche className="h-3 w-3" />
          {email}
        </button>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Code d&apos;accès</h1>
        <p className="text-sm text-ink-muted">Entrez votre code à 6 chiffres.</p>
      </div>

      <div className={`flex justify-center gap-3 ${secoue ? "animate-shake" : ""}`} aria-hidden="true">
        {Array.from({ length: LONGUEUR_CODE }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              i < code.length ? "scale-110 border-brand bg-brand" : "border-border-strong bg-transparent"
            }`}
          />
        ))}
      </div>

      <p className="h-4 text-center text-xs text-critical">{erreur}</p>

      <Clavier onChiffre={onChiffre} onEffacer={onEffacer} desactive={enCours} />

      <p className="h-4 text-center text-xs text-ink-faint">{enCours ? "Vérification…" : ""}</p>
    </div>
  );
}

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "effacer"];

function Clavier({
  onChiffre,
  onEffacer,
  desactive,
}: {
  onChiffre: (c: string) => void;
  onEffacer: () => void;
  desactive: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 px-2">
      {TOUCHES.map((touche, i) => {
        if (touche === "") return <div key={i} />;

        if (touche === "effacer") {
          return (
            <button
              key={i}
              type="button"
              onClick={onEffacer}
              disabled={desactive}
              aria-label="Effacer"
              className="flex h-14 items-center justify-center text-ink-muted transition-transform active:scale-90 disabled:opacity-30"
            >
              <IconeEffacer className="h-5 w-5" />
            </button>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onChiffre(touche)}
            disabled={desactive}
            className="flex h-14 items-center justify-center rounded-full bg-surface-raised font-display text-xl font-medium text-ink transition-transform active:scale-90 active:bg-brand/10 disabled:opacity-30"
          >
            {touche}
          </button>
        );
      })}
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

function IconeEffacer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 4h8A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-8L3 10l4.5-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 8l4 4M13 8l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
