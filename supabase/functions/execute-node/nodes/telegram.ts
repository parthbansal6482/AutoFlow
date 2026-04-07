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

export async function executeTelegram(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const token = asString(
    credentialData?.["token"] ??
      credentialData?.["access_token"] ??
      credentialData?.["apiKey"],
  ).replace(/^Bearer\s+/i, "");
  const chatId = asString(parameters["chatId"]);
  const text =
    asString(parameters["text"]) ||
    asString(parameters["message"]) ||
    JSON.stringify(inputData[0]?.json ?? {});

  if (!token) return fail("Telegram node requires bot token credential.", inputData);
  if (!chatId) return fail("Telegram node requires chatId.", inputData);
  if (!text) return fail("Telegram node requires message text.", inputData);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || data["ok"] === false) {
      return fail(
        `Telegram API error: ${asString(data["description"]) || response.statusText}`,
        inputData,
      );
    }

    return ok([{ json: { ok: true, response: data } }]);
  } catch (err: unknown) {
    return fail(
      `Telegram request failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
