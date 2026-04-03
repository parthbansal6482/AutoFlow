import { NodeData, NodeParameters, NodeResult, ok } from "../types.ts";

/**
 * Wait Node: Pauses execution for a specified duration.
 */
export async function executeWait(
  parameters: NodeParameters,
  inputData: NodeData
): Promise<NodeResult> {
  const duration = Number(parameters.duration) || 1;
  const unit = (parameters.unit as string) || "seconds";

  let ms = duration * 1000;
  if (unit === "minutes") ms = duration * 60 * 1000;
  if (unit === "hours") ms = duration * 60 * 60 * 1000;

  console.log(`Waiting for ${duration} ${unit} (${ms}ms)...`);
  
  await new Promise((resolve) => setTimeout(resolve, ms));

  return ok(inputData);
}
