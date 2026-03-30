// supabase/functions/execute-node/types.ts
// Shared runtime types + normalization helpers for execute-node executors.

/**
 * One workflow data item flowing between nodes.
 * This intentionally mirrors n8n-style item shape.
 */
export interface NodeDataItem {
  json: Record<string, unknown>;
  binary?: Record<
    string,
    {
      data: string; // base64
      mimeType?: string;
      fileName?: string;
    }
  >;
}

/**
 * Canonical runtime payload passed between nodes.
 */
export type NodeData = NodeDataItem[];

/**
 * Standard node executor result shape.
 * - `branch` is used by branching nodes (if/switch).
 * - `error` is populated on node-level execution failures.
 */
export interface NodeResult {
  output: NodeData;
  error?: string;
  branch?: string;
}

/**
 * Generic parameter map for node executors.
 */
export type NodeParameters = Record<string, unknown>;

/**
 * Optional credential payload injected at runtime after decryption.
 */
export type CredentialData = Record<string, unknown> | null;

/**
 * Returns true when value is a plain object (not array/null).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for NodeDataItem.
 */
export function isNodeDataItem(value: unknown): value is NodeDataItem {
  if (!isRecord(value)) return false;
  if (!("json" in value)) return false;
  if (!isRecord((value as Record<string, unknown>).json)) return false;

  if ("binary" in value && value.binary !== undefined) {
    const binary = (value as Record<string, unknown>).binary;
    if (!isRecord(binary)) return false;
  }

  return true;
}

/**
 * Type guard for canonical NodeData.
 */
export function isNodeData(value: unknown): value is NodeData {
  return Array.isArray(value) && value.every(isNodeDataItem);
}

/**
 * Safely converts arbitrary input into canonical NodeData.
 *
 * Rules:
 * - NodeData -> pass through
 * - array of primitives/objects -> [{ json: item }]
 * - plain object with `json` key in wrong shape -> wrapped
 * - scalar/null/undefined -> [{ json: { value: ... } }]
 */
export function normalizeNodeData(input: unknown): NodeData {
  if (isNodeData(input)) return input;

  if (Array.isArray(input)) {
    return input.map((item) => {
      if (isNodeDataItem(item)) return item;
      if (isRecord(item)) return { json: item };
      return { json: { value: item } };
    });
  }

  if (isRecord(input)) {
    // If someone passed a single item-ish object, keep only safe parts.
    if ("json" in input && isRecord(input.json)) {
      const normalized: NodeDataItem = { json: input.json };
      if ("binary" in input && isRecord(input.binary)) {
        normalized.binary = input.binary as NodeDataItem["binary"];
      }
      return [normalized];
    }

    return [{ json: input }];
  }

  return [{ json: { value: input ?? null } }];
}

/**
 * Ensures params are a plain object.
 */
export function normalizeParameters(parameters: unknown): NodeParameters {
  return isRecord(parameters) ? parameters : {};
}

/**
 * Small helper to create a successful node result.
 */
export function ok(output: unknown, branch?: string): NodeResult {
  return {
    output: normalizeNodeData(output),
    ...(branch ? { branch } : {}),
  };
}

/**
 * Small helper to create an error node result.
 * Keeps the output contract stable for downstream handling.
 */
export function fail(message: string, output?: unknown, branch?: string): NodeResult {
  return {
    output: normalizeNodeData(output ?? []),
    error: message,
    ...(branch ? { branch } : {}),
  };
}
