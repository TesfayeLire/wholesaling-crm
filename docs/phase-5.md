# Phase 5 — Offers and Acquisition Contracts

Branch: `phase-5-offers-acquisition-contracts`

Base: `d74cd49d8edf9df4474bb99ef1de7a74ffa8535c` (merged Phase 4).

## Architecture

Property remains the real-estate record. Two new models hold acquisition work:

- **Offer:** property, nullable seller Contact, immutable original amount, offer date, status, current seller counter, explicit accepted amount, expiration, notes, created/updated timestamps. A property can have many offers.
- **AcquisitionContract:** property, unique source Offer, nullable seller Contact, purchase price, contract date, inspection deadline, closing deadline, EMD amount/due date/status, contract status, notes, created/updated timestamps. The contract ID is the future attachment point for disposition/closing work; none of that work is implemented now.

Money uses PostgreSQL numeric and decimal strings. Phase 3 parsing/formatting is reused; no floating-point money arithmetic. Original offers, seller counters, actual purchase prices, the legacy Property.offerAmount, and calculated MAO are distinct. Phase 3 analysis and Phase 4 follow-up values are never overwritten by acquisition actions.

## Offer and negotiation workflow

1. Open a property and review its analysis/contact/follow-up sections. Quick links reach Offers and Acquisition deadlines/contracts.
2. Record a new Draft or Pending offer. Select an existing linked seller or leave it blank. Pending requires an actual offer date; drafts can remain undated.
3. Update Pending to Countered, Accepted, Rejected, or Withdrawn. Countered can return to Pending or reach those terminal outcomes. An unsent Draft can also be withdrawn without inventing a date.
4. Enter each seller counter explicitly. The current counter is stored on Offer; every change, including previous/new amounts and notes, is preserved in the existing Activity history. The original offer amount never becomes the counter amount.
5. When accepting, explicitly enter either the original offer or current counter as the accepted amount. Record a new offer for another agreed price. New offers do not replace earlier rejected or withdrawn offers.
6. Accepted/Rejected/Withdrawn offers are retained and locked. No destructive offer-edit/delete workflow is provided. Status menus show only valid transitions.

Expiry is a deadline classification, not an automatic status change. A past expiration is displayed as Expired; the user records the actual seller response. Other outstanding offers remain unchanged and must be resolved explicitly.

## Accepted offer to contract

Choose **Create contract from accepted offer**. This creates one Draft AcquisitionContract, carrying property, seller, and explicit accepted price. Contract dates, deadlines, EMD and notes remain blank. Repeated conversion is quiet and cannot create another contract from that offer; a unique constraint also handles concurrent attempts.

Edit the draft to enter real contract details. Active requires contract date and closing deadline. Deadlines cannot precede the contract date; inspection and EMD deadlines cannot follow closing. Missing dates are not invented.

Contract states:

- Draft → Active or Cancelled.
- Active → Acquisition stage completed or Cancelled.
- Completed/Cancelled records are retained and locked.

Completed means only the acquisition stage is complete. It does not record final closing, move the property to Closed, or calculate profit. At most one Active contract is allowed per property, enforced both by the action and a partial unique database index. Multiple historical/draft contracts from different accepted offers are supported.

Purchase-price amendments while Draft/Active preserve old/new values in Activity and do not rewrite the original accepted offer.

## Earnest money and deadlines

EMD statuses are Not due, Due, Paid and Waived. Paid is always explicit and requires a positive amount; a missing amount is not treated as zero. Paid/Waived suppress the EMD deadline. A recorded unpaid EMD date is still classified even if its status says Not due, so a missed date is not hidden.

`src/acquisitions.ts` centralizes deadline classification:

- Pending/Countered offers: expiration.
- Active contracts: unpaid/unwaived EMD, inspection, closing.
- Missing dates, draft contracts, completed/cancelled contracts and finalized offers: no outstanding deadlines.
- Date before today: Overdue; today: Due today; after today: Upcoming.

Business dates use the existing noon-UTC date-only storage convention. Comparisons use the selected calendar date; today is America/Chicago including DST. Metadata timestamps remain distinct from business dates. Tests inject the date.

## Dashboard and pipeline

The Phase 4 Follow-Up Command Center is preserved. A separate compact acquisition section shows Pending/Countered offers, Accepted offers, Active contracts, deadlines today, overdue deadlines and upcoming closings (including today). Accepted counts include preserved offers already converted to contracts. Deadline counts count individual deadlines, not distinct properties.

The full `/acquisitions` page links to the relevant property offer/contract. Property detail includes offer history, contracts and deadlines.

Pipeline changes require an explicit checkbox:

- Pending/Accepted offer → Offer Made.
- Countered offer → Negotiating (the existing stored stage).
- Active contract → Under Contract.

Later/inactive pipeline stages cannot be implicitly moved backward by these checkboxes. Without a checkbox, pipeline stays unchanged. Cancelling/completing an acquisition also leaves the pipeline unchanged: review it using the existing Change Stage action. The existing pipeline and follow-up systems remain independent user-controlled workflows.

## Integrity and retention

- Seller selection validates Contact existence and the existing PropertyContact link. No duplicate contacts or links are created.
- Source offer/property agreement is protected by a composite foreign key. A unique offerId prevents duplicate conversion.
- Mutations, history, optional pipeline changes and version checks run in one transaction. Stale forms are rejected; no-op edits produce no activity.
- Properties with offers/contracts cannot be deleted. The detail page explains retention, and restrictive foreign keys protect direct deletion attempts. Existing cleanup rolls back if that restriction is reached.
- Existing Contact deletion semantics remain: acquisition records survive and their nullable seller references are set null by foreign keys. Existing activity/task/link cleanup remains intact.
- No prior field or table was dropped or recreated. No existing migration was rewritten.

