import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1776009966623 implements MigrationInterface {
  name = 'InitSchema1776009966623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.wasCreatedByBootstrap(queryRunner)) {
      return;
    }

    await queryRunner.query(
      `CREATE TABLE "task_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "PK_232576669c4df1f0a15e1300ce2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0ea3c457b5cfa806abddd277a5" ON "task_types" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "task_statuses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "color" character varying(30), "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_28fe920c04b1baa795d82773739" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9295efde62f0fef01cb82aba3a" ON "task_statuses" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "priorities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "weight" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_928b91cfc09b11e82aeb6373b22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_50b2bedc5a6238a4e31b29e521" ON "priorities" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "task_code" character varying(30) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "due_date" date, "estimated_hours" integer, "project_id" uuid NOT NULL, "task_type_id" uuid NOT NULL, "status_id" uuid NOT NULL, "priority_id" uuid NOT NULL, "reporter_user_id" uuid NOT NULL, "assignee_user_id" uuid, "parent_task_id" uuid, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2a18b972050e6c282b8b2d43b8" ON "tasks" ("task_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying(255) NOT NULL, "username" character varying(100) NOT NULL, "full_name" character varying(150) NOT NULL, "password_hash" character varying(255) NOT NULL, "avatar_url" character varying(500), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "project_key" character varying(20) NOT NULL, "description" text, "owner_user_id" uuid NOT NULL, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c655a93948868c0af4c102745e" ON "projects" ("project_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "joined_at" TIMESTAMP, "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "uq_project_members_project_user" UNIQUE ("project_id", "user_id"), CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f6d54f95c31b73fb1bdd8e91d0" ON "roles" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "uq_role_permissions_role_permission" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8dad765629e83229da6feda1c1" ON "permissions" ("code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_ea76a982cfc3dd4bff34daaf036" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_e28288969fa7827bd12680cfe10" FOREIGN KEY ("status_id") REFERENCES "task_statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_5d1c8f7898b5b84ad5ce08fcff8" FOREIGN KEY ("priority_id") REFERENCES "priorities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_190d316f00d8d8400847bdb67fd" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9dce028e1d9addcde15b83a8bf2" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_54fc42a253a8338488ec1f960ad" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_03c82619d37f3e241bc77cbcca5" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_47b9998e6fef04f3e85e1e60948" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner, force = false): Promise<void> {
    if (!force && (await this.wasCreatedByBootstrap(queryRunner))) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" DROP CONSTRAINT "FK_47b9998e6fef04f3e85e1e60948"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" DROP CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_03c82619d37f3e241bc77cbcca5"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_54fc42a253a8338488ec1f960ad"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9dce028e1d9addcde15b83a8bf2"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_190d316f00d8d8400847bdb67fd"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_5d1c8f7898b5b84ad5ce08fcff8"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e28288969fa7827bd12680cfe10"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_ea76a982cfc3dd4bff34daaf036"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8dad765629e83229da6feda1c1"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f6d54f95c31b73fb1bdd8e91d0"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "project_members"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c655a93948868c0af4c102745e"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2a18b972050e6c282b8b2d43b8"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_50b2bedc5a6238a4e31b29e521"`);
    await queryRunner.query(`DROP TABLE "priorities"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9295efde62f0fef01cb82aba3a"`);
    await queryRunner.query(`DROP TABLE "task_statuses"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0ea3c457b5cfa806abddd277a5"`);
    await queryRunner.query(`DROP TABLE "task_types"`);
  }

  private async wasCreatedByBootstrap(queryRunner: QueryRunner): Promise<boolean> {
    const markerTable = 'task_core_migration_bootstrap';
    if (!(await queryRunner.hasTable(markerTable))) {
      return false;
    }

    const queryResult: unknown = await queryRunner.query(
      `SELECT "owns_core_schema" FROM "${markerTable}" WHERE "id" = 1`,
    );

    const firstRow: unknown = Array.isArray(queryResult)
      ? (queryResult as unknown[])[0]
      : undefined;

    return (
      typeof firstRow === 'object' &&
      firstRow !== null &&
      'owns_core_schema' in firstRow &&
      firstRow.owns_core_schema === true
    );
  }
}
