import { MigrationInterface, QueryRunner } from 'typeorm';
import { InitSchema1776009966623 } from './1776009966623-InitSchema';

const MARKER_TABLE = 'task_core_migration_bootstrap';

export class EnsureCoreSchema1710000000000 implements MigrationInterface {
  name = 'EnsureCoreSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${MARKER_TABLE}" (
        "id" integer PRIMARY KEY,
        "owns_core_schema" boolean NOT NULL
      )
    `);

    const coreTables = await Promise.all([
      queryRunner.hasTable('users'),
      queryRunner.hasTable('projects'),
      queryRunner.hasTable('tasks'),
    ]);
    const existingCoreTableCount = coreTables.filter(Boolean).length;

    if (existingCoreTableCount > 0 && existingCoreTableCount < coreTables.length) {
      throw new Error(
        'Database has a partial core schema; reconcile it before running migrations.',
      );
    }

    const ownsCoreSchema = existingCoreTableCount === 0;
    if (ownsCoreSchema) {
      await new InitSchema1776009966623().up(queryRunner);
    }

    await queryRunner.query(
      `
        INSERT INTO "${MARKER_TABLE}" ("id", "owns_core_schema")
        VALUES (1, $1)
        ON CONFLICT ("id") DO NOTHING
      `,
      [ownsCoreSchema],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const markerExists = await queryRunner.hasTable(MARKER_TABLE);
    if (!markerExists) return;

    const queryResult: unknown = await queryRunner.query(
      `SELECT "owns_core_schema" FROM "${MARKER_TABLE}" WHERE "id" = 1`,
    );

    const firstRow: unknown = Array.isArray(queryResult)
      ? (queryResult as unknown[])[0]
      : undefined;
    const ownsCoreSchema =
      typeof firstRow === 'object' &&
      firstRow !== null &&
      'owns_core_schema' in firstRow &&
      firstRow.owns_core_schema === true;

    if (ownsCoreSchema) {
      await new InitSchema1776009966623().down(queryRunner, true);
    }

    await queryRunner.query(`DROP TABLE "${MARKER_TABLE}"`);
  }
}
