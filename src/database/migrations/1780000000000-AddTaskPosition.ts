import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskPosition1780000000000 implements MigrationInterface {
  name = 'AddTaskPosition1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "position" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      WITH ranked_tasks AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "project_id", "status_id"
            ORDER BY "created_at" ASC, "id" ASC
          ) - 1 AS "next_position"
        FROM "tasks"
      )
      UPDATE "tasks" AS task
      SET "position" = ranked_tasks."next_position"
      FROM ranked_tasks
      WHERE task."id" = ranked_tasks."id"
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_project_status_position"
      ON "tasks" ("project_id", "status_id", "position")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_tasks_project_status_position"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "position"`);
  }
}
