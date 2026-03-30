// supabase/functions/execute-node/nodes/http-request.ts
// HTTP Request node executor with:
// - expression-aware parameter resolution
// - auth normalization from credentials
// - timeout + retry support
// - pagination support
// - canonical NodeData output contract

import type {
  CredentialData,
  NodeData,
  NodeDataItem,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, isRecord, ok } from "../types.ts";
import { resolveParametersForItem } from "../utils/expressions.ts";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

type ResponseFormat = "auto" | "json" | "text" | "raw";

interface PaginationOptions {
  enabled?: unknown;
  type?: unknown; // "none" | "offset" | "page" | "cursor" | "link-header"
  max_pages?: unknown;
  page_param?: unknown;
  page_start?: unknown;
  page_size_param?: unknown;
  page_size?: unknown;
  offset_param?: unknown;
  offset_start?: unknown;
  offset_step?: unknown;
  cursor_param?: unknown;
  cursor_path?: unknown;
  has_more_path?: unknown;
  items_path?: unknown;
  response_items_path?: unknown;
  next_link_header?: unknown;
}

interface RetryOptions {
  enabled?: unknown;
  attempts?: unknown; // total attempts including first
  delay_ms?: unknown;
  backoff_factor?: unknown;
  retry_on_status?: unknown;
  retry_on_network_error?: unknown;
}

interface HttpRequestParameters {
  method?: unknown;
  url?: unknown;
  headers?: unknown;
  query?: unknown;
  body?: unknown;
  timeout_ms?: unknown;
  response_format?: unknown;
  authentication?: unknown; // "none" | "basic" | "bearer" | "apiKey" | ...
  retry?: unknown;
  pagination?: unknown;
}

interface NormalizedRetry {
  enabled: boolean;
  attempts: number;
  delayMs: number;
  backoffFactor: number;
  retryOnStatus: number[];
  retryOnNetworkError: boolean;
}

interface NormalizedPagination {
  enabled: boolean;
  type: "none" | "offset" | "page" | "cursor" | "link-header";
  maxPages: number;
  pageParam: string;
  pageStart: number;
  pageSizeParam: string;
  pageSize: number;
  offsetParam: string;
  offsetStart: number;
  offsetStep: number;
  cursorParam: string;
  cursorPath: string;
  hasMorePath: string;
  itemsPath: string;
  nextLinkHeader: string;
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = String(v);
  }
  return out;
}

function parseMaybeJsonRecord(value: unknown): Record<string, string> {
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      return toStringRecord(parsed);
    } catch {
      return {};
    }
  }
  return toStringRecord(value);
}

function parseQueryObject(
  value: unknown,
): Record<string, string | number | boolean> {
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      if (!isRecord(parsed)) return {};
      const out: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          out[k] = v;
        } else {
          out[k] = JSON.stringify(v);
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  if (!isRecord(value)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v;
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return out;
}

function buildUrlWithQuery(
  url: string,
  query: Record<string, string | number | boolean>,
): string {
  const u = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}

function getMethod(method: unknown): HttpMethod {
  const m = String(method ?? "GET").toUpperCase();
  if (
    m === "GET" ||
    m === "POST" ||
    m === "PUT" ||
    m === "PATCH" ||
    m === "DELETE" ||
    m === "HEAD"
  ) {
    return m;
  }
  return "GET";
}

function parseResponseFormat(value: unknown): ResponseFormat {
  if (
    value === "auto" ||
    value === "json" ||
    value === "text" ||
    value === "raw"
  ) {
    return value;
  }
  return "auto";
}

function normalizeBody(body: unknown): string | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return fallback;
}

function parseRetry(value: unknown): NormalizedRetry {
  const raw = isRecord(value) ? value : {};
  const enabled = parseBoolean(raw["enabled"], false);
  const attempts = Math.max(
    1,
    Math.min(10, Math.floor(parseNumber(raw["attempts"], 1))),
  );
  const delayMs = Math.max(0, Math.floor(parseNumber(raw["delay_ms"], 500)));
  const backoffFactor = Math.max(1, parseNumber(raw["backoff_factor"], 1.5));

  const retryOnStatusRaw = raw["retry_on_status"];
  let retryOnStatus: number[] = [429, 500, 502, 503, 504];
  if (Array.isArray(retryOnStatusRaw)) {
    retryOnStatus = retryOnStatusRaw
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 100 && v <= 599);
    if (retryOnStatus.length === 0) retryOnStatus = [429, 500, 502, 503, 504];
  }

  const retryOnNetworkError = parseBoolean(raw["retry_on_network_error"], true);

  return {
    enabled,
    attempts,
    delayMs,
    backoffFactor,
    retryOnStatus,
    retryOnNetworkError,
  };
}

