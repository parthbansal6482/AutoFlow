// supabase/functions/execute-node/nodes/set.ts
// Set node executor operating on canonical NodeData.
// Supports object-style `fields` parameters and applies them to each item's `json`.
// Dynamic field values are resolved through backend expression utility per item context.

import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";
import { resolveValue } from "../utils/expressions.ts";

interface SetParameters {
  fields?: unknown; // preferred: Record<string, unknown>, backward-compatible: JSON string
}

function parseFields(fields: unknown): Record<string, unknown> | null {
  if (isRecord(fields)) return fields;

  if (typeof fields === "string") {
    try {
      const parsed = JSON.parse(fields) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Deep merge objects where:
 * - Plain object values are recursively merged
 * - Arrays/scalars overwrite target values
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const existing = result[key];

    if (isRecord(existing) && isRecord(value)) {
      result[key] = deepMerge(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

/**
 * Set node:
 * - Input: NodeData
 * - Output: NodeData
 * - Merges resolved `fields` into each item's `json`
 */
export function executeSet(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): NodeResult {
  const p = parameters as SetParameters;

  const fieldsTemplate = parseFields(p.fields);
  if (!fieldsTemplate) {
    return fail(
      "fields parameter is required and must be an object (or valid JSON object string)",
      inputData,
    );
  }

  const output: NodeData = inputData.map((item, index) => {
    const resolvedUnknown = resolveValue(fieldsTemplate, {
      inputData,
      item,
      itemIndex: index,
      credentials: credentialData,
    });

    const resolvedFields = isRecord(resolvedUnknown)
      ? resolvedUnknown
      : fieldsTemplate;

    const mergedJson = deepMerge(item.json, resolvedFields);

    return {
      json: mergedJson,
      ...(item.binary ? { binary: item.binary } : {}),
    };
  });

  return ok(output);
}
