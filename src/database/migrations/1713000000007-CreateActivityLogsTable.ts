import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityLogsTable1740000000000 implements MigrationInterface {
  name = 'CreateActivityLogsTable1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid,
        "actor_user_id" uuid NOT NULL,
        "action_type" character varying(100) NOT NULL,
        "target_type" character varying(50),
        "target_id" uuid,
        "message" text NOT NULL,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_activity_project_created_at"
      ON "activity_logs" ("project_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_activity_actor_created_at"
      ON "activity_logs" ("actor_user_id", "created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_logs"
      ADD CONSTRAINT "FK_activity_logs_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_actor"`);
    await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_project"`);
    await queryRunner.query(`DROP INDEX "public"."idx_activity_actor_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_activity_project_created_at"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
  }
}