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

export async function executeGoogleCalendar(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const calendarId = asString(parameters["calendarId"]) || "primary";
  const eventText = asString(parameters["event"]);
  const accessToken = asString(
    credentialData?.["access_token"] ?? credentialData?.["token"],
  );

  if (!accessToken) {
    return fail(
      "Google Calendar node requires a Google OAuth access token credential.",
      inputData,
    );
  }

  const now = Date.now();
  const startIso = new Date(now + 5 * 60 * 1000).toISOString();
  const endIso = new Date(now + 35 * 60 * 1000).toISOString();

  const summary =
    eventText || asString(inputData[0]?.json?.["title"]) || "Workflow Calendar Event";

  const body = {
    summary,
    description: asString(inputData[0]?.json?.["description"]) || undefined,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId,
  )}/events`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        response.statusText;
      return fail(`Google Calendar API error: ${String(message)}`, inputData);
    }

    return ok([{ json: { ok: true, event: data } }]);
  } catch (err: unknown) {
    return fail(
      `Google Calendar request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
