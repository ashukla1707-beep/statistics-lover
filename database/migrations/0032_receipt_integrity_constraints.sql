-- Statistics Lover: strengthen immutable commerce receipt snapshot integrity

alter table public.commerce_receipts
  add constraint commerce_receipts_currency
    check (currency ~ '^[A-Z]{3}$'),
  add constraint commerce_receipts_subtotal_nonnegative
    check (subtotal_minor >= 0),
  add constraint commerce_receipts_discount_nonnegative
    check (discount_minor >= 0),
  add constraint commerce_receipts_total_nonnegative
    check (total_minor >= 0),
  add constraint commerce_receipts_discount_cap
    check (discount_minor <= subtotal_minor),
  add constraint commerce_receipts_math
    check (subtotal_minor - discount_minor = total_minor);
