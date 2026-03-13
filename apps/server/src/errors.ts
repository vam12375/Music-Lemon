/**
 * 自定义业务错误，携带 HTTP 状态码与业务 code
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
