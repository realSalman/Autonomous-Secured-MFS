import { WebhookEvent } from "@shared/enums/webhook-event.enum";

export interface RegisterWebhookDto {
  url: string;
  events: WebhookEvent[];
  tenantId?: string;
  secret?: string;
  maxRetries?: number;
  timeoutMs?: number;
}
