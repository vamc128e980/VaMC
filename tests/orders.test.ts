import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placeOrderSchema,
  settleSessionSchema,
  claimRewardSchema,
  counterSaleSchema,
} from '../src/lib/validation';

test('order schema rejects tampered negative quantities and invalid UUIDs', () => {
  const badQty = placeOrderSchema.safeParse({
    table_number: 2,
    items: [{ menu_item_id: 'not-a-uuid', quantity: -1 }],
  });
  assert.equal(badQty.success, false);

  const validOrder = placeOrderSchema.safeParse({
    table_number: 2,
    source: 'qr',
    items: [
      {
        menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
        cooking_notes: 'Less spicy',
      },
    ],
  });
  assert.equal(validOrder.success, true);
});

test('settlement and reward claim schemas enforce required fields', () => {
  assert.equal(
    settleSessionSchema.safeParse({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      payment_mode: 'upi',
    }).success,
    true,
  );

  assert.equal(
    claimRewardSchema.safeParse({
      phone: '9876543210',
    }).success,
    true,
  );
});

test('counter sale schema matches table_number 0 items payload', () => {
  const parsed = counterSaleSchema.safeParse({
    payment_mode: 'cash',
    items: [{ name: 'Masala Chai', quantity: 2, unit_price: 20 }],
  });
  assert.equal(parsed.success, true);
});