function parsePagination(value: unknown): NormalizedPagination {
  const raw = isRecord(value) ? value : {};
  const enabled = parseBoolean(raw["enabled"], false);

  const typeRaw = String(raw["type"] ?? "none")
    .trim()
    .toLowerCase();
  const type =
    typeRaw === "offset" ||
    typeRaw === "page" ||
    typeRaw === "cursor" ||
    typeRaw === "link-header"
      ? typeRaw
      : "none";

  return {
    enabled,
    type,
    maxPages: Math.max(
      1,
      Math.min(100, Math.floor(parseNumber(raw["max_pages"], 1))),
    ),
    pageParam: String(raw["page_param"] ?? "page"),
    pageStart: Math.max(0, Math.floor(parseNumber(raw["page_start"], 1))),
    pageSizeParam: String(raw["page_size_param"] ?? "limit"),
    pageSize: Math.max(1, Math.floor(parseNumber(raw["page_size"], 50))),
    offsetParam: String(raw["offset_param"] ?? "offset"),
    offsetStart: Math.max(0, Math.floor(parseNumber(raw["offset_start"], 0))),
    offsetStep: Math.max(1, Math.floor(parseNumber(raw["offset_step"], 50))),
    cursorParam: String(raw["cursor_param"] ?? "cursor"),
    cursorPath: String(raw["cursor_path"] ?? "next_cursor"),
    hasMorePath: String(raw["has_more_path"] ?? "has_more"),
    itemsPath: String(raw["items_path"] ?? ""),
    nextLinkHeader: String(raw["next_link_header"] ?? "link"),
  };
}

