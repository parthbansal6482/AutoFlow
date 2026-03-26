// supabase/functions/execute-node/nodes/set.ts
// Sets, updates, or removes fields on the input data item.
// Parameters: fields — JSON string of key:value pairs to merge onto the input data.

export interface NodeResult {
  output: unknown;
  error?: string;
}

interface SetParameters {
  fields: string; // JSON string: { "key": "value", ... }
}

export function executeSet(
  parameters: Record<string, unknown>,
  inputData: unknown,
  _credentialData: Record<string, unknown> | null
): NodeResult {
  const p = parameters as unknown as SetParameters;

  if (!p.fields) {
    return { output: inputData, error: "fields parameter is required" };
  }

  let fieldsToSet: Record<string, unknown>;
  try {
    fieldsToSet = JSON.parse(p.fields) as Record<string, unknown>;
  } catch {
    return { output: null, error: "fields must be a valid JSON object string" };
  }

  // Deep merge: if inputData is an object, spread it and override with new fields.
  // If inputData is not an object (e.g. a string), wrap it and add fields alongside.
  if (inputData !== null && typeof inputData === "object" && !Array.isArray(inputData)) {
    return {
      output: { ...(inputData as Record<string, unknown>), ...fieldsToSet },
    };
  }

  if (Array.isArray(inputData)) {
    // Apply the fields to every item in the array
    return {
      output: (inputData as unknown[]).map((item) => {
        if (item !== null && typeof item === "object") {
          return { ...(item as Record<string, unknown>), ...fieldsToSet };
        }
        return item;
      }),
    };
  }

  // Scalar input — wrap in object
  return {
    output: { _value: inputData, ...fieldsToSet },
  };
}
