import { 
  NodeData, 
  NodeParameters, 
  NodeResult, 
  CredentialData, 
  ok, 
  fail 
} from "../types.ts";

/**
 * Sends a message to a Slack channel.
 * Parameters:
 * - channel: string (Channel ID or name, e.g. C12345)
 * - message: string (Text to send)
 */
export async function executeSlack(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData
): Promise<NodeResult> {
  const channel = (parameters.channel as string) || "";
  const textTemplate = (parameters.message as string) || "";
  const token = (credentialData?.access_token as string) || (credentialData?.token as string);

  if (!token) {
    return fail("Missing Slack Access Token in credentials.", inputData);
  }

  if (!channel) {
    return fail("Channel is required for Slack node.", inputData);
  }

  if (!textTemplate) {
    return fail("Message text is required for Slack node.", inputData);
  }

  // Template resolution
  let text = textTemplate;
  const firstItem = inputData[0]?.json || {};
  text = text.replace(/\{\{\s*\$input\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let val: any = firstItem;
    for (const part of parts) {
      val = val?.[part];
    }
    return String(val ?? "");
  });

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return fail(`Slack API error: ${data.error}`, inputData);
    }

    return ok([{
      json: {
        ok: true,
        channel: data.channel,
        ts: data.ts,
        message: data.message
      }
    }]);
  } catch (err: unknown) {
    return fail(`Failed to connect to Slack: ${err instanceof Error ? err.message : String(err)}`, inputData);
  }
}
