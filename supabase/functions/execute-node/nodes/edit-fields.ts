// supabase/functions/execute-node/nodes/edit-fields.ts
// Edit Fields node executor
//
// Aligned with node definition parameters:
// - mode: "manual" | "keepOnly" | "remove"
// - set: object map of fields to set/replace
// - rename: object map { oldName: newName }
// - keep: array of field names to keep (for keepOnly mode)
// - remove: array of field names to remove (for remove mode)
// - strict: boolean (fail on missing fields in keep/remove/rename)

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";

type EditMode = "manual" | "keepOnly" | "remove";

interface EditFieldsParameters {
  mode?: unknown;
  set?: unknown;
  rename?: unknown;
  keep?: unknown;
  remove?: unknown;
  strict?: unknown;
}

// ---------- parsing helpers ----------

function parseMode(raw: unknown): EditMode {
  if (typeof raw !== "string") return "manual";
  const mode = raw.trim();
  if (mode === "manual" || mode === "keepOnly" || mode === "remove")
    return mode;
  return "manual";
}

function parseStrict(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : false;
}

function parseObjectMap(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0);
      }
    } catch {
      // fall through to comma-separated fallback
    }

    return s
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  return [];
}

function parseRenameMap(value: unknown): Record<string, string> {
  const raw = parseObjectMap(value);
  const out: Record<string, string> = {};

  for (const [from, to] of Object.entries(raw)) {
    if (!from.trim()) continue;
    if (typeof to !== "string") continue;
    const toTrim = to.trim();
    if (!toTrim) continue;
    out[from] = toTrim;
  }

  return out;
}

// ---------- transform helpers ----------

function cloneItem(item: NodeDataItem): NodeDataItem {
  return {
    json: { ...item.json },
    ...(item.binary ? { binary: { ...item.binary } } : {}),
  };
}

function applySet(
  json: Record<string, unknown>,
  setMap: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(setMap).length === 0) return { ...json };
  return { ...json, ...setMap };
}

function applyRename(
  json: Record<string, unknown>,
  renameMap: Record<string, string>,
): { json: Record<string, unknown>; missing: string[] } {
  if (Object.keys(renameMap).length === 0)
    return { json: { ...json }, missing: [] };

  const missing: string[] = [];
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(json)) {
    const nextKey = renameMap[key] ?? key;
    out[nextKey] = value;
  }

  for (const from of Object.keys(renameMap)) {
    if (!(from in json)) missing.push(from);
  }

  return { json: out, missing };
}

function applyKeep(
  json: Record<string, unknown>,
  keepFields: string[],
): { json: Record<string, unknown>; missing: string[] } {
  if (keepFields.length === 0) return { json: {}, missing: [] };

  const keepSet = new Set(keepFields);
  const out: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const name of keepFields) {
    if (!(name in json)) missing.push(name);
  }

  for (const [k, v] of Object.entries(json)) {
    if (keepSet.has(k)) out[k] = v;
  }

  return { json: out, missing };
}

function applyRemove(
  json: Record<string, unknown>,
  removeFields: string[],
): { json: Record<string, unknown>; missing: string[] } {
  if (removeFields.length === 0) return { json: { ...json }, missing: [] };

  const removeSet = new Set(removeFields);
  const out: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const name of removeFields) {
    if (!(name in json)) missing.push(name);
  }

  for (const [k, v] of Object.entries(json)) {
    if (!removeSet.has(k)) out[k] = v;
  }

  return { json: out, missing };
}

// ---------- main executor ----------

export function executeEditFields(
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const p: EditFieldsParameters = {
    mode: parameters["mode"],
    set: parameters["set"],
    rename: parameters["rename"],
    keep: parameters["keep"],
    remove: parameters["remove"],
    strict: parameters["strict"],
  };

  const mode = parseMode(p.mode);
  const strict = parseStrict(p.strict);

  const setMap = parseObjectMap(p.set);
  const renameMap = parseRenameMap(p.rename);
  const keepFields = parseStringArray(p.keep);
  const removeFields = parseStringArray(p.remove);

  const output: NodeData = [];
  const strictErrors: string[] = [];

  for (let i = 0; i < inputData.length; i++) {
    const original = inputData[i];
    const item = cloneItem(original);
    let nextJson: Record<string, unknown> = { ...item.json };

    // manual mode: set + rename together
    if (mode === "manual") {
      nextJson = applySet(nextJson, setMap);

      const renamed = applyRename(nextJson, renameMap);
      nextJson = renamed.json;

      if (strict && renamed.missing.length > 0) {
        strictErrors.push(
          `Item ${i}: rename source field(s) not found: ${renamed.missing.join(", ")}`,
        );
      }
    }

    // keepOnly mode: keep list only
    if (mode === "keepOnly") {
      const kept = applyKeep(nextJson, keepFields);
      nextJson = kept.json;

      if (strict && kept.missing.length > 0) {
        strictErrors.push(
          `Item ${i}: keep field(s) not found: ${kept.missing.join(", ")}`,
        );
      }
    }

    // remove mode: remove listed fields
    if (mode === "remove") {
      const removed = applyRemove(nextJson, removeFields);
      nextJson = removed.json;

      if (strict && removed.missing.length > 0) {
        strictErrors.push(
          `Item ${i}: remove field(s) not found: ${removed.missing.join(", ")}`,
        );
      }
    }

    output.push({
      ...item,
      json: nextJson,
    });
  }

  if (strict && strictErrors.length > 0) {
    return fail(
      `Edit Fields strict mode validation failed: ${strictErrors.join(" | ")}`,
      inputData,
    );
  }

  return ok(output);
}
