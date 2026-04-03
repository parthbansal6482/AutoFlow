import { 
  NodeData, 
  NodeParameters, 
  NodeResult, 
  CredentialData, 
  ok, 
  fail 
} from "../types.ts";

/**
 * Executes a chat completion request to Anthropic (Claude).
 * Parameters:
 * - model: string (e.g. claude-3-5-sonnet)
 * - prompt: string (instruction for the model)
 */
export async function executeAnthropic(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData
): Promise<NodeResult> {
  const model = (parameters.model as string) || "claude-3-5-sonnet-20240620";
  const promptTemplate = (parameters.prompt as string) || "";
  const apiKey =
    (credentialData?.apiKey as string) ||
    (credentialData?.api_key as string) ||
    (credentialData?.key as string) ||
    (credentialData?.Authorization as string || credentialData?.authorization as string || "")
      .replace(/^Bearer\s+/i, "").trim() ||
    undefined;

  if (!apiKey) {
    return fail(
      "Missing Anthropic API Key in credentials. Create an Anthropic credential with key name 'apiKey' and your sk-ant-… key as the value.",
      inputData
    );
  }

  if (!promptTemplate) {
    return fail("Prompt is required for Anthropic node.", inputData);
  }

  // Template resolution
  let finalPrompt = promptTemplate;
  const firstItem = inputData[0]?.json || {};
  finalPrompt = finalPrompt.replace(/\{\{\s*\$input\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let val: any = firstItem;
    for (const part of parts) {
      val = val?.[part];
    }
    return String(val ?? "");
  });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return fail(`Anthropic API error: ${errorData.error?.message || response.statusText}`, inputData);
    }

    const data = await response.json();
    const completion = data.content?.[0]?.text;

    return ok([{
      json: {
        text: completion,
        model,
        role: data.role,
        usage: data.usage
      }
    }]);
  } catch (err: unknown) {
    return fail(`Failed to connect to Anthropic: ${err instanceof Error ? err.message : String(err)}`, inputData);
  }
}
