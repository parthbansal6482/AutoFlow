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

function toBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function executeWhatsApp(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const to = asString(parameters["to"]);
  const message =
    asString(parameters["message"]) || JSON.stringify(inputData[0]?.json ?? {});

  const accountSid = asString(
    credentialData?.["accountSid"] ?? credentialData?.["account_sid"],
  );
  const authToken = asString(
    credentialData?.["authToken"] ?? credentialData?.["auth_token"],
  );
  const fromNumber = asString(
    credentialData?.["from"] ?? credentialData?.["from_number"],
  );

  if (!accountSid || !authToken || !fromNumber) {
    return fail(
      "WhatsApp node requires Twilio credentials: accountSid, authToken, and from.",
      inputData,
    );
  }
  if (!to || !message) {
    return fail("WhatsApp node requires both 'to' and 'message'.", inputData);
  }

  const body = new URLSearchParams({
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    From: fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`,
    Body: message,
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${toBasicAuth(accountSid, authToken)}`,
        },
        body: body.toString(),
      },
    );

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return fail(
        `Twilio API error: ${asString(data["message"]) || response.statusText}`,
        inputData,
      );
    }

    return ok([{ json: { ok: true, provider: "twilio", message: data } }]);
  } catch (err: unknown) {
    return fail(
      `WhatsApp request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
