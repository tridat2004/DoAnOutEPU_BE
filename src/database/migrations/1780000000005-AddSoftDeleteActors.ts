import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteActors1780000000005 implements MigrationInterface {
  name = 'AddSoftDeleteActors1780000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN "deleted_by_user_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "deleted_by_user_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_projects_deleted_by_user_id"
      ON "projects" ("deleted_by_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_deleted_by_user_id"
      ON "tasks" ("deleted_by_user_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "FK_projects_deleted_by_user"
      FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_deleted_by_user"
      FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_deleted_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_deleted_by_user"
    `);
    await queryRunner.query(`DROP INDEX "idx_tasks_deleted_by_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_projects_deleted_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deleted_by_user_id"`);
  }
}
