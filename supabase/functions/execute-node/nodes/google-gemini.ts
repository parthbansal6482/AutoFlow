import { 
  NodeData, 
  NodeParameters, 
  NodeResult, 
  CredentialData, 
  ok, 
  fail 
} from "../types.ts";

/**
 * Executes a request to Google Gemini API.
 */
export async function executeGemini(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData
): Promise<NodeResult> {
  const model = (parameters.model as string) || "gemini-2.5-flash";
  const promptTemplate = (parameters.prompt as string) || "";
  
  // Accept all common field names a user might type in the credential form.
  // Priority: apiKey > api_key > key > access_token > token > Authorization (Bearer stripped)
  const rawApiKey =
    (credentialData?.apiKey as string) ||
    (credentialData?.api_key as string) ||
    (credentialData?.key as string);

  const rawAccessToken =
    (credentialData?.access_token as string) ||
    (credentialData?.token as string) ||
    (credentialData?.Authorization as string ||
      credentialData?.authorization as string ||
      "").replace(/^Bearer\s+/i, "").trim() || undefined;

  const apiKey = rawApiKey || undefined;
  const accessToken = (!rawApiKey && rawAccessToken) ? rawAccessToken : undefined;

  if (!apiKey && !accessToken) {
    return fail(
      "Missing Google API Key in credentials. Create a Google credential with key name 'apiKey' and your Gemini API key as the value.",
      inputData
    );
  }

  if (!promptTemplate) {
    return fail("Prompt is required for Gemini node.", inputData);
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
    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    const url = `${baseUrl}/${model}:generateContent${apiKey ? `?key=${apiKey}` : ''}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: finalPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const msg = Array.isArray(errorData) ? errorData[0]?.error?.message : errorData.error?.message;
      return fail(`Gemini API error: ${msg || response.statusText}`, inputData);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      return fail("Gemini returned an empty response.", inputData);
    }

    return ok([{
      json: {
        text,
        model,
        finishReason: candidate?.finishReason,
        usage: data.usageMetadata
      }
    }]);
  } catch (err: unknown) {
    return fail(`Failed to connect to Gemini: ${err instanceof Error ? err.message : String(err)}`, inputData);
  }
}
