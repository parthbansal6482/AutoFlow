// supabase/functions/execute-node/utils/expressions.ts
// Backend expression + templating utilities for node parameter resolution.
//
// Goals:
// - Resolve `{{ ... }}` template strings against current runtime context
// - Support JSON path style lookups (`$json`, `$item`, `$input`, `$credentials`, `$env`)
// - Work safely without arbitrary JS eval
// - Preserve original value types when expression is the full string
//
// Example:
//   resolveTemplate("Bearer {{$credentials.token}}", ctx) -> "Bearer abc123"
//   resolveTemplate("{{$json.count}}", ctx) -> 42 (number, not string)

import type { CredentialData, NodeData, NodeDataItem } from "../types.ts";

export interface ExpressionContext {
  inputData: NodeData;
  item: NodeDataItem | null;
  itemIndex: number;
  credentials: CredentialData;
  env?: Record<string, string>;
}

const TEMPLATE_REGEX = /\{\{\s*([\s\S]*?)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitPath(path: string): string[] {
  return path
    .trim()
    .replace(/^\./, "")
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function readPath(root: unknown, path: string): unknown {
  if (!path) return root;
  const parts = splitPath(path);

  let current: unknown = root;
  for (const part of parts) {
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
      continue;
    }

    if (!isRecord(current)) return undefined;
    current = current[part];
  }

  return current;
}

function toLiteral(value: string): unknown {
  const v = value.trim();

  if (v === "null") return null;
  if (v === "undefined") return undefined;
  if (v === "true") return true;
  if (v === "false") return false;

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);

  // Quoted string literal
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }

  return undefined;
}

function getFirst(inputData: NodeData): NodeDataItem | null {
  return inputData.length > 0 ? inputData[0] : null;
}

function getLast(inputData: NodeData): NodeDataItem | null {
  return inputData.length > 0 ? inputData[inputData.length - 1] : null;
}

function baseScope(ctx: ExpressionContext): Record<string, unknown> {
  const first = getFirst(ctx.inputData);
  const last = getLast(ctx.inputData);

  return {
    $json: ctx.item?.json ?? first?.json ?? {},
    $binary: ctx.item?.binary ?? first?.binary ?? {},
    $item: {
      index: ctx.itemIndex,
      json: ctx.item?.json ?? {},
      binary: ctx.item?.binary ?? {},
    },
    $input: {
      all: ctx.inputData,
      first,
      last,
      length: ctx.inputData.length,
    },
    $credentials: ctx.credentials ?? {},
    $env: ctx.env ?? {},
  };
}

function resolveToken(token: string, ctx: ExpressionContext): unknown {
  const literal = toLiteral(token);
  if (literal !== undefined) return literal;

  const scope = baseScope(ctx);
  const trimmed = token.trim();

  // Support direct numeric index on $input.all
  // e.g. $input.all.0.json.id
  if (trimmed.startsWith("$input.all.")) {
    const remaining = trimmed.replace(/^\$input\.all\./, "");
    return readPath(scope.$input, `all.${remaining}`);
  }

  // Standard roots
  for (const root of ["$json", "$binary", "$item", "$input", "$credentials", "$env"]) {
    if (trimmed === root) return scope[root];
    if (trimmed.startsWith(`${root}.`)) {
      const path = trimmed.slice(root.length + 1);
      return readPath(scope[root], path);
    }
  }

  // Fallback: allow bare path to resolve against $json
  return readPath(scope.$json, trimmed);
}

/**
 * Evaluate a simple expression token.
 *
 * Supported forms:
 * - Path lookups:
 *   $json.foo
 *   $item.json.status
 *   $input.first.json.id
 *   $credentials.token
 *   $env.API_BASE_URL
 *
 * - Literal values:
 *   "hello", 'world', 123, true, false, null
 *
 * - Binary comparisons:
 *   $json.count > 10
 *   $json.status == "active"
 *   $credentials.expires_at <= $json.now
 *
 * - Ternary (single level):
 *   $json.ok ? "yes" : "no"
 */
