// supabase/functions/execute-node/nodes/http-request.ts
// Executes an HTTP request node.
// Parameters: method, url, headers (JSON), body (JSON), authentication

interface HttpRequestParameters {
  method: string;
  url: string;
  headers?: string; // JSON string
  body?: string;    // JSON string
  authentication?: string; // 'none' | 'basicAuth' | 'headerAuth'
}

export interface NodeResult {
  output: unknown;
  error?: string;
}

export async function executeHttpRequest(
  parameters: Record<string, unknown>,
  _inputData: unknown,
  credentialData: Record<string, unknown> | null
): Promise<NodeResult> {
  const p = parameters as unknown as HttpRequestParameters;

  if (!p.url) {
    return { output: null, error: "url parameter is required" };
  }

  // Parse headers
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (p.headers) {
    try {
      const parsed = JSON.parse(p.headers) as Record<string, string>;
      headers = { ...headers, ...parsed };
    } catch {
      return { output: null, error: "headers must be valid JSON" };
    }
  }

  // Inject credential if present
  if (credentialData) {
    const authType = credentialData["type"] as string | undefined;

    if (authType === "headerAuth") {
      const headerName = credentialData["headerName"] as string ?? "Authorization";
      const headerValue = credentialData["headerValue"] as string ?? "";
      headers[headerName] = headerValue;
    } else if (authType === "basicAuth") {
      const username = credentialData["username"] as string ?? "";
      const password = credentialData["password"] as string ?? "";
      const encoded = btoa(`${username}:${password}`);
      headers["Authorization"] = `Basic ${encoded}`;
    } else if (authType === "apiKey") {
      const key = credentialData["key"] as string ?? "";
      const value = credentialData["value"] as string ?? "";
      headers[key] = value;
    }
  }

  // Build request init
  const method = (p.method ?? "GET").toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD" && p.body) {
    try {
      init.body = JSON.stringify(JSON.parse(p.body));
    } catch {
      init.body = p.body;
    }
  }

  try {
    const response = await fetch(p.url, init);
    const contentType = response.headers.get("content-type") ?? "";

    let responseBody: unknown;
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      },
    };
  } catch (err: unknown) {
    return {
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
