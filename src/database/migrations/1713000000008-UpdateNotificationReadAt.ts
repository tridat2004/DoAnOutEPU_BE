import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationsReadAt1740000000001
  implements MigrationInterface
{
  name = 'UpdateNotificationsReadAt1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP WITH TIME ZONE NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "metadata_json" TYPE jsonb
      USING "metadata_json"::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN IF EXISTS "read_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "metadata_json" TYPE json
      USING "metadata_json"::json
    `);
  }
}