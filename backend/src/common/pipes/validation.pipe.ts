import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true, // Strip properties that do not have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Allow type conversion (e.g., string to number)
      },
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        // Transform validation errors to a more readable format
        const errors = this.formatValidationErrors(validationErrors);
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        });
      },
    });
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    const processError = (error: ValidationError, parentPath = '') => {
      const propertyPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.constraints) {
        result[propertyPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => processError(child, propertyPath));
      }
    };

    errors.forEach((error) => processError(error));
    return result;
  }
}
