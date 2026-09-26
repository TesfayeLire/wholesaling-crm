#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract';
import endContract from '../../snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc/contract';
import startContract from '../../snapshots/d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('temperature', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'property',
        constraint: 'property_temperature_check_f31e8577',
        expression: "\"temperature\" IN ('HOT', 'WARM', 'COLD')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
