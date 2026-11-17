import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoardsAndColumns1780000000006 implements MigrationInterface {
  name = 'AddBoardsAndColumns1780000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "boards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "project_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "is_default" boolean NOT NULL DEFAULT false,
        CONSTRAINT "pk_boards" PRIMARY KEY ("id"),
        CONSTRAINT "uq_boards_project_name" UNIQUE ("project_id", "name"),
        CONSTRAINT "fk_boards_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_boards_default_per_project"
      ON "boards" ("project_id") WHERE "is_default" = true
    `);

    await queryRunner.query(`
      CREATE TABLE "board_columns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "board_id" uuid NOT NULL,
        "status_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "color" varchar(30),
        "position" integer NOT NULL DEFAULT 0,
        "wip_limit" integer,
        CONSTRAINT "pk_board_columns" PRIMARY KEY ("id"),
        CONSTRAINT "uq_board_columns_board_name" UNIQUE ("board_id", "name"),
        CONSTRAINT "ck_board_columns_wip_limit" CHECK ("wip_limit" IS NULL OR "wip_limit" > 0),
        CONSTRAINT "fk_board_columns_board" FOREIGN KEY ("board_id")
          REFERENCES "boards"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_board_columns_status" FOREIGN KEY ("status_id")
          REFERENCES "task_statuses"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_board_columns_board_position"
      ON "board_columns" ("board_id", "position")
    `);

    await queryRunner.query(`
      INSERT INTO "boards"
        ("id", "created_at", "updated_at", "project_id", "name", "position", "is_default")
      SELECT gen_random_uuid(), now(), now(), project."id", 'Main Board', 0, true
      FROM "projects" project
      ON CONFLICT ("project_id", "name") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "board_columns"
        ("id", "created_at", "updated_at", "board_id", "status_id", "name", "color", "position")
      SELECT
        gen_random_uuid(), now(), now(), board."id", status."id",
        status."name", status."color", status."position"
      FROM "boards" board
      CROSS JOIN "task_statuses" status
      WHERE board."is_default" = true
      ON CONFLICT ("board_id", "name") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "board_column_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "tasks" task
      SET "board_column_id" = column_data."column_id"
      FROM (
        SELECT board."project_id", board_column."status_id", board_column."id" AS "column_id"
        FROM "boards" board
        INNER JOIN "board_columns" board_column ON board_column."board_id" = board."id"
        WHERE board."is_default" = true
      ) column_data
      WHERE column_data."project_id" = task."project_id"
        AND column_data."status_id" = task."status_id"
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_board_column_position"
      ON "tasks" ("board_column_id", "position")
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "fk_tasks_board_column" FOREIGN KEY ("board_column_id")
      REFERENCES "board_columns"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_board_column"`);
    await queryRunner.query(`DROP INDEX "idx_tasks_board_column_position"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "board_column_id"`);
    await queryRunner.query(`DROP TABLE "board_columns"`);
    await queryRunner.query(`DROP TABLE "boards"`);
  }
}
