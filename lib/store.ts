// OpenPoint requests, persisted in the Friend Group Auth hosted JSON store.
import crypto from "node:crypto";
import { dataGet, dataSet, dataList } from "@/lib/fga";

export type RequestStatus =
  | "pending_payment" // created, friend has not paid yet
  | "awaiting_approval" // friend paid; waiting for admin to send OpenPoint
  | "completed" // admin sent OpenPoint and closed the request
  | "rejected"; // admin rejected; credits refunded to the friend

export interface OpenPointRequest {
  id: string;
  // requester identity (from the session / userinfo)
  sub: string;
  username: string;
  globalName: string | null;
  discordId: string;
  // request details
  phone: string; // OpenPoint account = Taiwan mobile number
  amount: number; // credits = TWD = OpenPoint, 1:1
  ref: string; // idempotency key used for the pay intent
  intentId: string | null;
  status: RequestStatus;
  // timestamps (ms epoch)
  createdAt: number;
  paidAt: number | null;
  decidedAt: number | null;
  // admin bookkeeping
  adminNote: string | null;
  refundRef: string | null;
}

const KEY_PREFIX = "req:";
const keyFor = (id: string) => `${KEY_PREFIX}${id}`;

export function newId(): string {
  return crypto.randomUUID();
}

export async function getRequest(id: string): Promise<OpenPointRequest | null> {
  return dataGet<OpenPointRequest>(keyFor(id));
}

export async function saveRequest(req: OpenPointRequest): Promise<void> {
  await dataSet(keyFor(req.id), req);
}

export async function listAllRequests(): Promise<OpenPointRequest[]> {
  const entries = await dataList<OpenPointRequest>(KEY_PREFIX);
  return entries
    .map((e) => e.value)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listRequestsForUser(sub: string): Promise<OpenPointRequest[]> {
  const all = await listAllRequests();
  return all.filter((r) => r.sub === sub);
}
