import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { In, type EntityManager } from 'typeorm';
import dataSource from '../datasource';
import { Permission } from '../../modules/auth/entities/permission.entity';
import { Role } from '../../modules/auth/entities/role.entity';
import { RolePermission } from '../../modules/auth/entities/role-permission.entity';
import { SystemRole } from '../../modules/auth/constants/system-role.constant';
import { ProjectStatus } from '../../modules/projects/constants/project-status.constant';
import { Project } from '../../modules/projects/entities/project.entity';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Board } from '../../modules/board/entities/board.entity';
import { BoardColumn } from '../../modules/board/entities/board-column.entity';
import { TaskStatus } from '../../modules/tasks/entities/task-status.entity';

const ROLE_DEFINITIONS = [
  { code: 'admin', name: 'Project Admin' },
  { code: 'manager', name: 'Manager' },
  { code: 'member', name: 'Member' },
  { code: 'viewer', name: 'Viewer' },
] as const;

const PERMISSION_DEFINITIONS = [
  { code: 'project.view', name: 'View project' },
  { code: 'project.update', name: 'Update project' },
  { code: 'project.delete', name: 'Delete project' },
  { code: 'project.manage_members', name: 'Manage project members' },
  { code: 'board.manage', name: 'Manage board' },
  { code: 'task.view', name: 'View tasks' },
  { code: 'task.create', name: 'Create tasks' },
  { code: 'task.update', name: 'Update tasks' },
  { code: 'task.delete', name: 'Delete tasks' },
  { code: 'task.comment', name: 'Comment on tasks' },
  { code: 'task.assign', name: 'Assign tasks' },
] as const;

const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map((permission) => permission.code);
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  admin: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS,
  member: [
    'project.view',
    'task.view',
    'task.create',
    'task.update',
    'task.delete',
    'task.comment',
    'task.assign',
  ],
  viewer: ['project.view', 'task.view'],
};

type SeedAccount = {
  email: string;
  username: string;
  fullName: string;
  systemRole: SystemRole;
  projectRole?: keyof typeof ROLE_PERMISSIONS;
};

function getSeedAccounts(): SeedAccount[] {
  return [
    {
      email: process.env.SEED_SYSTEM_ADMIN_EMAIL ?? 'system.admin@example.com',
      username: 'system.admin',
      fullName: 'System Admin',
      systemRole: SystemRole.ADMIN,
    },
    {
      email: process.env.SEED_PROJECT_ADMIN_EMAIL ?? 'project.admin@example.com',
      username: 'project.admin',
      fullName: 'Project Admin',
      systemRole: SystemRole.USER,
      projectRole: 'admin',
    },
    {
      email: process.env.SEED_MANAGER_EMAIL ?? 'manager@example.com',
      username: 'manager',
      fullName: 'Project Manager',
      systemRole: SystemRole.USER,
      projectRole: 'manager',
    },
    {
      email: process.env.SEED_MEMBER_EMAIL ?? 'member@example.com',
      username: 'member',
      fullName: 'Project Member',
      systemRole: SystemRole.USER,
      projectRole: 'member',
    },
    {
      email: process.env.SEED_VIEWER_EMAIL ?? 'viewer@example.com',
      username: 'viewer',
      fullName: 'Project Viewer',
      systemRole: SystemRole.USER,
      projectRole: 'viewer',
    },
  ];
}

async function seedRolesAndPermissions(manager: EntityManager) {
  const roleRepository = manager.getRepository(Role);
  const permissionRepository = manager.getRepository(Permission);
  const rolePermissionRepository = manager.getRepository(RolePermission);

  await roleRepository.upsert(
    ROLE_DEFINITIONS.map((role) => ({ ...role })),
    ['code'],
  );
  await permissionRepository.upsert(
    PERMISSION_DEFINITIONS.map((permission) => ({ ...permission })),
    ['code'],
  );

  const roles = await roleRepository.find();
  const permissions = await permissionRepository.find();
  const seededRoleCodes: string[] = ROLE_DEFINITIONS.map((role) => role.code);

  await rolePermissionRepository
    .createQueryBuilder()
    .delete()
    .where('role_id IN (:...roleIds)', {
      roleIds: roles.filter((role) => seededRoleCodes.includes(role.code)).map((role) => role.id),
    })
    .execute();

  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));
  const assignments = roles
    .filter((role) => ROLE_PERMISSIONS[role.code])
    .flatMap((role) =>
      ROLE_PERMISSIONS[role.code].map((permissionCode) => {
        const permission = permissionByCode.get(permissionCode);
        if (!permission) throw new Error(`Permission ${permissionCode} was not seeded`);
        return rolePermissionRepository.create({ role, permission });
      }),
    );

  await rolePermissionRepository.save(assignments);
}

