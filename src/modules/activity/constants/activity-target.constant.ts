export const ActivityTargetType = {
  PROJECT: 'project',
  BOARD: 'board',
  BOARD_COLUMN: 'board_column',
  TASK: 'task',
  MEMBER: 'member',
  COMMENT: 'comment',
} as const;

export type ActivityTargetTypeValue =
  (typeof ActivityTargetType)[keyof typeof ActivityTargetType];
