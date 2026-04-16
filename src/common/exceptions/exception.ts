import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface AppErrorDefinition {
  statusCode: number;
  error: string;
  message: string;
}

export interface AppErrorBody {
  message: string;
  error: string;
  data: unknown;
}

export interface AppErrorResponse extends AppErrorBody {
  status_code: number;
}

export interface ValidationIssue {
  field: string;
  messages: string[];
}

type HttpExceptionResponseBody =
  | string
  | {
    message?: string | string[];
    error?: string;
    data?: unknown;
  };

export const APP_ERROR_DEFINITIONS = {
  common: {
    validation: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'VALIDATION_ERROR',
      message: 'Du lieu gui len khong hop le',
    },
    notFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'NOT_FOUND',
      message: 'Khong tim thay tai nguyen',
    },
    internalServerError: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Loi he thong',
    },
  },
  auth: {
    invalidCredentials: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_CREDENTIALS',
      message: 'Email hoac mat khau khong dung',
    },
    accountDisabled: {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'ACCOUNT_DISABLED',
      message: 'Tai khoan da bi vo hieu hoa',
    },
    accessTokenMissing: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'ACCESS_TOKEN_MISSING',
      message: 'Khong tim thay access token',
    },
    invalidAccessToken: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_ACCESS_TOKEN',
      message: 'Access token khong hop le hoac da het han',
    },
    refreshTokenMissing: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'REFRESH_TOKEN_MISSING',
      message: 'Khong tim thay refresh token',
    },
    refreshSecretNotConfigured: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'REFRESH_SECRET_NOT_CONFIGURED',
      message: 'JWT_REFRESH_SECRET chua duoc cau hinh',
    },
    invalidRefreshToken: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token khong hop le hoac da het han',
    },
    invalidTokenType: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_TOKEN_TYPE',
      message: 'Sai loai token',
    },
    invalidRefreshPayload: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_REFRESH_PAYLOAD',
      message: 'Payload refresh token khong hop le',
    },
    userNotFound: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'AUTH_USER_NOT_FOUND',
      message: 'Nguoi dung khong ton tai',
    },
    refreshSessionNotFound: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'REFRESH_SESSION_NOT_FOUND',
      message: 'Phien dang nhap khong con ton tai',
    },
    invalidRefreshSession: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'INVALID_REFRESH_SESSION',
      message: 'Du lieu phien dang nhap khong hop le',
    },
    refreshTokenMismatch: {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'REFRESH_TOKEN_MISMATCH',
      message: 'Refresh token khong khop hoac da bi rotate',
    },
    loginSessionCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'LOGIN_SESSION_CREATION_FAILED',
      message: 'Khong the tao phien dang nhap',
    },
    usernameAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'USERNAME_ALREADY_EXISTS',
      message: 'Username da ton tai',
    },
    passwordHashFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PASSWORD_HASH_FAILED',
      message: 'Khong the ma hoa mat khau',
    },
    accountCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'ACCOUNT_CREATION_FAILED',
      message: 'Khong the tao tai khoan',
    },
  },
  project: {
    authRequired: {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'AUTH_REQUIRED',
      message: 'Ban chua dang nhap',
    },
    projectIdMissing: {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'PROJECT_ID_MISSING',
      message: 'Khong xac dinh duoc projectId de kiem tra quyen',
    },
    membershipRequired: {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'PROJECT_MEMBERSHIP_REQUIRED',
      message: 'Ban khong thuoc project nay',
    },
    permissionDenied: {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'PROJECT_PERMISSION_DENIED',
      message: 'Ban khong co quyen thuc hien hanh dong nay',
    },

    projectKeyAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'PROJECT_KEY_ALREADY_EXISTS',
      message: 'Project key da ton tai',
    },
    projectNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PROJECT_NOT_FOUND',
      message: 'Project khong ton tai',
    },
    adminRoleNotSeeded: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_ADMIN_ROLE_NOT_SEEDED',
      message: 'Thieu role admin, vui long seed du lieu role truoc',
    },
    projectCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_CREATION_FAILED',
      message: 'Khong the tao project',
    },
    projectUpdateFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_UPDATE_FAILED',
      message: 'Khong the cap nhat project',
    },
    projectDeleteFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_DELETE_FAILED',
      message: 'Khong the xoa project',
    },
    projectUpdatePayloadEmpty: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'PROJECT_UPDATE_PAYLOAD_EMPTY',
      message: 'Khong co du lieu hop le de cap nhat project',
    },
    memberAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'PROJECT_MEMBER_ALREADY_EXISTS',
      message: 'Nguoi dung da thuoc project nay',
    },
    memberNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PROJECT_MEMBER_NOT_FOUND',
      message: 'Khong tim thay thanh vien trong project',
    },
    roleNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PROJECT_ROLE_NOT_FOUND',
      message: 'Role khong ton tai',
    },
    ownerRemovalNotAllowed: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'PROJECT_OWNER_REMOVAL_NOT_ALLOWED',
      message: 'Khong duoc xoa owner khoi project',
    },
    ownerRoleChangeNotAllowed: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'PROJECT_OWNER_ROLE_CHANGE_NOT_ALLOWED',
      message: 'Khong duoc thay doi role cua owner project',
    },
    memberCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_MEMBER_CREATION_FAILED',
      message: 'Khong the them thanh vien vao project',
    },
    memberRoleUpdateFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_MEMBER_ROLE_UPDATE_FAILED',
      message: 'Khong the cap nhat role thanh vien',
    },
    memberDeletionFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PROJECT_MEMBER_DELETION_FAILED',
      message: 'Khong the xoa thanh vien khoi project',
    },
  },
  task: {
    taskNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_NOT_FOUND',
      message: 'Task khong ton tai',
    },
    taskTypeNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_TYPE_NOT_FOUND',
      message: 'Loai task khong ton tai',
    },
    taskStatusNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_STATUS_NOT_FOUND',
      message: 'Trang thai task khong ton tai',
    },
    priorityNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_PRIORITY_NOT_FOUND',
      message: 'Do uu tien khong ton tai',
    },
    assigneeNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_ASSIGNEE_NOT_FOUND',
      message: 'Nguoi duoc giao task khong ton tai',
    },
    assigneeNotInProject: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'TASK_ASSIGNEE_NOT_IN_PROJECT',
      message: 'Nguoi duoc giao khong thuoc project nay',
    },
    parentTaskNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PARENT_TASK_NOT_FOUND',
      message: 'Task cha khong ton tai',
    },
    parentTaskDifferentProject: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'PARENT_TASK_DIFFERENT_PROJECT',
      message: 'Task cha khong thuoc cung project',
    },
    invalidParentTask: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'INVALID_PARENT_TASK',
      message: 'Task khong the la cha cua chinh no',
    },
    taskCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_CREATION_FAILED',
      message: 'Khong the tao task',
    },
    taskUpdateFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_UPDATE_FAILED',
      message: 'Khong the cap nhat task',
    },
    taskDeleteFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_DELETE_FAILED',
      message: 'Khong the xoa task',
    },
    taskUpdatePayloadEmpty: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'TASK_UPDATE_PAYLOAD_EMPTY',
      message: 'Khong co du lieu hop le de cap nhat task',
    },
    boardLoadFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'BOARD_LOAD_FAILED',
      message: 'Khong the tai du lieu board',
    },
    taskStatusUpdateFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_STATUS_UPDATE_FAILED',
      message: 'Khong the cap nhat trang thai task',
    },
    commentNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'TASK_COMMENT_NOT_FOUND',
      message: 'Comment khong ton tai',
    },
    commentCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_COMMENT_CREATION_FAILED',
      message: 'Khong the tao comment',
    },
    commentDeletionFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_COMMENT_DELETION_FAILED',
      message: 'Khong the xoa comment',
    },
    historyLoadFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_HISTORY_LOAD_FAILED',
      message: 'Khong the tai lich su task',
    },
    historyCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_HISTORY_CREATION_FAILED',
      message: 'Khong the ghi lich su task',
    },
    taskTypeAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'TASK_TYPE_ALREADY_EXISTS',
      message: 'Loai task da ton tai',
    },
    taskStatusAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'TASK_STATUS_ALREADY_EXISTS',
      message: 'Trang thai task da ton tai',
    },
    priorityAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'PRIORITY_ALREADY_EXISTS',
      message: 'Do uu tien da ton tai',
    },
    taskTypeCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_TYPE_CREATION_FAILED',
      message: 'Khong the tao loai task',
    },
    taskStatusCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'TASK_STATUS_CREATION_FAILED',
      message: 'Khong the tao trang thai task',
    },
    priorityCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'PRIORITY_CREATION_FAILED',
      message: 'Khong the tao do uu tien',
    },
  },
  aiAssignment: {
    skillNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'AI_SKILL_NOT_FOUND',
      message: 'Skill khong ton tai',
    },
    skillAlreadyExists: {
      statusCode: HttpStatus.CONFLICT,
      error: 'AI_SKILL_ALREADY_EXISTS',
      message: 'Skill da ton tai cho user nay',
    },
    skillCreationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_SKILL_CREATION_FAILED',
      message: 'Khong the tao skill cho user',
    },
    skillUpdateFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_SKILL_UPDATE_FAILED',
      message: 'Khong the cap nhat skill',
    },
    skillDeletionFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_SKILL_DELETION_FAILED',
      message: 'Khong the xoa skill',
    },
    recommendationFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_RECOMMENDATION_FAILED',
      message: 'Khong the goi y nguoi phu hop',
    },
    recommendationLogFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_RECOMMENDATION_LOG_FAILED',
      message: 'Khong the luu log goi y AI',
    },
    noCandidates: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'AI_NO_CANDIDATES',
      message: 'Khong co ung vien nao de goi y',
    },
    aiServiceCallFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_SERVICE_CALL_FAILED',
      message: 'Khong the goi AI service',
    },
    invalidRecommendation: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_INVALID_RECOMMENDATION',
      message: 'Ket qua goi y cua AI khong hop le',
    },
    recommendationNotFound: {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'AI_RECOMMENDATION_NOT_FOUND',
      message: 'Khong tim thay goi y AI cho task nay',
    },
    recommendationUserInvalid: {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'AI_RECOMMENDATION_USER_INVALID',
      message: 'Nguoi duoc AI goi y khong hop le hoac khong con thuoc project',
    },
    recommendationLoadFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_RECOMMENDATION_LOAD_FAILED',
      message: 'Khong the tai du lieu goi y AI',
    },
    aiAssignFailed: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'AI_ASSIGN_FAILED',
      message: 'Khong the ap dung goi y AI vao task',
    },
  },
} as const satisfies Record<string, Record<string, AppErrorDefinition>>;

