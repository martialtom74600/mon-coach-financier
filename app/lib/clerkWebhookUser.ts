/** Corps utilisateur Clerk tel que reçu dans les webhooks `user.*`. */
export interface ClerkWebhookUserBody {
  id: string;
  first_name?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string | null;
}

export function clerkWebhookPrimaryEmail(data: ClerkWebhookUserBody): string {
  const list = data.email_addresses ?? [];
  const primaryId = data.primary_email_address_id;
  if (primaryId) {
    const found = list.find((e) => e.id === primaryId);
    if (found?.email_address) return found.email_address.trim();
  }
  const first = list[0]?.email_address?.trim();
  if (first) return first;
  return `noemail+${data.id}@placeholder.local`;
}
