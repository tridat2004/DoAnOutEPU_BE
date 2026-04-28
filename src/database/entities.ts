import { ActivityLog } from '../modules/activity/entities/activity-log.entity';
import { AiAssignmentLog } from '../modules/ai-assignment/entities/ai-assignment-log.entity';
import { UserSkill } from '../modules/ai-assignment/entities/user-skill.entity';
import { Permission } from '../modules/auth/entities/permission.entity';
import { RolePermission } from '../modules/auth/entities/role-permission.entity';
import { Role } from '../modules/auth/entities/role.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ProjectMember } from '../modules/projects/entities/project-member.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { TaskComment, TaskHistory } from '../modules/tasks/entities';
import { Priority } from '../modules/tasks/entities/priority.entity';
import { TaskStatus } from '../modules/tasks/entities/task-status.entity';
import { TaskType } from '../modules/tasks/entities/task-type.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { User } from '../modules/users/entities/user.entity';

export const databaseEntities = [
  User,
  Role,
  Permission,
  RolePermission,
  Project,
  ProjectMember,
  TaskType,
  TaskStatus,
  Priority,
  Task,
  TaskComment,
  TaskHistory,
  UserSkill,
  AiAssignmentLog,
  Notification,
  ActivityLog,
] as const;