async function seedAccountsAndProject(manager: EntityManager, password: string) {
  const userRepository = manager.getRepository(User);
  const projectRepository = manager.getRepository(Project);
  const memberRepository = manager.getRepository(ProjectMember);
  const roleRepository = manager.getRepository(Role);
  const passwordHash = await bcrypt.hash(password, 10);
  const accounts = getSeedAccounts();
  const users = new Map<string, User>();

  for (const account of accounts) {
    const email = account.email.trim().toLowerCase();
    let user = await userRepository.findOne({
      where: [{ email }, { username: account.username }],
    });

    if (user && (user.email !== email || user.username !== account.username)) {
      throw new Error(`Email or username conflict for ${email}`);
    }

    user ??= userRepository.create();
    user.email = email;
    user.username = account.username;
    user.fullName = account.fullName;
    user.passwordHash = passwordHash;
    user.isActive = true;
    user.systemRole = account.systemRole;
    users.set(account.username, await userRepository.save(user));
  }

  const projectAdmin = users.get('project.admin');
  if (!projectAdmin) throw new Error('Project admin account was not seeded');

  const projectKey = (process.env.SEED_PROJECT_KEY ?? 'DEMO').trim().toUpperCase();
  const projectName = process.env.SEED_PROJECT_NAME?.trim() || 'Demo Project';
  let project = await projectRepository.findOne({
    where: { projectKey },
    withDeleted: true,
  });

  project ??= projectRepository.create();
  project.name = projectName;
  project.projectKey = projectKey;
  project.description = 'Project seeded for RBAC testing';
  project.startDate = null;
  project.endDate = null;
  project.status = ProjectStatus.ACTIVE;
  project.archivedAt = null;
  project.deletedAt = null;
  project.deletedBy = null;
  project.owner = projectAdmin;
  project = await projectRepository.save(project);

  const boardRepository = manager.getRepository(Board);
  const columnRepository = manager.getRepository(BoardColumn);
  let defaultBoard = await boardRepository.findOne({
    where: { project: { id: project.id }, isDefault: true },
  });
  defaultBoard ??= await boardRepository.save(
    boardRepository.create({
      project,
      name: 'Main Board',
      position: 0,
      isDefault: true,
    }),
  );

  const defaultStatuses = await manager.find(TaskStatus, {
    where: { code: In(['todo', 'in_progress', 'done']) },
    order: { position: 'ASC' },
  });
  const existingColumns = await columnRepository.find({
    where: { board: { id: defaultBoard.id } },
    relations: { status: true },
  });
  const existingStatusIds = new Set(existingColumns.map((column) => column.status.id));
  const missingColumns = defaultStatuses
    .filter((status) => !existingStatusIds.has(status.id))
    .map((status, index) =>
      columnRepository.create({
        board: defaultBoard,
        status,
        name: status.name,
        color: status.color ?? null,
        position: existingColumns.length + index,
        wipLimit: null,
      }),
    );
  if (missingColumns.length > 0) await columnRepository.save(missingColumns);

  const roles = new Map((await roleRepository.find()).map((role) => [role.code, role]));

  for (const account of accounts.filter((item) => item.projectRole)) {
    const user = users.get(account.username);
    const role = roles.get(account.projectRole!);
    if (!user || !role) throw new Error(`Unable to assign project role ${account.projectRole}`);

    let membership = await memberRepository.findOne({
      where: { project: { id: project.id }, user: { id: user.id } },
      relations: { project: true, user: true, role: true },
    });
    membership ??= memberRepository.create({ project, user, joinedAt: new Date() });
    membership.role = role;
    await memberRepository.save(membership);
  }
}

async function removeOrphanTaskStatuses(manager: EntityManager) {
  await manager.query(`
    DELETE FROM task_statuses status
    WHERE status.code LIKE 'column_%'
      AND NOT EXISTS (
        SELECT 1 FROM board_columns column_data WHERE column_data.status_id = status.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM tasks task WHERE task.status_id = status.id
      )
  `);
}

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Refusing to seed demo accounts in production without ALLOW_DEMO_SEED=true');
  }

  const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Seed123!';
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)) {
    throw new Error(
      'SEED_DEFAULT_PASSWORD must contain upper/lowercase, number and special character',
    );
  }

  await dataSource.initialize();
  await dataSource.transaction(async (manager) => {
    await seedRolesAndPermissions(manager);
    await seedAccountsAndProject(manager, password);
    await removeOrphanTaskStatuses(manager);
  });

  process.stdout.write('Seed completed: roles, permissions, demo project and role accounts\n');
}

seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
