import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSystemRole1780000000001 implements MigrationInterface {
  name = 'AddUserSystemRole1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_system_role_enum" AS ENUM ('ADMIN', 'USER')
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "system_role" "user_system_role_enum" NOT NULL DEFAULT 'USER'
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "system_role" = 'ADMIN'
      WHERE "id" = (
        SELECT "id"
        FROM "users"
        ORDER BY "created_at" ASC, "id" ASC
        LIMIT 1
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_system_role" ON "users" ("system_role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_system_role"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "system_role"`);
    await queryRunner.query(`DROP TYPE "user_system_role_enum"`);
  }
}
