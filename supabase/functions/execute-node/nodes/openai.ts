import { 
  NodeData, 
  NodeParameters, 
  NodeResult, 
  CredentialData, 
  ok, 
  fail 
} from "../types.ts";

/**
 * Executes a chat completion request to OpenAI.
 * Parameters:
 * - model: string (e.g. gpt-4o)
 * - prompt: string (instruction for the model)
 */
export async function executeOpenAI(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData
): Promise<NodeResult> {
  const model = (parameters.model as string) || "gpt-4o";
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
      "Missing OpenAI API Key in credentials. Create an OpenAI credential with key name 'apiKey' and your sk-… key as the value.",
      inputData
    );
  }

  if (!promptTemplate) {
    return fail("Prompt is required for OpenAI node.", inputData);
  }

  // Simple template resolution: replace {{ $input.property }} with values from first item
  let finalPrompt = promptTemplate;
  const firstItem = inputData[0]?.json || {};
  
  // Basic regex for {{ $input.prop }}
  finalPrompt = finalPrompt.replace(/\{\{\s*\$input\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let val: any = firstItem;
    for (const part of parts) {
      val = val?.[part];
    }
    return String(val ?? "");
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant integrated into a workflow automation tool." },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return fail(`OpenAI API error: ${errorData.error?.message || response.statusText}`, inputData);
    }

    const data = await response.json();
    const completion = data.choices?.[0]?.message?.content;

    return ok([{
      json: {
        text: completion,
        model,
        usage: data.usage
      }
    }]);
  } catch (err: unknown) {
    return fail(`Failed to connect to OpenAI: ${err instanceof Error ? err.message : String(err)}`, inputData);
  }
}
