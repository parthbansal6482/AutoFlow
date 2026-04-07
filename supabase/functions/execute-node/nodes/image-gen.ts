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

export async function executeImageGen(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  const prompt =
    asString(parameters["prompt"]) || asString(inputData[0]?.json?.["prompt"]);
  const size = asString(parameters["size"]) || "1024x1024";
  const model = asString(parameters["provider"]) || "gpt-image-1";
  const apiKey = asString(
    credentialData?.["apiKey"] ??
      credentialData?.["api_key"] ??
      credentialData?.["key"] ??
      credentialData?.["access_token"] ??
      credentialData?.["token"],
  ).replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    return fail("Image Gen node requires an API key credential.", inputData);
  }
  if (!prompt) {
    return fail("Image Gen node requires a prompt.", inputData);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (data?.error as Record<string, unknown> | undefined)?.message ??
        response.statusText;
      return fail(`Image API error: ${String(message)}`, inputData);
    }

    const image = (data["data"] as Array<Record<string, unknown>> | undefined)?.[0];
    return ok([
      {
        json: {
          ok: true,
          prompt,
          image_url: image?.["url"] ?? null,
          b64_json: image?.["b64_json"] ?? null,
          response: data,
        },
      },
    ]);
  } catch (err: unknown) {
    return fail(
      `Image generation failed: ${err instanceof Error ? err.message : String(err)}`,
      inputData,
    );
  }
}
