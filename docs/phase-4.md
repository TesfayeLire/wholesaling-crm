# Phase 4 — Follow-Up Command Center

Branch: `phase-4-follow-up-command-center`
Base: `ed55911f09a843ff8afbb6c16fe5e7a3d145509f` (merged Phase 3).

## Daily workflow

Open Dashboard or Follow-Ups. Counts and queues combine existing property next actions and pending Tasks. Closed/dead properties are excluded from active queues, but their history remains available. Completed tasks and completed property next actions are excluded. Unscheduled records are never classified as overdue.

Open the property/contact, log Call, Text, Email, Voicemail, No Answer, Conversation, or Other, optionally add a note, and choose the next step. A property with one linked contact preselects it; choose Property only when appropriate. Joint logging requires an existing PropertyContact relationship and never creates duplicate links.

- Property outreach can replace the existing property next action/date or complete it. It does not create another task. An explicitly selected pending task can also be completed in the same save.
- Contact-only outreach schedules an ordinary Task. Select an existing pending contact task to reschedule/complete it instead of creating a new task. Property-related tasks are managed from that property's workflow or the task editor.
- Log only leaves the follow-up unchanged. Logging contact alone does not mark it handled.
- Existing Phase 3 follow-up editing and task editing continue to work. The queue links directly to the record and task editor.
- Independent tasks and property next actions remain separate obligations. Completing one does not automatically complete the others.

Outreach uses Activity types `OUTREACH_*`. Optional notes (maximum 4,000 characters) are stored in the description; activity relationships retain the property/contact association. Activity.createdAt is the contact event time. Default is now; the optional earlier-contact input is explicitly UTC and rejects invalid/future times. History displays UTC; recent outreach displays Central Time. Last Contacted derives from the latest outreach timestamp, not the most recently inserted row. Attempts including No Answer count as contact. Property-only outreach does not imply outreach to every linked contact.

The optional contact associated with a property follow-up is recorded on its `FOLLOW_UP_UPDATED` history entry. A later Phase 3 follow-up edit records no specific contact. Queue cards show the scheduled contact when available, otherwise an existing linked contact for convenience. They do not create a new relationship or assign an owner.

## Attention rules

Rules are centralized in `src/command-center.ts`:

- Active Hot lead with an overdue property action or pending task: show the number of calendar days overdue.
- Active Hot lead with no scheduled property action or pending task today or later: show the missing-next-follow-up reason.
- Active Hot lead never contacted, or last contacted at least 7 calendar days ago: show the reason and elapsed days.
- Warm, Cold, and unclassified records still appear in dated queues but have no additional neglect rule.
- Recently Contacted covers the last 14 Central calendar dates including today.

Follow-up dates retain Phase 3's noon-UTC date-only storage. Today is evaluated in America/Chicago, including DST. No scoring, AI, invented dates, or automatic outreach is used.

## Database and migration

Only schema addition: nullable `Property.temperature`, domain enum `LeadTemperature` = HOT/WARM/COLD. It is stored as text with the generated membership CHECK constraint. Existing records remain null (displayed as Unclassified); no backfill is needed.

Generated files:

- `migrations/app/20260926T0340_phase4_temperature/migration.ts`
- `migrations/app/20260926T0340_phase4_temperature/migration.json`
- `migrations/app/20260926T0340_phase4_temperature/ops.json`
- `migrations/snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract.json`
- `migrations/snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract.d.ts`

The current contract artifacts were regenerated. No previous migration was rewritten. The new migration contains only ADD COLUMN and ADD CONSTRAINT. Offline path verification found exactly this one migration from the Phase 3 hash. No live database was accessed or migrated during implementation.

Phase 3 storage hash: `d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc`

Phase 4 storage hash: `52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95`

## Codespaces migration instructions

Keep the existing `.env.local` and preserve any uncommitted work before switching branches.

