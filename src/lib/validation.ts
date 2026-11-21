import { z } from 'zod';

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_\\]/g, '\\$&');
}

const menuItemIdSchema = z
  .union([
    z.string().trim().min(1).max(128),
    z.number().int().positive(),
  ])
  .transform((val) => String(val));

export const orderItemInputSchema = z.object({
  menu_item_id: menuItemIdSchema,
  quantity: z.number().int().min(1).max(50),
  cooking_notes: z.string().max(240).optional().nullable(),
});

export const placeOrderSchema = z.object({
  table_number: z.number().int().min(1).max(500),
  session_id: z.string().trim().min(1).max(128).optional().nullable(),
  source: z.enum(['qr', 'waiter']).optional().default('qr'),
  customer_name: z.string().trim().max(120).optional().nullable(),
  customer_phone: z.string().trim().max(32).optional().nullable(),
  items: z.array(orderItemInputSchema).min(1).max(60),
});

export const settleSessionSchema = z.object({
  session_id: z.string().trim().min(1).max(128),
  payment_mode: z.enum(['cash', 'upi', 'card']),
  customer_phone: z.string().trim().max(32).optional().nullable(),
  customer_name: z.string().trim().max(120).optional().nullable(),
});

export const claimRewardSchema = z.object({
  phone: z.string().trim().min(6).max(32),
  session_id: z.string().trim().min(1).max(128).optional().nullable(),
});

export const inventoryAdjustmentSchema = z.object({
  kind: z.enum(['vamc', 'ice_cream', 'df']),
  item_id: z.union([z.string().min(1), z.number().int().positive()]),
  delta: z.number().finite().min(-100000).max(100000).optional(),
  unit_cost: z.number().finite().min(0).max(1000000).optional(),
  purchase_qty: z.number().finite().positive().max(100000).optional(),
  notes: z.string().trim().max(240).optional().nullable(),
});

export const floorResetSchema = z.object({
  table_number: z.number().int().min(1).max(500).optional(),
  session_id: z.string().trim().min(1).max(128).optional(),
});

export const counterSaleSchema = z.object({
  payment_mode: z.enum(['cash', 'upi', 'card']),
  customer_name: z.string().trim().max(120).optional().nullable(),
  customer_phone: z.string().trim().max(32).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        quantity: z.number().int().min(1).max(100),
        unit_price: z.number().finite().min(0).max(1000000),
        cooking_notes: z.string().max(240).optional().nullable(),
        source_table: z.enum(['vamc_menu_items', 'ice_cream_menu_items', 'df_menu_items']).optional(),
        source_item_id: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .min(1)
    .max(60),
});
