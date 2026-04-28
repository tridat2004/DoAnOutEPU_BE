export const ActivityTargetType = {
  PROJECT: 'project',
  TASK: 'task',
  MEMBER: 'member',
  COMMENT: 'comment',
} as const;

export type ActivityTargetTypeValue =
  (typeof ActivityTargetType)[keyof typeof ActivityTargetType];