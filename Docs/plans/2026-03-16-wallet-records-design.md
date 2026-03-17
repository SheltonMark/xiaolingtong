# Wallet Records Alignment Design

## Goal

Align the wallet summary page, wallet detail page, and income detail page so they all use the same client-side record model.

## Constraints

- Front-end only.
- Keep the current wallet page as the summary page.
- Wallet detail and view-all actions should land on the same page.
- Enterprise and worker users share the wallet page, but income wording must differ by role.

## Decisions

1. Add a shared `utils/wallet-records.js` helper.
2. Derive display income from the largest of:
   - `wallet.totalIncome`
   - successful income transactions
   - `wallet.balance + wallet.totalWithdraw`
3. If there is a positive gap between displayed income and recorded income transactions, create one synthetic display-only income record.
4. Route wallet-page `查看全部` and `提现记录` into the same detail page, with different default filters.
5. Keep the standalone `income` page, but make it use the same normalized record model.

## Result

- Manual balance adjustments can still appear in wallet-related pages without changing the backend.
- The wallet detail page no longer renders empty because it now maps API payloads into the fields expected by the UI.
- Enterprise users see return-commission wording; worker users see wage-income wording.
