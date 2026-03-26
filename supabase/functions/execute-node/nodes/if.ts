// supabase/functions/execute-node/nodes/if.ts
// Evaluates a condition against input data and routes to 'true' or 'false' output.
// Parameters: field (dot-path), operator, value

export interface NodeResult {
  output: unknown;
  branch: "true" | "false";
  error?: string;
}

type Operator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "exists"
  | "notExists";

interface IfParameters {
  field: string;       // dot-path e.g. "body.status"
  operator: Operator;
  value?: unknown;
}

/**
 * Safely resolves a dot-path on an object.
 * e.g. resolvePath({ body: { status: 200 } }, "body.status") → 200
 */
function resolvePath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluate(
  fieldValue: unknown,
  operator: Operator,
  compareValue: unknown
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

export function executeIf(
  parameters: Record<string, unknown>,
  inputData: unknown,
  _credentialData: Record<string, unknown> | null
): NodeResult {
  const p = parameters as unknown as IfParameters;

  if (!p.field) {
    return { output: inputData, branch: "false", error: "field parameter is required" };
  }
  if (!p.operator) {
    return { output: inputData, branch: "false", error: "operator parameter is required" };
  }

  const fieldValue = resolvePath(inputData, p.field);
  const result = evaluate(fieldValue, p.operator, p.value);

  return {
    output: inputData, // pass input data through unchanged
    branch: result ? "true" : "false",
  };
}
