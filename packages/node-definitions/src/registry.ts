import type { NodeDefinition } from "@workflow/types";
import { httpRequestNode } from "./definitions/http-request";
import { webhookTriggerNode } from "./definitions/webhook-trigger";
import { cronTriggerNode } from "./definitions/cron-trigger";
import { ifNode } from "./definitions/if";
import { setNode } from "./definitions/set";
import { codeNode } from "./definitions/code";
import { switchNode } from "./definitions/switch";
import { mergeNode } from "./definitions/merge";
import { functionItemNode } from "./definitions/function-item";
import { editFieldsNode } from "./definitions/edit-fields";
import { filterNode } from "./definitions/filter";
import { sortNode } from "./definitions/sort";
import { aggregateNode } from "./definitions/aggregate";

export const nodeRegistry: Record<string, NodeDefinition> = {
  "http-request": httpRequestNode,
  "webhook-trigger": webhookTriggerNode,
  "cron-trigger": cronTriggerNode,
  if: ifNode,
  set: setNode,
  code: codeNode,
  switch: switchNode,
  merge: mergeNode,
  "function-item": functionItemNode,
  "edit-fields": editFieldsNode,
  filter: filterNode,
  sort: sortNode,
  aggregate: aggregateNode,
};

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeRegistry[type];
}
