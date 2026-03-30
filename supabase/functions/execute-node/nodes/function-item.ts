// supabase/functions/execute-node/nodes/function-item.ts
// Function Item node executor.
// Runs user-provided JavaScript once per input item and returns transformed NodeData.
//
// Contract:
// - Input: NodeData
// - Output: NodeData
// - Parameter: code (string)
//
// Runtime variables available to user code:
// - $json          -> current item's json payload
// - $binary        -> current item's binary payload (if any)
// - $itemIndex     -> current index
// - $input         -> helper with all(), first(), last(), item(index), length
// - $credentials   -> decrypted credential object (if provided)
//
// User code can return one of:
// - Record<string, unknown>            => treated as new json for current item
// - { json: Record<string, unknown>, binary?: ... } => treated as full item
// - null / undefined                   => current item is passed through unchanged

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";

interface FunctionItemParameters {
  code: string;
}

interface InputHelper {
  all: () => NodeData;
  first: () => NodeDataItem | null;
  last: () => NodeDataItem | null;
  item: (index: number) => NodeDataItem | null;
  length: number;
}

function makeInputHelper(data: NodeData): InputHelper {
  return {
    all: () => data,
    first: () => (data.length > 0 ? data[0] : null),
    last: () => (data.length > 0 ? data[data.length - 1] : null),
    item: (index: number) => (index >= 0 && index < data.length ? data[index] : null),
    length: data.length,
  };
}

function cloneItem(item: NodeDataItem): NodeDataItem {
  return {
    json: { ...item.json },
    ...(item.binary ? { binary: { ...item.binary } } : {}),
  };
}

function parseParameters(parameters: NodeParameters): FunctionItemParameters | null {
  const code = parameters["code"];
  if (typeof code !== "string" || code.trim().length === 0) return null;
  return { code };
}

function isNodeDataItemLike(value: unknown): value is NodeDataItem {
  if (!isRecord(value)) return false;
  if (!("json" in value)) return false;
  const json = (value as Record<string, unknown>)["json"];
  return isRecord(json);
}

function toOutputItem(result: unknown, original: NodeDataItem): NodeDataItem {
  // null/undefined => passthrough original item
  if (result === null || result === undefined) return cloneItem(original);

  // Full item shape returned
  if (isNodeDataItemLike(result)) {
    const item = result as NodeDataItem;
    return {
      json: { ...item.json },
      ...(item.binary ? { binary: { ...item.binary } } : {}),
    };
  }

  // Plain object => json replacement, keep original binary
  if (isRecord(result)) {
    return {
      json: { ...result },
      ...(original.binary ? { binary: { ...original.binary } } : {}),
    };
  }

  // Scalar => wrap as value, keep original binary
  return {
    json: { value: result },
    ...(original.binary ? { binary: { ...original.binary } } : {}),
  };
}

async function runFunctionItemCode(
  code: string,
  inputData: NodeData,
  item: NodeDataItem,
  itemIndex: number,
  credentials: CredentialData,
): Promise<unknown> {
  const wrapped = `
    const $json = __item.json;
    const $binary = __item.binary;
    const $itemIndex = __itemIndex;
    const $input = __inputHelper;
    const $credentials = __credentials;
    return await (async () => {
      ${code}
    })();
  `;

  // Note: This is not a hardened sandbox, matching existing project behavior.
  const fn = new Function(
    "__item",
    "__itemIndex",
    "__inputHelper",
    "__credentials",
    wrapped,
  );

  return await fn(item, itemIndex, makeInputHelper(inputData), credentials);
}

export async function executeFunctionItem(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const parsed = parseParameters(parameters);
  if (!parsed) {
    return fail(
      "Function Item node: `code` parameter is required and must be a non-empty string",
      inputData,
    );
  }

  const output: NodeData = [];

  try {
    for (let i = 0; i < inputData.length; i++) {
      const current = inputData[i];
      const result = await runFunctionItemCode(
        parsed.code,
        inputData,
        current,
        i,
        credentialData,
      );
      output.push(toOutputItem(result, current));
    }

    return ok(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`Function Item execution failed: ${message}`, inputData);
  }
}
