import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail, ok } from "../types.ts";

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function executeDiscord(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const channelCode = toText(parameters["channelCode"]).trim();
  const explicitMessage = toText(parameters["message"]).trim();

  const webhookUrl =
    toText(credentialData?.["webhook_url"] ?? credentialData?.["webhookUrl"] ?? credentialData?.["url"]).trim();
  const token =
    toText(
      credentialData?.["access_token"] ??
        credentialData?.["token"] ??
        credentialData?.["apiKey"],
    ).trim();

  const inferredMessage =
    explicitMessage ||
    toText(inputData[0]?.json?.["message"]).trim() ||
    JSON.stringify(inputData[0]?.json ?? {});
  const content = inferredMessage.slice(0, 1900);

  if (!content) {
    return fail("Discord node requires a message to send.", inputData);
  }

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const details = await response.text();
        return fail(
          `Discord webhook error (${response.status}): ${details || response.statusText}`,
          inputData,
        );
      }

      return ok([{ json: { ok: true, mode: "webhook", content } }]);
    }

    if (!token || !channelCode) {
      return fail(
        "Discord node requires either a webhook URL credential, or both bot token credential and channelCode.",
        inputData,
      );
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelCode)}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${token}`,
        },
        body: JSON.stringify({ content }),
      },
    );

    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return fail(
        `Discord API error (${response.status}): ${toText(body["message"]) || response.statusText}`,
        inputData,
      );
    }

    return ok([{ json: { ok: true, mode: "bot", message: body } }]);
  } catch (err: unknown) {
    return fail(
      `Discord request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
