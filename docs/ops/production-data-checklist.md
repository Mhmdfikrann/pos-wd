# Production Data Checklist

Use this before go-live after `npm run db:push` and `npm run db:seed`.

## Outlet

- [ ] Outlet name, code, address, phone, timezone, and currency match production.
- [ ] Tax percent and service charge are confirmed by Owner.
- [ ] Cash drawer opening rules confirmed per outlet.

## Users & Access

- [ ] Owner account exists.
- [ ] Manager account exists for each outlet.
- [ ] Kasir accounts exist for active cashier staff.
- [ ] Kitchen account exists for kitchen display.
- [ ] Inventory account exists for stock operator.
- [ ] Default passwords and PINs are rotated.
- [ ] `user_outlets` grants match real outlet assignments.
- [ ] Each role can log in only to the expected home route.

## Catalog & Recipe

- [ ] Categories match current menu.
- [ ] Product names, SKUs, prices, and availability are verified.
- [ ] Variant/addon prices are verified.
- [ ] Kitchen stations are assigned correctly.
- [ ] Recipes exist for products that deduct stock.
- [ ] Cost price is filled for reporting where available.

## Inventory

- [ ] Opening stock counted per outlet.
- [ ] Minimum stock threshold configured for key ingredients.
- [ ] Packaging items included.
- [ ] Recipe ingredients are available in `outlet_stock`.
- [ ] Manual adjustment audit is visible after a test adjustment.

## Finance / Cash

- [ ] Cash opening SOP agreed.
- [ ] Payment methods available at the store are enabled in training material.
- [ ] Refund/void/discount approval roles confirmed.
- [ ] Receipt/check number format accepted by operations.

## Verification Commands

```bash
npm run launch:check
npm run db:backup
npm run db:backup:verify -- /var/backups/pos-wd/<latest>.sqlite
```

Record the verified backup name in the go-live sign-off.
