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
