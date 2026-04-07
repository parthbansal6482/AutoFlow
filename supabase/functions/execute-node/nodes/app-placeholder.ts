import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "../types.ts";
import { fail } from "../types.ts";

export function executeAppPlaceholder(
  nodeType: string,
  parameters: NodeParameters,
  inputData: NodeData,
  _credentialData: CredentialData,
): NodeResult {
  const configuredKeys = Object.keys(parameters);
  const configHint =
    configuredKeys.length > 0
      ? `Configured parameters: ${configuredKeys.join(", ")}.`
      : "No parameters configured.";

  return fail(
    `${nodeType} backend is not implemented yet. ${configHint} Use HTTP Request for full API control until dedicated support is added.`,
    inputData,
  );
}
