// supabase/functions/execute-node/nodes/if.ts
// IF node executor with canonical NodeData support.
//
// Enhancements:
// - Uses expression resolution utility for condition mode
// - Uses expression resolution utility for legacy compare value handling
// - Supports both:
//   1) Preferred mode: { condition: string }
//   2) Legacy mode:   { field, operator, value }

import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";
import { evaluateExpression, resolveValue } from "../utils/expressions.ts";

type Operator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "exists"
  | "notExists";

interface IfConditionParams {
  condition?: unknown;
}

interface IfLegacyParams {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
}

function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  if (obj === null || obj === undefined) return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }

  return current;
}

function evaluateLegacy(
  fieldValue: unknown,
  operator: Operator,
  compareValue: unknown,
): boolean {
  switch (operator) {
    case "equals":
      // eslint-disable-next-line eqeqeq
      return fieldValue == compareValue;
    case "notEquals":
      // eslint-disable-next-line eqeqeq
      return fieldValue != compareValue;
    case "contains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;
    case "notContains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return !fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return true;
    case "greaterThan":
      return Number(fieldValue) > Number(compareValue);
    case "lessThan":
      return Number(fieldValue) < Number(compareValue);
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "notExists":
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

function evaluateByCondition(
  condition: string,
  input: NodeData,
  credentialData: CredentialData,
): boolean {
  const item = input.length > 0 ? input[0] : null;
  const result = evaluateExpression(condition, {
    inputData: input,
    item,
    itemIndex: 0,
    credentials: credentialData,
  });
  return Boolean(result);
}

function evaluateByLegacyParams(
  params: IfLegacyParams,
  input: NodeData,
  credentialData: CredentialData,
): { ok: boolean; error?: string } {
  const field = typeof params.field === "string" ? params.field : "";
  const operator =
    typeof params.operator === "string" ? (params.operator as Operator) : "";

  if (!field) {
    return { ok: false, error: "IF node: field is required for legacy mode" };
  }

  if (!operator) {
    return {
      ok: false,
      error: "IF node: operator is required for legacy mode",
    };
  }

  if (input.length === 0) {
    return { ok: false };
  }

  const first = input[0];
  const fieldPath = field
    .replace(/^\$item\.json\./, "")
    .replace(/^\$json\./, "");

  const fieldValue = resolvePath(first.json, fieldPath);

  const resolvedCompareValue = resolveValue(params.value, {
    inputData: input,
    item: first,
    itemIndex: 0,
    credentials: credentialData,
  });

  return { ok: evaluateLegacy(fieldValue, operator, resolvedCompareValue) };
}

export function executeIf(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): NodeResult {
  const conditionParams = parameters as IfConditionParams;
  const legacyParams = parameters as IfLegacyParams;

  // Preferred mode: condition expression
  if (
    typeof conditionParams.condition === "string" &&
    conditionParams.condition.trim().length > 0
  ) {
    const passed = evaluateByCondition(
      conditionParams.condition,
      inputData,
      credentialData,
    );
    return ok(inputData, passed ? "true" : "false");
  }

  // Backward-compatible legacy mode
  if (
    typeof legacyParams.field === "string" ||
    typeof legacyParams.operator === "string" ||
    legacyParams.value !== undefined
  ) {
    const result = evaluateByLegacyParams(
      legacyParams,
      inputData,
      credentialData,
    );
    if (result.error) {
      return fail(result.error, inputData, "false");
    }
    return ok(inputData, result.ok ? "true" : "false");
  }

  return fail(
    "IF node: missing condition. Provide `condition` (preferred) or legacy `field/operator/value`.",
    inputData,
    "false",
  );
}
