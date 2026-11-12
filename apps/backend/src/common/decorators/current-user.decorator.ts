import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom parameter decorator to extract the authenticated user from the HTTP request context.
 *
 * This decorator retrieves the user entity (or specific properties of it) that was attached
 * to `request.user` upstream by `JwtAuthGuard` and `JwtStrategy.validate()`.
 *
 * @usageNotes
 * Inject the entire authenticated user:
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) { ... }
 * ```
 *
 * Inject a specific property from the authenticated user:
 * ```typescript
 * @Get('id')
 * getId(@CurrentUser('id') userId: string) { ... }
 * ```
 *
 * @param data Optional property name to pluck from the authenticated user object.
 * @param ctx The NestJS execution context providing access to the underlying HTTP request.
 * @returns The plucked property value if `data` is provided and exists; otherwise, the full authenticated user object or undefined.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);