export class AppException extends HttpException {
  readonly code: string;
  readonly data: unknown;

  constructor(definition: AppErrorDefinition, options: { message?: string; data?: unknown } = {}) {
    const body = createErrorBody(
      options.message ?? definition.message,
      definition.error,
      options.data,
    );

    super(body, definition.statusCode);
    this.code = definition.error;
    this.data = body.data;
  }
}

export const AppErrors = {
  common: {
    validation: (errors: ValidationError[]) =>
      new AppException(APP_ERROR_DEFINITIONS.common.validation, {
        data: flattenValidationErrors(errors),
      }),
    validationMessages: (messages: string[]) =>
      new AppException(APP_ERROR_DEFINITIONS.common.validation, {
        data: messages.map((message) => ({
          field: 'request',
          messages: [message],
        })),
      }),
    notFound: (message?: string) =>
      new AppException(APP_ERROR_DEFINITIONS.common.notFound, { message }),
    internalServerError: (message?: string) =>
      new AppException(APP_ERROR_DEFINITIONS.common.internalServerError, { message }),
  },
  auth: {
    invalidCredentials: () => new AppException(APP_ERROR_DEFINITIONS.auth.invalidCredentials),
    accountDisabled: () => new AppException(APP_ERROR_DEFINITIONS.auth.accountDisabled),
    accessTokenMissing: () => new AppException(APP_ERROR_DEFINITIONS.auth.accessTokenMissing),
    invalidAccessToken: () => new AppException(APP_ERROR_DEFINITIONS.auth.invalidAccessToken),
    refreshTokenMissing: () => new AppException(APP_ERROR_DEFINITIONS.auth.refreshTokenMissing),
    refreshSecretNotConfigured: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.refreshSecretNotConfigured),
    invalidRefreshToken: () => new AppException(APP_ERROR_DEFINITIONS.auth.invalidRefreshToken),
    invalidTokenType: () => new AppException(APP_ERROR_DEFINITIONS.auth.invalidTokenType),
    invalidRefreshPayload: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.invalidRefreshPayload),
    userNotFound: () => new AppException(APP_ERROR_DEFINITIONS.auth.userNotFound),
    refreshSessionNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.refreshSessionNotFound),
    invalidRefreshSession: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.invalidRefreshSession),
    refreshTokenMismatch: () => new AppException(APP_ERROR_DEFINITIONS.auth.refreshTokenMismatch),
    loginSessionCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.loginSessionCreationFailed),
    usernameAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.auth.usernameAlreadyExists),
    passwordHashFailed: () => new AppException(APP_ERROR_DEFINITIONS.auth.passwordHashFailed),
    accountCreationFailed: () => new AppException(APP_ERROR_DEFINITIONS.auth.accountCreationFailed),
  },
  project: {
    authRequired: () => new AppException(APP_ERROR_DEFINITIONS.project.authRequired),
    projectIdMissing: () => new AppException(APP_ERROR_DEFINITIONS.project.projectIdMissing),
    membershipRequired: () => new AppException(APP_ERROR_DEFINITIONS.project.membershipRequired),
    permissionDenied: () => new AppException(APP_ERROR_DEFINITIONS.project.permissionDenied),

    projectKeyAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectKeyAlreadyExists),
    projectNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectNotFound),
    adminRoleNotSeeded: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.adminRoleNotSeeded),
    projectCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectCreationFailed),
    projectUpdateFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectUpdateFailed),
    projectDeleteFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectDeleteFailed),
    projectUpdatePayloadEmpty: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.projectUpdatePayloadEmpty),
    memberAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.memberAlreadyExists),
    memberNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.memberNotFound),
    roleNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.roleNotFound),
    ownerRemovalNotAllowed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.ownerRemovalNotAllowed),
    ownerRoleChangeNotAllowed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.ownerRoleChangeNotAllowed),
    memberCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.memberCreationFailed),
    memberRoleUpdateFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.memberRoleUpdateFailed),
    memberDeletionFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.project.memberDeletionFailed),
  },
  task: {
    taskNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.taskNotFound),
    taskTypeNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.taskTypeNotFound),
    taskStatusNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.taskStatusNotFound),
    priorityNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.priorityNotFound),
    assigneeNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.assigneeNotFound),
    assigneeNotInProject: () => new AppException(APP_ERROR_DEFINITIONS.task.assigneeNotInProject),
    parentTaskNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.parentTaskNotFound),
    parentTaskDifferentProject: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.parentTaskDifferentProject),
    invalidParentTask: () => new AppException(APP_ERROR_DEFINITIONS.task.invalidParentTask),
    taskCreationFailed: () => new AppException(APP_ERROR_DEFINITIONS.task.taskCreationFailed),
    taskUpdateFailed: () => new AppException(APP_ERROR_DEFINITIONS.task.taskUpdateFailed),
    taskDeleteFailed: () => new AppException(APP_ERROR_DEFINITIONS.task.taskDeleteFailed),
    taskUpdatePayloadEmpty: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskUpdatePayloadEmpty),
    boardLoadFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.boardLoadFailed),
    taskStatusUpdateFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskStatusUpdateFailed),
    commentNotFound: () => new AppException(APP_ERROR_DEFINITIONS.task.commentNotFound),
    commentCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.commentCreationFailed),
    commentDeletionFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.commentDeletionFailed),
    historyLoadFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.historyLoadFailed),
    historyCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.historyCreationFailed),
    taskTypeAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskTypeAlreadyExists),
    taskStatusAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskStatusAlreadyExists),
    priorityAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.priorityAlreadyExists),
    taskTypeCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskTypeCreationFailed),
    taskStatusCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.taskStatusCreationFailed),
    priorityCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.task.priorityCreationFailed),
  },
  aiAssignment: {
    skillNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.skillNotFound),
    skillAlreadyExists: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.skillAlreadyExists),
    skillCreationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.skillCreationFailed),
    skillUpdateFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.skillUpdateFailed),
    skillDeletionFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.skillDeletionFailed),
    recommendationFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.recommendationFailed),
    recommendationLogFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.recommendationLogFailed),
    noCandidates: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.noCandidates),
    aiServiceCallFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.aiServiceCallFailed),
    invalidRecommendation: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.invalidRecommendation),
    recommendationNotFound: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.recommendationNotFound),
    recommendationUserInvalid: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.recommendationUserInvalid),
    recommendationLoadFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.recommendationLoadFailed),
    aiAssignFailed: () =>
      new AppException(APP_ERROR_DEFINITIONS.aiAssignment.aiAssignFailed),
  },
  
} as const;

