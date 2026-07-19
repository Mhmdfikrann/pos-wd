/**
 * Kitchen Display data-access wrapper (Phase 6) bound to the app DB.
 *
 * `kitchen-data.ts` stays DB-parameterized for integration tests; this
 * server-only module is what app routes/actions import.
 */
import "server-only";
import { db } from "@/db";
import {
  listKitchenTickets as listKitchenTicketsCore,
  transitionKitchenTicket as transitionKitchenTicketCore,
  type KitchenTicketView,
  type ListKitchenTicketsInput,
  type TransitionKitchenTicketInput,
} from "@/lib/kitchen-data";

export type {
  KitchenTicketItem,
  KitchenTicketView,
  ListKitchenTicketsInput,
  TransitionKitchenTicketInput,
} from "@/lib/kitchen-data";

export type {
  KitchenStatus,
  KitchenBoardStatus,
  KitchenStation,
  KitchenStationFilter,
} from "@/lib/kitchen-core";

export function listKitchenTickets(input: ListKitchenTicketsInput): KitchenTicketView[] {
  return listKitchenTicketsCore(db, input);
}

export function transitionKitchenTicket(input: TransitionKitchenTicketInput): KitchenTicketView {
  return transitionKitchenTicketCore(db, input);
}
