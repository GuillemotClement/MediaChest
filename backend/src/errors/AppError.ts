class AppError extends Error {
  readonly status: number;
  type: string;
  readonly isOperationnal: boolean;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.type = 'ApplicationError';
    this.isOperationnal = true;
  }
}

export default AppError;
