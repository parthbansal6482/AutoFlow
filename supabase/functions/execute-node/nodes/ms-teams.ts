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

export async function executeMsTeams(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const webhookUrl = asString(
    credentialData?.["webhook_url"] ??
      credentialData?.["webhookUrl"] ??
      credentialData?.["url"],
  );
  const message =
    asString(parameters["message"]) || JSON.stringify(inputData[0]?.json ?? {});

  if (!webhookUrl) {
    return fail(
      "MS Teams node requires an incoming webhook URL in credentials (webhook_url/url).",
      inputData,
    );
  }
  if (!message) {
    return fail("MS Teams node requires a message.", inputData);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const details = await response.text();
      return fail(
        `MS Teams webhook error (${response.status}): ${details || response.statusText}`,
        inputData,
      );
    }

    return ok([{ json: { ok: true } }]);
  } catch (err: unknown) {
    return fail(
      `MS Teams request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
