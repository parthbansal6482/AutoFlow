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

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function executeEmail(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const to = asString(parameters["to"]);
  const subject = asString(parameters["subject"]) || "Workflow Email";
  const body = asString(parameters["body"]) || JSON.stringify(inputData[0]?.json ?? {});
  const accessToken = asString(
    credentialData?.["access_token"] ?? credentialData?.["token"],
  );

  if (!accessToken) {
    return fail("Email node requires a Google OAuth access token credential.", inputData);
  }
  if (!to) {
    return fail("Email node requires a recipient in 'to'.", inputData);
  }

  const rawMessage = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body,
  ].join("\r\n");

  try {
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          raw: toBase64Url(rawMessage),
        }),
      },
    );

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        response.statusText;
      return fail(`Gmail API error: ${String(message)}`, inputData);
    }

    return ok([{ json: { ok: true, provider: "gmail", response: data } }]);
  } catch (err: unknown) {
    return fail(
      `Email request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
