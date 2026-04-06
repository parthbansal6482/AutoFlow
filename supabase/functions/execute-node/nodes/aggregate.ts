// supabase/functions/execute-node/nodes/aggregate.ts
// Aggregate node executor:
// - Aggregates input items into a single summary item.
// - Supported operations: count, sum, avg, min, max, concat.

import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, ok } from "../types.ts";

type AggregateOperation = "count" | "sum" | "avg" | "min" | "max" | "concat";

interface AggregateParameters {
  operation?: unknown;
  field?: unknown;
  separator?: unknown;
}

function parseOperation(raw: unknown): AggregateOperation {
  if (typeof raw !== "string") return "count";
  const op = raw.trim().toLowerCase();
  const allowed: Set<string> = new Set([
    "count",
    "sum",
    "avg",
    "min",
    "max",
    "concat",
  ]);
  return allowed.has(op) ? (op as AggregateOperation) : "count";
}

function parseField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const field = raw.trim();
  return field.length > 0 ? field : null;
}

function parseSeparator(raw: unknown): string {
  return typeof raw === "string" ? raw : ", ";
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

function toNumbers(values: unknown[]): number[] {
  const out: number[] = [];

  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out.push(value);
      continue;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        out.push(parsed);
      }
    }
  }

  return out;
}

export function executeAggregate(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const parsed: AggregateParameters = {
    operation: parameters["operation"],
    field: parameters["field"],
    separator: parameters["separator"],
  };

  const operation = parseOperation(parsed.operation);
  const field = parseField(parsed.field);
  const separator = parseSeparator(parsed.separator);

  const baseOutput: Record<string, unknown> = {
    operation,
    count: inputData.length,
    field: field ?? null,
  };

  if (operation === "count") {
    return ok([{ json: { ...baseOutput, value: inputData.length, count: inputData.length } }]);
  }

  if (!field) {
    return fail(
      `Aggregate operation '${operation}' requires a non-empty 'field' parameter.`,
      inputData,
    );
  }

  const values = inputData.map((item) => getByPath(item.json, field));

  if (operation === "concat") {
    const text = values
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value))
      .join(separator);

    return ok([{ json: { ...baseOutput, value: text, separator } }]);
  }

  const numbers = toNumbers(values);
  if (numbers.length === 0) {
    return fail(
      `Aggregate operation '${operation}' found no numeric values in field '${field}'.`,
      inputData,
    );
  }

  if (operation === "sum") {
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    return ok([{ json: { ...baseOutput, value: sum } }]);
  }

  if (operation === "avg") {
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const avg = sum / numbers.length;
    return ok([{ json: { ...baseOutput, value: avg, numeric_count: numbers.length } }]);
  }

  if (operation === "min") {
    const min = Math.min(...numbers);
    return ok([{ json: { ...baseOutput, value: min } }]);
  }

  const max = Math.max(...numbers);
  return ok([{ json: { ...baseOutput, value: max } }]);
}
