export function successResponse<T>({
  message,
  data,
}: {
  message: string;
  data: T;
}) {
  return {
    status_code: 200,
    message,
    error: null,
    data,
  };
}

export function successPaginationResponse<T>({
  message,
  data,
  meta,
}: {
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}) {
  return {
    status_code: 200,
    message,
    error: null,
    data,
    meta,
  };
}