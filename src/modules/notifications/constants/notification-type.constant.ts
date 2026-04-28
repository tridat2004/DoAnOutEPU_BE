export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_DEADLINE_CHANGED: 'task_deadline_changed',
  TASK_COMMENTED: 'task_commented',
  PROJECT_MEMBER_ADDED: 'project_member_added',
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];