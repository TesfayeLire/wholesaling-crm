#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a5f22d6c21855b9011080deee0152069b08dabb10a703aa07b2395732d13ec8/contract';
import endContract from '../../snapshots/3a5f22d6c21855b9011080deee0152069b08dabb10a703aa07b2395732d13ec8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract';
import startContract from '../../snapshots/52f9253a8994b63f7048a7eceb64c92c61cd10acd9a4ad7d9cc000dfe4305e95/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'acquisitionContract',
        columns: [
          col('closingDeadline', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('contactId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('contractDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('earnestMoneyAmount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('earnestMoneyDueDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('earnestMoneyStatus', 'text', {
            notNull: true,
            default: lit('NOT_DUE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inspectionDeadline', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('offerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('propertyId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('purchasePrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'acquisitionContract_earnestMoneyStatus_check_492752fe',
            "\"earnestMoneyStatus\" IN ('NOT_DUE', 'DUE', 'PAID', 'WAIVED')",
          ),
          checkExpression(
            'acquisitionContract_status_check_70ec1399',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'offer',
        columns: [
          col('acceptedAmount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('contactId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('counterAmount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expirationDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('offerDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('propertyId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'offer_status_check_0b2fa444',
            "\"status\" IN ('DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'acquisitionContract',
        constraint: 'acquisitionContract_offerId_key',
        columns: ['offerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'offer',
        constraint: 'offer_id_propertyId_key',
        columns: ['id', 'propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisitionContract_contactId_idx_ec98db2a',
        columns: ['contactId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisitionContract_offerId_propertyId_idx_bf0d22d7',
        columns: ['offerId', 'propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisitionContract_propertyId_status_idx_3d7866fc',
        columns: ['propertyId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisitionContract_status_closingDeadline_idx_06092b9e',
        columns: ['status', 'closingDeadline'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisitionContract_status_inspectionDeadline_idx_387ed97d',
        columns: ['status', 'inspectionDeadline'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'acquisition_emd_due_295f0a30',
        columns: ['earnestMoneyStatus', 'earnestMoneyDueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'acquisitionContract',
        index: 'one_active_acquisition_per_property_7a856d9d',
        columns: ['propertyId'],
        extras: { where: '"status" = \'ACTIVE\'', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'offer',
        index: 'offer_contactId_idx_ec98db2a',
        columns: ['contactId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'offer',
        index: 'offer_propertyId_createdAt_idx_3aeff3c1',
        columns: ['propertyId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'offer',
        index: 'offer_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'offer',
        index: 'offer_status_expirationDate_idx_12b3703f',
        columns: ['status', 'expirationDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'acquisitionContract',
        foreignKey: {
          name: 'acquisitionContract_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'acquisitionContract',
        foreignKey: {
          name: 'acquisitionContract_offerId_propertyId_fkey',
          columns: ['offerId', 'propertyId'],
          references: { schema: 'public', table: 'offer', columns: ['id', 'propertyId'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'acquisitionContract',
        foreignKey: {
          name: 'acquisitionContract_contactId_fkey',
          columns: ['contactId'],
          references: { schema: 'public', table: 'contact', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'offer',
        foreignKey: {
          name: 'offer_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'offer',
        foreignKey: {
          name: 'offer_contactId_fkey',
          columns: ['contactId'],
          references: { schema: 'public', table: 'contact', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