export function buildErrorResponse(statusCode: number, body: AppErrorBody): AppErrorResponse {
  return {
    status_code: statusCode,
    message: body.message,
    error: body.error,
    data: body.data ?? null,
  };
}

export function fromAppException(exception: AppException): AppErrorResponse {
  return buildErrorResponse(exception.getStatus(), exception.getResponse() as AppErrorBody);
}

export function normalizeHttpException(exception: HttpException): AppErrorResponse {
  const status = exception.getStatus();
  const response = exception.getResponse() as HttpExceptionResponseBody;

  if (typeof response === 'string') {
    return buildErrorResponse(status, {
      message: response,
      error: getHttpErrorCode(status, response),
      data: null,
    });
  }

  if (Array.isArray(response?.message)) {
    return fromAppException(AppErrors.common.validationMessages(response.message));
  }

  const message =
    typeof response?.message === 'string' ? response.message : getDefaultHttpMessage(status);

  return buildErrorResponse(status, {
    message,
    error: getHttpErrorCode(status, response?.error),
    data: response?.data ?? null,
  });
}

function createErrorBody(message: string, error: string, data: unknown = null): AppErrorBody {
  return {
    message,
    error,
    data: data ?? null,
  };
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const issues: ValidationIssue[] = [];

    if (error.constraints) {
      issues.push({
        field,
        messages: Object.values(error.constraints),
      });
    }

    if (error.children?.length) {
      issues.push(...flattenValidationErrors(error.children, field));
    }

    return issues;
  });
}

function getDefaultHttpMessage(status: number): string {
  switch (status) {
    case HttpStatus.NOT_FOUND:
      return APP_ERROR_DEFINITIONS.common.notFound.message;
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return APP_ERROR_DEFINITIONS.common.internalServerError.message;
    default:
      return 'HTTP error';
  }
}

function getHttpErrorCode(status: number, rawError?: string): string {
  const normalized = normalizeErrorCode(rawError);
  if (normalized) {
    return normalized;
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return 'INTERNAL_SERVER_ERROR';
    default:
      return 'HTTP_ERROR';
  }
}

function normalizeErrorCode(value?: string): string | null {
  if (!value) {
    return null;
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
