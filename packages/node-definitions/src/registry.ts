import type { NodeDefinition } from '@workflow/types'
import { httpRequestNode } from './definitions/http-request'
import { webhookTriggerNode } from './definitions/webhook-trigger'
import { cronTriggerNode } from './definitions/cron-trigger'
import { ifNode } from './definitions/if'
import { setNode } from './definitions/set'
import { codeNode } from './definitions/code'

export const nodeRegistry: Record<string, NodeDefinition> = {
  'http-request': httpRequestNode,
  'webhook-trigger': webhookTriggerNode,
  'cron-trigger': cronTriggerNode,
  'if': ifNode,
  'set': setNode,
  'code': codeNode,
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeRegistry[type]
}
