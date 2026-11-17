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
import { TaskCommentAttachment } from '../modules/tasks/entities/task-comment-attachment.entity';
import { TaskCommentReaction } from '../modules/tasks/entities/task-comment-reaction.entity';
import { TaskStatus } from '../modules/tasks/entities/task-status.entity';
import { TaskType } from '../modules/tasks/entities/task-type.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { User } from '../modules/users/entities/user.entity';
import { Board } from '../modules/board/entities/board.entity';
import { BoardColumn } from '../modules/board/entities/board-column.entity';

export const databaseEntities = [
  User,
  Role,
  Permission,
  RolePermission,
  Project,
  ProjectMember,
  Board,
  BoardColumn,
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
  TaskCommentAttachment,
  TaskCommentReaction,
] as const;
