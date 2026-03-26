import { describe, expect, it } from 'vitest';
import { clerkWebhookPrimaryEmail } from '@/app/lib/clerkWebhookUser';

describe('clerkWebhookPrimaryEmail', () => {
  it('prefers primary email when present', () => {
    const email = clerkWebhookPrimaryEmail({
      id: 'user_1',
      primary_email_address_id: 'em_primary',
      email_addresses: [
        { id: 'em_other', email_address: 'other@x.com' },
        { id: 'em_primary', email_address: 'main@x.com' },
      ],
    });
    expect(email).toBe('main@x.com');
  });

  it('falls back to first address', () => {
    const email = clerkWebhookPrimaryEmail({
      id: 'user_2',
      email_addresses: [{ id: 'em1', email_address: 'first@y.com' }],
    });
    expect(email).toBe('first@y.com');
  });

  it('uses placeholder when no email', () => {
    const email = clerkWebhookPrimaryEmail({ id: 'user_3' });
    expect(email).toBe('noemail+user_3@placeholder.local');
  });
});