function getByPath(root: unknown, path: string): unknown {
  if (!path) return root;
  const parts = path
    .trim()
    .replace(/^\./, "")
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let current: unknown = root;
  for (const part of parts) {
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length)
        return undefined;
      current = current[idx];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function parseLinkHeaderNext(headerValue: string): string | null {
  const links = headerValue.split(",");
  for (const link of links) {
    const sections = link.split(";");
    const urlPart = sections[0]?.trim();
    const relPart = sections.slice(1).join(";").toLowerCase();
    if (
      urlPart?.startsWith("<") &&
      urlPart.endsWith(">") &&
      relPart.includes('rel="next"')
    ) {
      return urlPart.slice(1, -1);
    }
  }
  return null;
}

function applyCredentialAuth(
  headers: Record<string, string>,
  query: Record<string, string | number | boolean>,
  credentialData: CredentialData,
  authTypeRaw: unknown,
): {
  headers: Record<string, string>;
  query: Record<string, string | number | boolean>;
} {
  if (!credentialData || !isRecord(credentialData)) {
    return { headers, query };
  }

  const authType = String(authTypeRaw ?? "")
    .trim()
    .toLowerCase();
  const nextHeaders = { ...headers };
  const nextQuery = { ...query };

  const username = credentialData["username"];
  const password = credentialData["password"];
  const accessToken = credentialData["access_token"] ?? credentialData["token"];
  const apiKeyName =
    credentialData["key"] ??
    credentialData["apiKeyName"] ??
    credentialData["name"];
  const apiKeyValue =
    credentialData["value"] ??
    credentialData["apiKey"] ??
    credentialData["secret"];
  const inLocation = String(credentialData["in"] ?? "header").toLowerCase();

  // Explicit auth selection first
  if (authType === "basic" || authType === "basicauth") {
    if (typeof username === "string" && typeof password === "string") {
      nextHeaders["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    }
    return { headers: nextHeaders, query: nextQuery };
  }

  if (authType === "bearer" || authType === "oauth2" || authType === "token") {
    if (typeof accessToken === "string" && accessToken.length > 0) {
      nextHeaders["Authorization"] = `Bearer ${accessToken}`;
    }
    return { headers: nextHeaders, query: nextQuery };
  }

  if (authType === "apikey" || authType === "api-key") {
    if (typeof apiKeyName === "string" && typeof apiKeyValue === "string") {
      if (inLocation === "query") {
        nextQuery[apiKeyName] = apiKeyValue;
      } else {
        nextHeaders[apiKeyName] = apiKeyValue;
      }
    }
    return { headers: nextHeaders, query: nextQuery };
  }

  // Auto-detect fallback
  if (typeof username === "string" && typeof password === "string") {
    nextHeaders["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    return { headers: nextHeaders, query: nextQuery };
  }

  if (typeof accessToken === "string" && accessToken.length > 0) {
    nextHeaders["Authorization"] = `Bearer ${accessToken}`;
    return { headers: nextHeaders, query: nextQuery };
  }

  if (typeof apiKeyName === "string" && typeof apiKeyValue === "string") {
    if (inLocation === "query") {
      nextQuery[apiKeyName] = apiKeyValue;
    } else {
      nextHeaders[apiKeyName] = apiKeyValue;
    }
  }

  return { headers: nextHeaders, query: nextQuery };
}

async function parseResponseBody(
  response: Response,
  responseFormat: ResponseFormat,
): Promise<unknown> {
  if (responseFormat === "raw") {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      base64: btoa(String.fromCharCode(...bytes)),
      size: bytes.byteLength,
    };
  }

  if (responseFormat === "json") {
    return await response.json();
  }

  if (responseFormat === "text") {
    return await response.text();
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retry: NormalizedRetry,
): Promise<Response> {
  let attempt = 0;
  let delay = retry.delayMs;
  let lastError: unknown = null;

  const totalAttempts = retry.enabled ? retry.attempts : 1;

  while (attempt < totalAttempts) {
    attempt += 1;
    try {
      const response = await fetch(url, init);

      if (
        retry.enabled &&
        attempt < totalAttempts &&
        retry.retryOnStatus.includes(response.status)
      ) {
        await sleep(delay);
        delay = Math.floor(delay * retry.backoffFactor);
        continue;
      }

      return response;
    } catch (err: unknown) {
      lastError = err;
      if (
        !retry.enabled ||
        !retry.retryOnNetworkError ||
        attempt >= totalAttempts
      ) {
        throw err;
      }
      await sleep(delay);
      delay = Math.floor(delay * retry.backoffFactor);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("HTTP request failed");
}

function makeBaseItem(
  requestMeta: Record<string, unknown>,
  responseMeta: Record<string, unknown>,
): NodeDataItem {
  return {
    json: {
      request: requestMeta,
      response: responseMeta,
    },
  };
}

function extractItemsFromResponse(
  body: unknown,
  itemsPath: string,
): NodeDataItem[] {
  const source = itemsPath ? getByPath(body, itemsPath) : body;

  if (Array.isArray(source)) {
    return source.map((entry) => ({
      json: isRecord(entry) ? entry : { value: entry },
    }));
  }

  if (isRecord(source)) {
    return [{ json: source }];
  }

  return [{ json: { value: source } }];
}

function parseParams(parameters: NodeParameters): HttpRequestParameters {
  return {
    method: parameters["method"],
    url: parameters["url"],
    headers: parameters["headers"],
    query: parameters["query"],
    body: parameters["body"],
    timeout_ms: parameters["timeout_ms"],
    response_format: parameters["response_format"],
    authentication: parameters["authentication"],
    retry: parameters["retry"],
    pagination: parameters["pagination"],
  };
}

export async function executeHttpRequest(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  // Request is executed once per first input item context for now.
  // Expression resolution is still item-aware; this keeps behavior deterministic.
  const resolved = resolveParametersForItem(
    parameters,
    inputData,
    0,
    credentialData,
  );

  const p = parseParams(resolved);

  const urlRaw = typeof p.url === "string" ? p.url.trim() : "";
  if (!urlRaw) {
    return fail("url parameter is required", inputData);
  }

  let baseUrl: string;
  try {
    baseUrl = new URL(urlRaw).toString();
  } catch {
    return fail("url must be a valid absolute URL", inputData);
  }

  const method = getMethod(p.method);
  const responseFormat = parseResponseFormat(p.response_format);

  const query = parseQueryObject(p.query);
  const headersInput = parseMaybeJsonRecord(p.headers);
  const body = normalizeBody(p.body);

  const timeoutMs = Math.max(1, Math.floor(parseNumber(p.timeout_ms, 30_000)));
  const retry = parseRetry(p.retry);
  const pagination = parsePagination(p.pagination);

  const headersWithDefault: Record<string, string> = { ...headersInput };
  if (
    body &&
    method !== "GET" &&
    method !== "HEAD" &&
    !headersWithDefault["Content-Type"]
  ) {
    headersWithDefault["Content-Type"] = "application/json";
  }

  const authApplied = applyCredentialAuth(
    headersWithDefault,
    query,
    credentialData,
    p.authentication,
  );

  const baseRequestMeta = {
    method,
    url: baseUrl,
    timeout_ms: timeoutMs,
    retry,
    pagination,
  };

  const outputItems: NodeData = [];
  let currentPage = 0;
  let page = pagination.pageStart;
  let offset = pagination.offsetStart;
  let cursor: string | null = null;
  let nextUrl: string | null = null;
  let hasMore = true;
  let lastResponseStatus = 0;
  let lastResponseText = "";

  while (hasMore) {
    currentPage += 1;
    if (!pagination.enabled || pagination.type === "none") {
      hasMore = false; // single iteration unless toggled later
    }
    if (currentPage > pagination.maxPages) break;

    let pageQuery = { ...authApplied.query };

    if (pagination.enabled) {
      if (pagination.type === "page") {
        pageQuery[pagination.pageParam] = page;
        pageQuery[pagination.pageSizeParam] = pagination.pageSize;
      } else if (pagination.type === "offset") {
        pageQuery[pagination.offsetParam] = offset;
        pageQuery[pagination.pageSizeParam] = pagination.pageSize;
      } else if (pagination.type === "cursor" && cursor) {
        pageQuery[pagination.cursorParam] = cursor;
      }
    }

    const finalUrl = nextUrl ?? buildUrlWithQuery(baseUrl, pageQuery);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const init: RequestInit = {
        method,
        headers: authApplied.headers,
        signal: abortController.signal,
      };

      if (body && method !== "GET" && method !== "HEAD") {
        init.body = body;
      }

      const response = await fetchWithRetry(finalUrl, init, retry);
      lastResponseStatus = response.status;
      lastResponseText = response.statusText;

      const responseBody = await parseResponseBody(response, responseFormat);

      const responseMeta = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        page: currentPage,
      };

      // Return error immediately for non-ok in non-retry final result
      if (!response.ok) {
        const item = makeBaseItem(
          {
            ...baseRequestMeta,
            final_url: finalUrl,
            query: pageQuery,
            headers: authApplied.headers,
          },
          responseMeta as Record<string, unknown>,
        );
        return fail(`HTTP ${response.status}: ${response.statusText}`, [item]);
      }

      // Item extraction
      const extracted = extractItemsFromResponse(
        responseBody,
        pagination.itemsPath,
      );
      outputItems.push(...extracted);

      // Pagination progression
      if (!pagination.enabled || pagination.type === "none") {
        break;
      }

      if (pagination.type === "page") {
        page += 1;
        if (extracted.length < pagination.pageSize) break;
        continue;
      }

      if (pagination.type === "offset") {
        offset += pagination.offsetStep;
        if (extracted.length < pagination.offsetStep) break;
        continue;
      }

      if (pagination.type === "cursor") {
        const nextCursor = getByPath(responseBody, pagination.cursorPath);
        const more = getByPath(responseBody, pagination.hasMorePath);
        cursor =
          typeof nextCursor === "string" && nextCursor.length > 0
            ? nextCursor
            : null;
        const hasMoreFlag = typeof more === "boolean" ? more : cursor !== null;
        if (!hasMoreFlag) break;
        continue;
      }

      if (pagination.type === "link-header") {
        const linkHeader = response.headers.get(pagination.nextLinkHeader);
        if (!linkHeader) break;
        const next = parseLinkHeaderNext(linkHeader);
        if (!next) break;
        nextUrl = next;
        continue;
      }

      break;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(`HTTP request failed: ${message}`, inputData);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (outputItems.length === 0) {
    // Produce at least one envelope item for observability
    const fallbackItem: NodeDataItem = {
      json: {
        request: {
          ...baseRequestMeta,
          headers: authApplied.headers,
          query: authApplied.query,
        },
        response: {
          status: lastResponseStatus,
          statusText: lastResponseText,
        },
      },
    };
    return ok([fallbackItem]);
  }

  return ok(outputItems);
}
