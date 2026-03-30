// supabase/functions/execute-node/nodes/switch.ts
// Switch node executor with rule-based branch selection.
//
// Aligned branch outputs with named case outputs from node definition:
// - case-1, case-2, case-3, default
//
// Contract:
// - Input: NodeData
// - Output: NodeData (pass-through)
// - Branch: one of "case-1" | "case-2" | "case-3" | "default"
//
// Supported parameters:
// {
//   field?: string,
//   cases?: Array<{
//     output?: "case-1" | "case-2" | "case-3" | "default",
//     operator?: "equals" | "notEquals" | "contains" | "notContains" |
//                "greaterThan" | "lessThan" | "greaterThanOrEqual" | "lessThanOrEqual" |
//                "exists" | "notExists" | "startsWith" | "endsWith" | "regex",
//     value?: unknown
//   }>,
//   fallbackOutput?: "case-1" | "case-2" | "case-3" | "default"
// }
//
// Backward compatibility:
// - If `rules` exists, it is accepted as an alias for `cases`
// - If a case omits `output`, defaults to case index mapping (0->case-1, 1->case-2, 2->case-3)

import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";

type SwitchOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "exists"
  | "notExists"
  | "startsWith"
  | "endsWith"
  | "regex";

type SwitchBranch = "case-1" | "case-2" | "case-3" | "default";

interface SwitchCase {
  output: SwitchBranch;
  operator: SwitchOperator;
  value?: unknown;
}

interface SwitchParameters {
  field?: unknown;
  cases?: unknown;
  rules?: unknown; // legacy alias
  fallbackOutput?: unknown;
}

const VALID_BRANCHES: SwitchBranch[] = [
  "case-1",
  "case-2",
  "case-3",
  "default",
];

function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  if (!isRecord(obj)) return undefined;

  const normalized = path
    .replace(/^\$item\.json\./, "")
    .replace(/^\$json\./, "");

  let current: unknown = obj;
  for (const part of normalized.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function isValidOperator(value: unknown): value is SwitchOperator {
  return (
    value === "equals" ||
    value === "notEquals" ||
    value === "contains" ||
    value === "notContains" ||
    value === "greaterThan" ||
    value === "lessThan" ||
    value === "greaterThanOrEqual" ||
    value === "lessThanOrEqual" ||
    value === "exists" ||
    value === "notExists" ||
    value === "startsWith" ||
    value === "endsWith" ||
    value === "regex"
  );
}

function isValidBranch(value: unknown): value is SwitchBranch {
  return (
    typeof value === "string" && VALID_BRANCHES.includes(value as SwitchBranch)
  );
}

function defaultOutputForIndex(index: number): SwitchBranch {
  if (index === 0) return "case-1";
  if (index === 1) return "case-2";
  if (index === 2) return "case-3";
  return "default";
}

function parseCases(parameters: SwitchParameters): SwitchCase[] | null {
  const raw = parameters.cases ?? parameters.rules;
  if (!Array.isArray(raw)) return null;

  const parsed: SwitchCase[] = [];

  for (let i = 0; i < raw.length; i++) {
    const candidate = raw[i];
    if (!isRecord(candidate)) return null;

    const operator = candidate["operator"];
    if (!isValidOperator(operator)) return null;

    const outputRaw = candidate["output"];
    const output = isValidBranch(outputRaw)
      ? outputRaw
      : defaultOutputForIndex(i);

    parsed.push({
      output,
      operator,
      value: candidate["value"],
    });
  }

  return parsed;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return Number(value);
}

function evaluate(
  operator: SwitchOperator,
  left: unknown,
  right: unknown,
): boolean {
  switch (operator) {
    case "equals":
      // eslint-disable-next-line eqeqeq
      return left == right;
    case "notEquals":
      // eslint-disable-next-line eqeqeq
      return left != right;
    case "contains":
      if (typeof left === "string") return left.includes(asString(right));
      if (Array.isArray(left)) return left.includes(right);
      return false;
    case "notContains":
      if (typeof left === "string") return !left.includes(asString(right));
      if (Array.isArray(left)) return !left.includes(right);
      return true;
    case "greaterThan":
      return asNumber(left) > asNumber(right);
    case "lessThan":
      return asNumber(left) < asNumber(right);
    case "greaterThanOrEqual":
      return asNumber(left) >= asNumber(right);
    case "lessThanOrEqual":
      return asNumber(left) <= asNumber(right);
    case "exists":
      return left !== undefined && left !== null;
    case "notExists":
      return left === undefined || left === null;
    case "startsWith":
      return asString(left).startsWith(asString(right));
    case "endsWith":
      return asString(left).endsWith(asString(right));
    case "regex": {
      try {
        return new RegExp(asString(right)).test(asString(left));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function parseFallback(raw: unknown): SwitchBranch {
  return isValidBranch(raw) ? raw : "default";
}

export function executeSwitch(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const p = parameters as SwitchParameters;
  const field = typeof p.field === "string" ? p.field : "";
  const fallback = parseFallback(p.fallbackOutput);

  const cases = parseCases(p);
  if (!cases) {
    return fail(
      "Switch node: `cases` (or legacy `rules`) must be an array of valid case definitions",
      inputData,
      fallback,
    );
  }

  if (!field) {
    return fail(
      "Switch node: `field` parameter is required",
      inputData,
      fallback,
    );
  }

  if (inputData.length === 0) {
    return ok(inputData, fallback);
  }

  const first = inputData[0];
  const leftValue = resolvePath(first.json, field);

  for (const c of cases) {
    if (evaluate(c.operator, leftValue, c.value)) {
      return ok(inputData, c.output);
    }
  }

  return ok(inputData, fallback);
}
