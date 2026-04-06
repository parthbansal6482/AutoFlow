// supabase/functions/execute-node/nodes/sort.ts
// Sort node executor:
// - Sorts items by a configured field path.
// - Supports ascending/descending and optional numeric/case-sensitive behavior.

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, ok } from "../types.ts";

interface SortParameters {
  field?: unknown;
  order?: unknown;
  numeric?: unknown;
  caseSensitive?: unknown;
}

type SortOrder = "asc" | "desc";

function parseField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const field = raw.trim();
  return field.length > 0 ? field : null;
}

function parseOrder(raw: unknown): SortOrder {
  if (typeof raw !== "string") return "asc";
  return raw.trim().toLowerCase() === "desc" ? "desc" : "asc";
}

function parseBoolean(raw: unknown, fallback = false): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function getByPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let current: unknown = source;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    if (!(part in (current as Record<string, unknown>))) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function toComparableString(value: unknown, caseSensitive: boolean): string {
  const str = String(value ?? "");
  return caseSensitive ? str : str.toLowerCase();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function compareValues(
  a: unknown,
  b: unknown,
  numeric: boolean,
  caseSensitive: boolean,
): number {
  const aMissing = a === undefined || a === null;
  const bMissing = b === undefined || b === null;

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (numeric) {
    const na = asNumber(a);
    const nb = asNumber(b);
    if (na !== null && nb !== null) {
      return na === nb ? 0 : na > nb ? 1 : -1;
    }
  }

  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a > b ? 1 : -1;
  }

  const sa = toComparableString(a, caseSensitive);
  const sb = toComparableString(b, caseSensitive);
  if (sa === sb) return 0;
  return sa > sb ? 1 : -1;
}

function cloneItem(item: NodeDataItem): NodeDataItem {
  return {
    json: { ...item.json },
    ...(item.binary ? { binary: { ...item.binary } } : {}),
  };
}

export function executeSort(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const parsed: SortParameters = {
    field: parameters["field"],
    order: parameters["order"],
    numeric: parameters["numeric"],
    caseSensitive: parameters["caseSensitive"],
  };

  const field = parseField(parsed.field);
  if (!field) {
    return fail("Sort node requires a non-empty 'field' parameter.", inputData);
  }

  const order = parseOrder(parsed.order);
  const numeric = parseBoolean(parsed.numeric);
  const caseSensitive = parseBoolean(parsed.caseSensitive);

  const withIndex = inputData.map((item, index) => ({
    item,
    index,
    value: getByPath(item.json, field),
  }));

  withIndex.sort((left, right) => {
    const compared = compareValues(
      left.value,
      right.value,
      numeric,
      caseSensitive,
    );

    if (compared !== 0) return order === "asc" ? compared : -compared;
    return left.index - right.index;
  });

  return ok(withIndex.map((entry) => cloneItem(entry.item)));
}
