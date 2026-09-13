// src/app/tickets/nouveau/actions.ts

"use server";

import { redirect } from "next/navigation";
import { utilisateurConnecte, exigerAccesClient } from "@/lib/permissions/permissions";
import { creerTicket } from "@/services/ticket.service";
import type { CategorieTicket } from "@prisma/client";

export async function creerTicketAction(formData: FormData) {
  const utilisateur = await utilisateurConnecte();

  const clientId =
    utilisateur.role === "CLIENT" ? utilisateur.clientId! : String(formData.get("clientId"));
  await exigerAccesClient(clientId);

  const ticket = await creerTicket({
    clientId,
    sujet: String(formData.get("sujet")),
    description: (formData.get("description") as string) || undefined,
    categorie: formData.get("categorie") as CategorieTicket,
    routeurId: (formData.get("routeurId") as string) || undefined,
  });

  redirect(`/tickets/${ticket.id}`);
}
