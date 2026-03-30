// supabase/functions/execute-node/nodes/code.ts
// Executes user-provided JavaScript against canonical NodeData.
//
// Contract:
// - Input: NodeData
// - Output: NodeData
// - User code can access $input helpers and must return data that can be normalized to NodeData.

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { normalizeNodeData, ok, fail, isRecord } from "../types.ts";

interface CodeParameters {
  code: string;
}

interface InputHelper {
  all: () => NodeData;
  first: () => NodeDataItem | null;
  last: () => NodeDataItem | null;
  item: (index: number) => NodeDataItem | null;
  length: number;
  data: NodeData;
}

/**
 * Builds a minimal n8n-like $input helper over canonical NodeData.
 */
function makeInputHelper(data: NodeData): InputHelper {
  return {
    all: () => data,
    first: () => (data.length > 0 ? data[0] : null),
    last: () => (data.length > 0 ? data[data.length - 1] : null),
    item: (index: number) =>
      index >= 0 && index < data.length ? data[index] : null,
    length: data.length,
    data,
  };
}

/**
 * Normalizes node params for this executor.
 */
function parseParameters(parameters: NodeParameters): CodeParameters | null {
  if (!isRecord(parameters)) return null;
  const code = parameters["code"];
  if (typeof code !== "string" || code.trim().length === 0) return null;
  return { code };
}

/**
 * Executes user code by wrapping in async IIFE.
 * The function receives:
 * - __inputHelper: Input helper object exposed as `$input`
 * - __credentials: decrypted credential payload (if any)
 */
async function runUserCode(
  code: string,
  inputData: NodeData,
  credentials: CredentialData,
): Promise<unknown> {
  const wrappedCode = `
    const $input = __inputHelper;
    const $credentials = __credentials;
    return await (async () => {
      ${code}
    })();
  `;

  // Note: This is not a hardened security sandbox. It preserves existing behavior
  // while enforcing runtime input/output contracts at the executor boundary.
  const fn = new Function("__inputHelper", "__credentials", wrappedCode);
  return await fn(makeInputHelper(inputData), credentials);
}

/**
 * Converts common user return formats to canonical NodeData.
 * Supports:
 * - canonical NodeData
 * - plain array/object/scalar (via normalizeNodeData)
 * - { output: ... } wrapper
 * - n8n-like single item { json: {...} }
 */
function coerceUserResultToNodeData(result: unknown): NodeData {
  if (isRecord(result) && "output" in result) {
    return normalizeNodeData(result.output);
  }

  return normalizeNodeData(result);
}

export async function executeCode(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const parsed = parseParameters(parameters);
  if (!parsed) {
    return fail(
      "code parameter is required and must be a non-empty string",
      inputData,
    );
  }

  try {
    const userResult = await runUserCode(
      parsed.code,
      inputData,
      credentialData,
    );
    const output = coerceUserResultToNodeData(userResult);

    return ok(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`Code execution failed: ${message}`, inputData);
  }
}
