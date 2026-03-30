// supabase/functions/execute-node/nodes/merge.ts
// Merge node executor supporting:
// 1) append mode     -> concatenates all incoming items
// 2) index mode      -> merges item N from input stream A with item N from stream B
//
// Parameter alignment with node definition:
// - mode: "append" | "index"
// - keepUnpaired: boolean (preferred)
// Backward compatibility:
// - mode: "by-index" is accepted as alias for "index"
// - keep_unpaired is accepted as alias for keepUnpaired

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";

type MergeMode = "append" | "index";

interface MergeParameters {
  mode?: unknown; // "append" | "index" (legacy alias: "by-index")
  keepUnpaired?: unknown; // preferred boolean
  keep_unpaired?: unknown; // legacy boolean alias
  prefer?: unknown; // "right" | "left", collision strategy. default: "right"
}

type NodeDataLike = NodeData | NodeData[] | unknown;

function isNodeDataItemLike(value: unknown): value is NodeDataItem {
  return (
    isRecord(value) &&
    "json" in value &&
    isRecord((value as Record<string, unknown>).json)
  );
}

function isNodeDataLikeArray(value: unknown): value is NodeData {
  return Array.isArray(value) && value.every(isNodeDataItemLike);
}

/**
 * Coerces runtime input into stream list for merge operations.
 * - NodeData   => [NodeData]
 * - NodeData[] => NodeData[]
 * - unknown    => []
 */
function toStreams(input: NodeDataLike): NodeData[] {
  if (!Array.isArray(input)) return [];

  // Case A: canonical NodeData (array of items with json)
  if (isNodeDataLikeArray(input)) return [input];

  // Case B: array of streams
  const maybeStreams = input as unknown[];
  const streams: NodeData[] = [];

  for (const candidate of maybeStreams) {
    if (isNodeDataLikeArray(candidate)) {
      streams.push(candidate);
    }
  }

  return streams;
}

function parseMode(parameters: MergeParameters): MergeMode {
  const raw = parameters.mode;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "append") return "append";
    if (
      normalized === "index" ||
      normalized === "by-index" ||
      normalized === "byindex"
    ) {
      return "index";
    }
  }
  return "append";
}

function parseKeepUnpaired(parameters: MergeParameters): boolean {
  const preferred = parameters.keepUnpaired;
  if (typeof preferred === "boolean") return preferred;

  const legacy = parameters.keep_unpaired;
  if (typeof legacy === "boolean") return legacy;

  return true;
}

function parsePrefer(parameters: MergeParameters): "left" | "right" {
  const raw = parameters.prefer;
  if (typeof raw === "string" && raw.trim().toLowerCase() === "left") {
    return "left";
  }
  return "right";
}

function cloneItem(item: NodeDataItem): NodeDataItem {
  return {
    json: { ...item.json },
    ...(item.binary ? { binary: { ...item.binary } } : {}),
  };
}

function mergeBinary(
  left?: NodeDataItem["binary"],
  right?: NodeDataItem["binary"],
  prefer: "left" | "right" = "right",
): NodeDataItem["binary"] | undefined {
  if (!left && !right) return undefined;
  if (!left) return right ? { ...right } : undefined;
  if (!right) return { ...left };

  return prefer === "right" ? { ...left, ...right } : { ...right, ...left };
}

function mergeItemsByIndex(
  left: NodeDataItem,
  right: NodeDataItem,
  prefer: "left" | "right",
): NodeDataItem {
  const mergedJson =
    prefer === "right"
      ? { ...left.json, ...right.json }
      : { ...right.json, ...left.json };

  const mergedBinary = mergeBinary(left.binary, right.binary, prefer);

  return {
    json: mergedJson,
    ...(mergedBinary ? { binary: mergedBinary } : {}),
  };
}

function executeAppend(streams: NodeData[]): NodeData {
  const out: NodeData = [];
  for (const stream of streams) {
    for (const item of stream) {
      out.push(cloneItem(item));
    }
  }
  return out;
}

function executeIndexMerge(
  streams: NodeData[],
  keepUnpaired: boolean,
  prefer: "left" | "right",
): NodeData {
  // Use first two streams as A and B.
  const left = streams[0] ?? [];
  const right = streams[1] ?? [];

  // No right stream => passthrough left.
  if (streams.length < 2) {
    return left.map(cloneItem);
  }

  const maxLen = Math.max(left.length, right.length);
  const minLen = Math.min(left.length, right.length);

  const out: NodeData = [];

  // Merge paired items
  for (let i = 0; i < minLen; i++) {
    out.push(mergeItemsByIndex(left[i], right[i], prefer));
  }

  if (!keepUnpaired) return out;

  // Add remaining unpaired items
  if (left.length > right.length) {
    for (let i = minLen; i < maxLen; i++) {
      out.push(cloneItem(left[i]));
    }
  } else if (right.length > left.length) {
    for (let i = minLen; i < maxLen; i++) {
      out.push(cloneItem(right[i]));
    }
  }

  return out;
}

export function executeMerge(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  // Support both:
  // - current single-stream contract (NodeData)
  // - future multi-input contract where input_data may be NodeData[]
  const rawInput = inputData as unknown as NodeDataLike;
  const streams = toStreams(rawInput);

  if (streams.length === 0) {
    return fail(
      "Merge node received invalid input. Expected NodeData or NodeData[] streams.",
      [],
    );
  }

  const parsed: MergeParameters = {
    mode: parameters["mode"],
    keepUnpaired: parameters["keepUnpaired"],
    keep_unpaired: parameters["keep_unpaired"],
    prefer: parameters["prefer"],
  };

  const mode = parseMode(parsed);
  const keepUnpaired = parseKeepUnpaired(parsed);
  const prefer = parsePrefer(parsed);

  if (mode === "append") {
    return ok(executeAppend(streams));
  }

  if (mode === "index") {
    return ok(executeIndexMerge(streams, keepUnpaired, prefer));
  }

  return fail(`Unsupported merge mode: ${String(mode)}`, streams[0] ?? []);
}