## Migration

Generated with the installed Prisma 8 RC contract/migration workflow:

- `migrations/app/20260926T1732_phase5_acquisitions/migration.ts`
- `migrations/app/20260926T1732_phase5_acquisitions/migration.json`
- `migrations/app/20260926T1732_phase5_acquisitions/ops.json`
- `migrations/snapshots/3a5f22d6c21855b9011080deee0152069b08dabb10a703aa07b2395732d13ec8/contract.json`
- `migrations/snapshots/3a5f22d6c21855b9011080deee0152069b08dabb10a703aa07b2395732d13ec8/contract.d.ts`

The current contract source and generated artifacts are updated. The migration has 20 additive operations: two new tables (including status CHECK constraints), foreign keys, source-offer uniqueness, and property/contact/status/deadline indexes. It does not alter existing business-table storage. No migration was applied to Supabase in this session.

Phase 4 storage hash: `52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95`

Phase 5 storage hash: `3a5f22d6c21855b9011080deee0152069b08dabb10a703aa07b2395732d13ec8`

### Exact Codespaces commands

Preserve existing uncommitted work before switching; keep the existing `.env.local` unchanged.

```bash
cd /workspaces/wholesaling-crm
git status --short
git fetch origin
git switch phase-5-offers-acquisition-contracts
pnpm install --frozen-lockfile
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate --show
```

This reads the existing `.env.local` without printing its values. The live preview must contain only `20260926T1732_phase5_acquisitions`, creating the two new tables and their constraints/indexes. If it proposes previous migrations, a baseline, destructive work, or reports a marker mismatch, stop and diagnose. Do not reset, reseed, or blindly sign the database.

After the preview matches:

```bash
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate
node --env-file=.env.local node_modules/prisma/dist/prisma.js db verify
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm dev
```

No legacy `prisma migrate deploy` command is used.

## Automated verification

104 tests passed, 0 failed, 0 skipped: all 69 Phase 1–4 tests unchanged plus 35 Phase 5 tests. Coverage includes multiple offers, negotiation history, statuses, explicit acceptance, precise prices, conversion, duplicate prevention, relationships, dates, deadlines, EMD, opt-in pipeline updates, no-ops, stale submissions, rollback and deletion restrictions.

TypeScript, ESLint and production build passed. The Windows build used the repository's existing `CRM_BUILD_WORKER_THREADS=1` option; no build/deployment configuration changed. Offline migration path verification returned exactly the new Phase 5 migration.

Action tests use an in-memory transactional database double; foreign-key behavior is additionally checked in generated migration SQL. This is not a live PostgreSQL/browser verification.

## Efficient live checklist

1. Run the migration preview/application/verification above. Confirm existing properties, contacts, links, tasks, activity, Phase 3 inputs and Phase 4 temperature/follow-up data remain.
2. Open a disposable property. Recheck MAO and one existing contact/follow-up interaction. Confirm the existing navigation/forms work and new workflow links are usable at phone width.
3. Record a Pending $105,000 offer with linked seller and dates. Refresh to verify amount, date, seller and notes. Reject it, then record a second $110,000 offer; verify the first remains visible.
4. Record a $115,000 seller counter, then another counter. Check that the original offer remains $110,000 and history preserves both counters and notes. Accept using the explicitly agreed original/counter price.
5. Create its contract. Verify purchase price, Property and Contact, blank remaining details, and the preserved accepted offer. Refresh; confirm there is only one source-linked contract.
6. Enter contract date, EMD amount/due date, inspection deadline and closing deadline. Activate it, optionally choosing the Under Contract pipeline checkbox. Refresh and verify every value persists.
7. Change EMD to Paid, then verify its history and disappearance from deadlines. Verify another unpaid test EMD still appears as expected. Use actual test data, not a live deal's payment status.
8. On disposable offers/contracts, set deadlines yesterday/today/tomorrow relative to Central Time. Check expiration, EMD, inspection and closing classifications, Dashboard counts and full acquisition links. Blank dates must not be overdue.
9. Confirm Phase 4 queues/tasks remain intact. Check offer and contract activity, no-op saves, and two-tab stale-save rejection. Review the pipeline explicitly after cancelling/completing an acquisition; neither action should mark final closing.
10. Verify acquisition-property deletion is unavailable and ordinary disposable-record deletion still follows existing confirmation/retention rules. If testing seller deletion, use a disposable seller and confirm offers/contracts/history remain with cleared seller references.

## Limits and deferred work

- Live migration, real Supabase persistence/constraints and interactive desktop/phone testing await the checklist.
- Contract creation starts from an accepted offer; no standalone legacy-contract import or document workflow is included.
- Finalized records are retained/locked. Corrections requiring reopening need a separately reviewed workflow; further negotiation uses another offer.
- Inspection/closing deadlines remain visible while a contract is Active; there is no independent inspection-completion flag. Completed/Cancelled acquisition states remove them from active queues.
- Reads use batch queries and in-memory summaries consistent with the existing single-user CRM; larger datasets may need pagination/aggregation later.
- No buyer/disposition records, assignments, title management, actual closing, profit accounting, documents, e-signature, outreach automation, external APIs, authentication redesign, or Phase 6/7 functionality.
- No secrets, environment configuration, dependency versions, deployment, PR, or merge changes.
