import AppError from './AppError.js';

export class EndpointNotFoundError extends AppError {
  constructor(message: string = 'Endpoint not found') {
    super(message, 404);
    this.type = 'NotFound';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error') {
    super(message, 400);
    this.type = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'User not authenticated') {
    super(message, 401);
    this.type = 'AuthenticationError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.type = 'ConflictError';
  }
}