export function evaluateExpression(expression: string, ctx: ExpressionContext): unknown {
  const exp = expression.trim();

  // Ternary support (single level, best-effort parser)
  const qIndex = exp.indexOf("?");
  const cIndex = exp.lastIndexOf(":");
  if (qIndex > 0 && cIndex > qIndex) {
    const condPart = exp.slice(0, qIndex).trim();
    const truePart = exp.slice(qIndex + 1, cIndex).trim();
    const falsePart = exp.slice(cIndex + 1).trim();

    const condVal = evaluateExpression(condPart, ctx);
    return condVal ? evaluateExpression(truePart, ctx) : evaluateExpression(falsePart, ctx);
  }

  const ops = ["===", "!==", ">=", "<=", "==", "!=", ">", "<"] as const;
  for (const op of ops) {
    const idx = exp.indexOf(op);
    if (idx > -1) {
      const leftToken = exp.slice(0, idx).trim();
      const rightToken = exp.slice(idx + op.length).trim();

      const left = resolveToken(leftToken, ctx);
      const right = resolveToken(rightToken, ctx);

      switch (op) {
        case "===":
          return left === right;
        case "!==":
          return left !== right;
        case "==":
          // eslint-disable-next-line eqeqeq
          return left == right;
        case "!=":
          // eslint-disable-next-line eqeqeq
          return left != right;
        case ">":
          return Number(left) > Number(right);
        case "<":
          return Number(left) < Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "<=":
          return Number(left) <= Number(right);
      }
    }
  }

  return resolveToken(exp, ctx);
}

/**
 * Resolve template placeholders in a string.
 *
 * Rules:
 * - If string is exactly one expression (e.g. "{{$json.count}}"), preserves raw type.
 * - If mixed text + expressions, returns interpolated string.
 */
export function resolveTemplate(template: string, ctx: ExpressionContext): unknown {
  const matches = [...template.matchAll(TEMPLATE_REGEX)];
  if (matches.length === 0) return template;

  // single full-expression optimization (preserve type)
  const fullExprMatch = template.match(/^\s*\{\{\s*([\s\S]*?)\s*\}\}\s*$/);
  if (fullExprMatch) {
    return evaluateExpression(fullExprMatch[1], ctx);
  }

  let output = template;
  for (const m of matches) {
    const raw = m[0];
    const inner = m[1];
    const value = evaluateExpression(inner, ctx);
    output = output.replace(raw, value === undefined || value === null ? "" : String(value));
  }

  return output;
}

function resolveArray(value: unknown[], ctx: ExpressionContext): unknown[] {
  return value.map((v) => resolveValue(v, ctx));
}

function resolveObject(value: Record<string, unknown>, ctx: ExpressionContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = resolveValue(v, ctx);
  }
  return out;
}

/**
 * Recursively resolve expressions inside unknown values.
 * - strings -> resolveTemplate
 * - arrays  -> recurse
 * - objects -> recurse
 * - others  -> pass through
 */
export function resolveValue(value: unknown, ctx: ExpressionContext): unknown {
  if (typeof value === "string") return resolveTemplate(value, ctx);
  if (Array.isArray(value)) return resolveArray(value, ctx);
  if (isRecord(value)) return resolveObject(value, ctx);
  return value;
}

/**
 * Resolve node parameters for each item context.
 * Useful for nodes that need per-item expression expansion.
 */
export function resolveParametersForItem(
  parameters: Record<string, unknown>,
  inputData: NodeData,
  itemIndex: number,
  credentials: CredentialData,
  env?: Record<string, string>,
): Record<string, unknown> {
  const item = inputData[itemIndex] ?? null;
  const ctx: ExpressionContext = {
    inputData,
    item,
    itemIndex,
    credentials,
    ...(env ? { env } : {}),
  };

  const resolved = resolveValue(parameters, ctx);
  return isRecord(resolved) ? resolved : {};
}
