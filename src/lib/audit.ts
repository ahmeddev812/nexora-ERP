/**
 * NEXORA audit log.
 *
 * Append-only. Every mutation in the app writes exactly one entry through
 * `writeAuditLog()` after the state change is persisted. There is no edit
 * or delete path by design.
 */

import type { AuditAction, AuditLog } from "@/types/erp";

import { generateId } from "./id";
import { getCollection, setJSON, StorageKeys } from "./storage";

/** Keeps the log bounded so localStorage never grows without limit. */
export const MAX_AUDIT_ENTRIES = 2000;

export interface AuditInput {
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: string;
  summary: string;
  entityId?: string | null;
  entityNumber?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  at?: string;
}

export function writeAuditLog(input: AuditInput): AuditLog {
  const entry: AuditLog = {
    id: generateId("aud"),
    at: input.at ?? new Date().toISOString(),
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    entityNumber: input.entityNumber,
    summary: input.summary,
    before: input.before ?? null,
    after: input.after ?? null,
  };

  const entries = getCollection<AuditLog>(StorageKeys.auditLog);
  entries.push(entry);

  const trimmed =
    entries.length > MAX_AUDIT_ENTRIES
      ? entries.slice(entries.length - MAX_AUDIT_ENTRIES)
      : entries;

  setJSON(StorageKeys.auditLog, trimmed);
  return entry;
}

/** Newest first. */
export function readAuditLog(limit?: number): AuditLog[] {
  const entries = getCollection<AuditLog>(StorageKeys.auditLog);
  const sorted = [...entries].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return typeof limit === "number" ? sorted.slice(0, Math.max(0, limit)) : sorted;
}

export function auditTrailFor(entity: string, entityId: string): AuditLog[] {
  return readAuditLog().filter(
    (entry) => entry.entity === entity && entry.entityId === entityId,
  );
}

export function auditTrailForActor(actorId: string): AuditLog[] {
  return readAuditLog().filter((entry) => entry.actorId === actorId);
}

/** Short human label for the activity feed. */
export function auditSentence(entry: AuditLog): string {
  const target = entry.entityNumber ?? entry.entity;
  if (entry.summary) return entry.summary;
  return `${entry.action} ${target}`;
}
