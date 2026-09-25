#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/696f21a97624edcb948faa618e84d7d9e248eeb7675c1ffa795145d541876b14/contract';
import startContract from '../../snapshots/696f21a97624edcb948faa618e84d7d9e248eeb7675c1ffa795145d541876b14/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc/contract';
import endContract from '../../snapshots/d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('arv', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('assignmentFee', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('buyerPercentage', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('sellerMotivation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
