import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, ok } from "../types.ts";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toRowValues(item: Record<string, unknown>): unknown[] {
  return Object.values(item);
}

export async function executeGoogleSheets(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const spreadsheetId = asString(parameters["spreadsheetId"]);
  const range = asString(parameters["range"]) || "Sheet1!A1";
  const accessToken = asString(
    credentialData?.["access_token"] ?? credentialData?.["token"],
  );

  if (!accessToken) {
    return fail(
      "Google Sheets node requires a Google OAuth access token credential.",
      inputData,
    );
  }
  if (!spreadsheetId) {
    return fail("Google Sheets node requires spreadsheetId.", inputData);
  }

  const values =
    inputData.length > 0
      ? inputData.map((item) => toRowValues(item.json))
      : [[]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ values }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        response.statusText;
      return fail(`Google Sheets API error: ${String(message)}`, inputData);
    }

    return ok([{ json: { ok: true, appended_rows: values.length, response: data } }]);
  } catch (err: unknown) {
    return fail(
      `Google Sheets request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
