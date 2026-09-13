// src/app/tickets/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";

const STATUT_LABEL: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

export default async function PageTickets() {
  const utilisateur = await utilisateurConnecte();

  const where =
    utilisateur.role === "CLIENT"
      ? { clientId: utilisateur.clientId! }
      : utilisateur.role === "TECHNICIEN"
        ? { technicienId: utilisateur.id }
        : undefined;

  const tickets = await prisma.ticket.findMany({
    where,
    include: { client: { select: { nom: true } }, technicien: { select: { nom: true } } },
    orderBy: { creeLe: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Tickets</h1>
        <Link href="/tickets/nouveau" className="text-sm underline">
          Nouveau ticket
        </Link>
      </div>

      <div className="mt-4 divide-y divide-gray-200 border border-gray-200">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/tickets/${t.id}`}
            className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50"
          >
            <div>
              <div className="text-sm">{t.sujet}</div>
              <div className="text-xs text-gray-500">
                {t.numero} · {t.client.nom}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">{STATUT_LABEL[t.statut]}</div>
              <div className="text-xs text-gray-500">{t.technicien?.nom ?? "non assigné"}</div>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <p className="px-3 py-4 text-sm text-gray-500">Aucun ticket.</p>
        )}
      </div>
    </div>
  );
}
