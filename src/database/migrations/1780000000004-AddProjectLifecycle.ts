import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectLifecycle1780000000004 implements MigrationInterface {
  name = 'AddProjectLifecycle1780000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM (
        'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'
      )
    `);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN "start_date" date NULL`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN "end_date" date NULL`);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "status" "project_status_enum" NOT NULL DEFAULT 'PLANNING'
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN "archived_at" timestamp NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_projects_status_archived"
      ON "projects" ("status", "archived_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_projects_status_archived"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "archived_at"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "end_date"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "start_date"`);
    await queryRunner.query(`DROP TYPE "project_status_enum"`);
  }
}
