# Phase 3: Deal Analysis and Follow-Up

Branch: `phase-3-deal-analysis-follow-up`.
Base: `0303be91d687ba4134e83eb2f7679cee2dacff24` (merged Phase 2).

## Behavior

- Exact decimal-string/BigInt arithmetic; no floating-point monetary calculations. Inputs accept up to 24 whole-dollar digits and two fractional digits. Buyer percentage accepts 0.01 through 100; enter 70 for 70%.
- MAO = ARV × buyer percentage − repairs − desired assignment fee. Round the final result once to cents, half away from zero. Asking-price difference compares asking price to that displayed MAO. Negative MAO is displayed without an investment recommendation.
- Incomplete analysis can be saved. Unknown inputs remain null; zero dollar amounts are valid. Missing asking price does not prevent calculating MAO from complete analysis inputs.
- ARV is separate from the pre-existing estimatedValue field. Existing values are not copied or reinterpreted automatically.
- Readiness lists missing inputs, motivation and follow-up. Recommendations first surface an overdue/today scheduled action, then missing asking price, ARV, repairs, motivation, analysis inputs, or follow-up; otherwise they suggest reviewing the analysis. Closed/dead records have no active-action recommendation.
- Existing nextAction and nextActionDate remain the single property follow-up source. No duplicate tasks are generated. The date is still stored at noon UTC as in Phase 2, interpreted as a calendar date without local-time conversion. Today uses America/Chicago (Central Time), including DST.
- Needs Attention sorts active properties by follow-up date: overdue, today, upcoming, then unscheduled. Closed and dead are excluded. The first ten are shown with a link to all properties.
- Pipeline labels map NURTURE to Follow-Up, DISPOSITION to Marketing to Buyers, and CLOSED to Assigned / Closed. No enum values or record stages change. Qualified and Negotiating remain visible as additional existing stages. Dead records are in a collapsed section.
- Analysis, follow-up, motivation, notes and stages save transactionally with activity history. No-op updates are quiet. New workflow forms use updatedAt checks and conditional updates to reject stale writes. Property editing also carries the version token.
- Notes append to existing notes. Existing confirmed deletion behavior is unchanged.

## Additive schema migration

Four nullable fields on Property:
- arv: Decimal
- assignmentFee: Decimal
- buyerPercentage: Decimal
- sellerMotivation: String

The contract and generated artifacts were emitted with the installed Prisma 8 workflow. No dependencies, environment files, credentials, database client configuration, deployment configuration, or infrastructure were changed.

The repository previously had no migration graph. It now contains:
1. `migrations/app/20260925T0522_phase2_baseline`: an offline representation of the already-existing Phase 2 schema.
2. `migrations/app/20260925T0522_phase3_analysis`: the actual four-column additive delta.

**The baseline must not execute against the existing database.** On a correctly marked Phase 2 database the runner starts from its existing marker and runs only the delta. No migration was applied to Supabase in this session.

Expected Phase 2 storage hash:
`696f21a97624edcb948faa618e84d7d9e248eeb7675c1ffa795145d541876b14`

Phase 3 target:
`d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc`

Offline path verification returned exactly one migration, the four-column delta. It does not prove the live database marker/schema match.

## Codespace migration and test procedure

Preserve existing uncommitted work before switching branches. Keep the existing .env.local in place.

```bash
cd /workspaces/wholesaling-crm
git status --short
git fetch origin
git switch phase-3-deal-analysis-follow-up
pnpm install --frozen-lockfile

# Read-only: use the existing configuration without displaying credentials.
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate --show
```

Inspect this live preview. It must list **only** `20260925T0522_phase3_analysis`. If it proposes baseline table creation, reports a missing/mismatched marker, or reports unexpected operations, stop and diagnose; do not reset, blindly sign, or run the baseline.

Once that preview is correct, apply the reviewed delta and verify:

```bash
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate
node --env-file=.env.local node_modules/prisma/dist/prisma.js db verify
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

The Windows host used the existing `CRM_BUILD_WORKER_THREADS=1` build option to avoid restricted subprocess launch errors. Codespaces should use its normal build configuration.

## Automated validation

42 tests pass: 15 unchanged Phase 2 regression tests and 27 Phase 3 tests. Phase 3 covers formulas, fractional percentages, exact large numbers, rounding, incomplete analysis, validation, calendar/DST boundaries, attention ordering, readiness, recommendations, stored pipeline compatibility, save/edit/reread behavior, no-op activity, note append, stale writes, transactional rollback, and additive migration shape.

The action regression tests use an in-memory database double, not PostgreSQL. Persistence in Supabase and the actual migration still require the live tests below.

TypeScript, ESLint and the production build pass. No testing checks were disabled. ESLint ignores generated migration declaration snapshots just as it ignores the existing generated contract declarations.

## Manual checks required before PR approval

Use newly created disposable records for deletion tests; preserve all existing test records.

- [ ] Run the live migration preview, apply only the delta, and verify the database.
- [ ] Enter asking 120000, ARV 200000, repairs 30000, fee 10000, percentage 70. Verify MAO 100000 and difference 20000 above.
- [ ] Reload; verify all inputs persist. Change percentage to 70.25 and confirm MAO 100500 after save/reload.
- [ ] Save an incomplete analysis and zero-dollar repairs/fee. Verify missing information is distinguished from zero.
- [ ] Try negative money, malformed numbers, zero/over-100 percentages and an invalid date; verify rejection.
- [ ] Schedule follow-ups yesterday, today and tomorrow. Reload and verify classifications, displayed dates and Central Time note.
- [ ] Edit and clear a follow-up date. Verify the next action, readiness and activity history.
- [ ] Check Needs Attention ordering and property links. Verify closed/dead records are excluded.
- [ ] Fill motivation and missing analysis inputs; verify readiness and recommendation changes.
- [ ] Test all pipeline transitions, including retained Qualified/Negotiating stages and the collapsed Dead section.
- [ ] Save unchanged analysis, motivation, follow-up and stage values; confirm no duplicate activity.
- [ ] Open one property in two tabs; save in one, then attempt a stale save in the other. Confirm newer data is not overwritten.
- [ ] Add a note and verify existing notes are preserved.
- [ ] Verify Phase 2 property/contact/task creation, edits, linking, search/filter, completion/reopen, confirmed deletion and navigation.
- [ ] Check phone-width layout.

No Phase 4 work, deployment, PR creation, or merge was performed.
