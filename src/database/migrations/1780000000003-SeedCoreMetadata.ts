import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCoreMetadata1780000000003 implements MigrationInterface {
  name = 'SeedCoreMetadata1780000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "created_at", "updated_at", "code", "name")
      VALUES
        (gen_random_uuid(), now(), now(), 'admin', 'Project Admin'),
        (gen_random_uuid(), now(), now(), 'manager', 'Manager'),
        (gen_random_uuid(), now(), now(), 'member', 'Member'),
        (gen_random_uuid(), now(), now(), 'viewer', 'Viewer')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "name")
      VALUES
        (gen_random_uuid(), now(), now(), 'project.view', 'View project'),
        (gen_random_uuid(), now(), now(), 'project.update', 'Update project'),
        (gen_random_uuid(), now(), now(), 'project.delete', 'Delete project'),
        (gen_random_uuid(), now(), now(), 'project.manage_members', 'Manage project members'),
        (gen_random_uuid(), now(), now(), 'board.manage', 'Manage board'),
        (gen_random_uuid(), now(), now(), 'task.view', 'View tasks'),
        (gen_random_uuid(), now(), now(), 'task.create', 'Create tasks'),
        (gen_random_uuid(), now(), now(), 'task.update', 'Update tasks'),
        (gen_random_uuid(), now(), now(), 'task.delete', 'Delete tasks'),
        (gen_random_uuid(), now(), now(), 'task.comment', 'Comment on tasks'),
        (gen_random_uuid(), now(), now(), 'task.assign', 'Assign tasks')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions"
        ("id", "created_at", "updated_at", "role_id", "permission_id")
      SELECT gen_random_uuid(), now(), now(), role."id", permission."id"
      FROM "roles" role
      CROSS JOIN "permissions" permission
      WHERE
        role."code" IN ('admin', 'manager')
        OR (
          role."code" = 'member'
          AND permission."code" IN (
            'project.view', 'task.view', 'task.create', 'task.update',
            'task.delete', 'task.comment', 'task.assign'
          )
        )
        OR (
          role."code" = 'viewer'
          AND permission."code" IN ('project.view', 'task.view')
        )
      ON CONFLICT ON CONSTRAINT "uq_role_permissions_role_permission" DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "task_types" ("id", "created_at", "updated_at", "code", "name")
      VALUES (gen_random_uuid(), now(), now(), 'task', 'Task')
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "task_statuses"
        ("id", "created_at", "updated_at", "code", "name", "color", "position")
      VALUES
        (gen_random_uuid(), now(), now(), 'todo', 'To Do', '#64748B', 0),
        (gen_random_uuid(), now(), now(), 'in_progress', 'In Progress', '#3B82F6', 1),
        (gen_random_uuid(), now(), now(), 'done', 'Done', '#22C55E', 2)
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "priorities"
        ("id", "created_at", "updated_at", "code", "name", "weight")
      VALUES
        (gen_random_uuid(), now(), now(), 'low', 'Low', 1),
        (gen_random_uuid(), now(), now(), 'medium', 'Medium', 2),
        (gen_random_uuid(), now(), now(), 'high', 'High', 3),
        (gen_random_uuid(), now(), now(), 'urgent', 'Urgent', 4)
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(): Promise<void> {
    // Reference data may already be in use, so rollback intentionally preserves it.
  }
}
