import { UserRole } from '../enums/user-role.enum';

/**
 * Standard shape of the claims embedded in signed JSON Web Tokens (JWT).
 *
 * Populated during authentication (`AuthService.login`), signed by `@nestjs/jwt`,
 * and verified and extracted on incoming requests by `JwtStrategy.validate()`.
 */
export interface JwtPayload {
  /**
   * Subject claim containing the user's unique primary identifier (UUID).
   */
  sub: string;

  /**
   * Canonical email address of the authenticated user.
   */
  email: string;

  /**
   * Assigned system role of the authenticated user (`CAREGIVER`, `CLIENT`, or `ADMIN`),
   * used for Role-Based Access Control (RBAC) enforcement by `RolesGuard`.
   */
  role: UserRole;
}

