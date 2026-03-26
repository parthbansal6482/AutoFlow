// supabase/functions/execute-node/nodes/code.ts
// Executes user-provided JavaScript code in a sandboxed Deno context.
// The code receives `$input` with helpers and must return a value.
// Parameters: code — a string of JavaScript

export interface NodeResult {
  output: unknown;
  error?: string;
}

interface CodeParameters {
  code: string;
}

/**
 * $input helper exposed to user code.
 * Mirrors a minimal subset of n8n's $input API.
 */
function makeInputHelper(data: unknown) {
  return {
    /** Returns the raw input data */
    all: () => data,
    /** Returns the first item if data is an array, otherwise the data itself */
    first: () => (Array.isArray(data) ? data[0] : data),
    /** Returns the last item if data is an array */
    last: () => (Array.isArray(data) ? data[data.length - 1] : data),
    /** Returns the number of items */
    length: Array.isArray(data) ? data.length : 1,
    /** The raw data */
    data,
  };
}

export async function executeCode(
  parameters: Record<string, unknown>,
  inputData: unknown,
  _credentialData: Record<string, unknown> | null
): Promise<NodeResult> {
  const p = parameters as unknown as CodeParameters;

  if (!p.code) {
    return { output: null, error: "code parameter is required" };
  }

  try {
    // Wrap user code in an async IIFE so they can use await and bare returns.
    // We expose $input as a variable in the function scope.
    const wrappedCode = `
      const $input = __inputHelper;
      (async () => {
        ${p.code}
      })()
    `;

    // Use the Function constructor to create a sandboxed scope.
    // Note: this is not a true security sandbox — user code runs in the same
    // Deno process. For production, consider Deno subprocess isolation.
    const fn = new Function("__inputHelper", `return ${wrappedCode}`);
    const result = await fn(makeInputHelper(inputData));

    return { output: result ?? null };
  } catch (err: unknown) {
    return {
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
