export const ActivityAction = {
  PROJECT_CREATED: 'project_created',
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_ASSIGNEE_CHANGED: 'task_assignee_changed',
  TASK_COMMENTED: 'task_commented',
  PROJECT_MEMBER_ADDED: 'project_member_added',
  PROJECT_MEMBER_REMOVED: 'project_member_removed',
} as const;

export type ActivityActionType =
  (typeof ActivityAction)[keyof typeof ActivityAction];