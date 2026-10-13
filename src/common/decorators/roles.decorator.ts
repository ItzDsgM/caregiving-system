import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/**
 * Metadata key used by NestJS Reflector to store and extract role restrictions.
 * Evaluated by `RolesGuard` to enforce role-based access control (RBAC).
 */
export const ROLES_KEY = 'roles';

/**
 * Role-Based Access Control (RBAC) decorator for controllers and route handlers.
 *
 * Attaches metadata containing the allowed `UserRole` values to the target handler or class.
 * When combined with `JwtAuthGuard` and `RolesGuard`, incoming requests are evaluated:
 * if the authenticated user's assigned role is not present in the allowed list,
 * an HTTP 403 Forbidden exception is raised.
 *
 * @usageNotes
 * Apply to an individual route handler:
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Get('admin/users')
 * getAdminUsers() { ... }
 * ```
 *
 * Multiple roles can be specified:
 * ```typescript
 * @Roles(UserRole.CLIENT, UserRole.ADMIN)
 * ```
 *
 * @param roles One or more `UserRole` enum values permitted to invoke the endpoint.
 * @returns A custom metadata decorator configured with the `roles` key.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

