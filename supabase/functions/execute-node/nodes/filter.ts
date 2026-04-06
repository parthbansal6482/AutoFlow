// supabase/functions/execute-node/nodes/filter.ts
// Filter node executor:
// - Keeps items that match the configured condition.
// - Supports dot-notation field paths.

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, ok } from "../types.ts";

type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists"
  | "not_exists";

interface FilterParameters {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
  caseSensitive?: unknown;
}

function parseField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const field = raw.trim();
  return field.length > 0 ? field : null;
}

function parseOperator(raw: unknown): FilterOperator {
  if (typeof raw !== "string") return "equals";
  const op = raw.trim().toLowerCase() as FilterOperator;
  const allowed: Set<string> = new Set([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "gt",
    "gte",
    "lt",
    "lte",
    "exists",
    "not_exists",
  ]);
  return allowed.has(op) ? op : "equals";
}

function parseCaseSensitive(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeString(value: unknown, caseSensitive: boolean): string {
  const text = String(value ?? "");
  return caseSensitive ? text : text.toLowerCase();
}

function getByPath(
  source: Record<string, unknown>,
  path: string,
): { exists: boolean; value: unknown } {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return { exists: false, value: undefined };

  let current: unknown = source;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return { exists: false, value: undefined };
    }

    if (!(part in (current as Record<string, unknown>))) {
      return { exists: false, value: undefined };
    }

    current = (current as Record<string, unknown>)[part];
  }

  return { exists: true, value: current };
}

function evaluateCondition(
  item: NodeDataItem,
  field: string,
  operator: FilterOperator,
  comparison: unknown,
  caseSensitive: boolean,
): boolean {
  const { exists, value } = getByPath(item.json, field);

  if (operator === "exists") return exists;
  if (operator === "not_exists") return !exists;
  if (!exists) return false;

  if (operator === "equals") {
    if (
      typeof value === "string" &&
      typeof comparison === "string" &&
      !caseSensitive
    ) {
      return value.toLowerCase() === comparison.toLowerCase();
    }
    return value === comparison;
  }

  if (operator === "not_equals") {
    if (
      typeof value === "string" &&
      typeof comparison === "string" &&
      !caseSensitive
    ) {
      return value.toLowerCase() !== comparison.toLowerCase();
    }
    return value !== comparison;
  }

  if (operator === "contains" || operator === "not_contains") {
    let includes = false;

    if (typeof value === "string") {
      const haystack = normalizeString(value, caseSensitive);
      const needle = normalizeString(comparison, caseSensitive);
      includes = haystack.includes(needle);
    } else if (Array.isArray(value)) {
      includes = value.includes(comparison);
    }

    return operator === "contains" ? includes : !includes;
  }

  if (
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte"
  ) {
    const left = asNumber(value);
    const right = asNumber(comparison);

    if (left === null || right === null) return false;

    if (operator === "gt") return left > right;
    if (operator === "gte") return left >= right;
    if (operator === "lt") return left < right;
    return left <= right;
  }

  return false;
}

function cloneItem(item: NodeDataItem): NodeDataItem {
  return {
    json: { ...item.json },
    ...(item.binary ? { binary: { ...item.binary } } : {}),
  };
}

export function executeFilter(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const parsed: FilterParameters = {
    field: parameters["field"],
    operator: parameters["operator"],
    value: parameters["value"],
    caseSensitive: parameters["caseSensitive"],
  };

  const field = parseField(parsed.field);
  if (!field) {
    return fail("Filter node requires a non-empty 'field' parameter.", inputData);
  }

  const operator = parseOperator(parsed.operator);
  const caseSensitive = parseCaseSensitive(parsed.caseSensitive);
  const comparison = parsed.value;

  const output = inputData
    .filter((item) =>
      evaluateCondition(item, field, operator, comparison, caseSensitive),
    )
    .map(cloneItem);

  return ok(output);
}
