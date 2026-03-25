import { z } from 'zod'

export const CredentialSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['http', 'oauth2', 'apiKey', 'basic', 'postgres', 'smtp']),
  data: z.record(z.string()),
})

export type CredentialInput = z.infer<typeof CredentialSchema>
