import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authentication guard that enforces presence and validity of JWT Bearer tokens.
 * Wraps Passport's 'jwt' strategy and yields custom UnauthorizedException messages upon error or absence.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Custom request handler overriding Passport's default failure behavior.
   *
   * @param err - Error encountered during token extraction/validation.
   * @param user - Resolved user entity returned by JwtStrategy.validate.
   * @param _info - Additional strategy info or error tokens.
   * @returns Resolved user entity attached to request.
   * @throws UnauthorizedException If token is missing, expired, or invalid.
   */
  handleRequest<TUser = any>(err: any, user: any, _info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token is invalid or expired');
    }
    return user;
  }
}