```bash
cd /workspaces/wholesaling-crm
git status --short
git fetch origin
git switch phase-4-follow-up-command-center
pnpm install --frozen-lockfile
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate --show
```

The live preview must list only `20260926T0340_phase4_temperature`. If it proposes a baseline, Phase 3 changes, table recreation, or reports a marker/schema mismatch, stop and diagnose. Do not reset, reseed, or blindly sign the database.

After the preview matches, apply and verify with the current Prisma 8 commands:

```bash
node --env-file=.env.local node_modules/prisma/dist/prisma.js db migrate
node --env-file=.env.local node_modules/prisma/dist/prisma.js db verify
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm dev
```

No legacy `prisma migrate deploy` is used. These commands read the existing configuration without printing secrets.

## Validation and manual checklist

Automated action tests use an in-memory transactional database double, not Supabase. The 27 new Phase 4 tests control now, and all 42 existing tests remain unchanged. No test or type-check protection was disabled. The Windows production build uses the repository's existing `CRM_BUILD_WORKER_THREADS=1` option; Codespaces should use its normal build command.

Before any merge, test against the existing Codespace/Supabase environment:

1. Preview/apply the single migration and run db verify. Confirm existing properties, contacts, links, tasks, history, and Phase 3 inputs still exist.
2. Set a disposable lead Hot, Warm, and Cold; refresh each time. Confirm temperature in detail, property list, dashboard/queue. Existing untouched records should be Unclassified.
3. Log No Answer without a note, then Conversation with a note. Confirm exactly one outreach event per submission and readable history. Repeated unchanged temperature saves should add no history.
4. Confirm Last Contacted on both related records. Backdate a contact using the UTC field and confirm it does not replace a newer Last Contacted date.
5. Log a joint property/contact event using an existing link, then property-only and contact-only events. Confirm no new PropertyContact records are created.
6. From a property log, schedule tomorrow and refresh. Confirm its existing next action changed and no duplicate Task was created.
7. From a contact log, create a contact-only follow-up Task, then select it to reschedule it. Confirm the same task ID persists.
8. Schedule test follow-ups yesterday, today, and tomorrow relative to Central Time. Confirm Overdue, Due Today, and Upcoming contain the expected property actions/tasks after refresh.
9. Make a Hot lead unscheduled and never contacted, then give it an old contact event. Confirm visible attention reasons. An unscheduled lead must not be labeled overdue.
10. Compare dashboard counts with the full queue. Closed/dead leads must be absent from active queues and Hot/attention counts, while history remains accessible.
11. Complete a property follow-up; confirm its next action/date clear and it leaves the queue. Complete/reopen a Task and reschedule it using the task editor; confirm its queue and history update.
12. When handling a property with an existing task, explicitly select that task in the outreach form. Confirm it completes while the new property follow-up is scheduled.
13. Open a property/task in two tabs. Change it in one, then submit the older form; confirm a stale-save error and no overwrite. Try invalid date, result, and relationship inputs; confirm no partial writes.
14. Recheck Phase 3 MAO with asking 120000, ARV 200000, repairs 30000, fee 10000, buyer percentage 70: MAO 100000 and difference 20000 above. Refresh and check precision/persistence.
15. Check existing property/contact editing, task filters, linking, pipeline transitions, and confirmed deletion using disposable records only. Verify preserved history and remaining related records. Test the new forms/queues at phone width.

## Limits and scope

- Live migration, real database persistence, and interactive browser/mobile testing still require the checklist above.
- Date-only follow-up scheduling; optional historical contact time is UTC. No external calendar or reminders.
- Dashboard/queue data is read in batches and grouped in memory, consistent with the current single-user CRM. Large datasets may eventually need database-side aggregation/pagination.
- Temperature belongs to Property; contacts without a property have no independent temperature.
- Manual contact logging only. No sending, scraping, paid API, AI, notification service, authentication redesign, or later-phase work.
- No deployment, PR creation, or merge is part of this implementation.
