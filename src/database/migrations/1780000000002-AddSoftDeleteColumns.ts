import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteColumns1780000000002 implements MigrationInterface {
  name = 'AddSoftDeleteColumns1780000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_projects_deleted_at" ON "projects" ("deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_deleted_at" ON "tasks" ("deleted_at")
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      DROP CONSTRAINT IF EXISTS "FK_activity_logs_project"
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      DROP CONSTRAINT IF EXISTS "FK_activity_logs_actor"
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs" ALTER COLUMN "actor_user_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "FK_activity_logs_actor"
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs" ALTER COLUMN "actor_user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "FK_activity_logs_project"
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`DROP INDEX "idx_tasks_deleted_at"`);
    await queryRunner.query(`DROP INDEX "idx_projects_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deleted_at"`);
  }
}
