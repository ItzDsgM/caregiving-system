import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

/**
 * Passport strategy implementing JWT Bearer token authentication.
 * Extracts the Bearer token from the incoming HTTP Authorization header,
 * verifies its signature using the configured JWT_SECRET, and resolves the User entity.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super_secret_jwt_key_change_in_production',
      ),
    });
  }

  /**
   * Validates the decoded JWT payload by verifying the user exists in the database
   * and confirms the account has not been deactivated or suspended.
   *
   * @param payload - Decoded JWT payload containing subject ID, email, and role.
   * @returns Active User entity attached to the Express request object (`req.user`).
   * @throws ForbiddenException If the user account is suspended or inactive.
   * @throws UnauthorizedException If the user no longer exists or the token is invalid.
   */
  async validate(payload: JwtPayload & { iat?: number }): Promise<User> {
    try {
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User account no longer exists');
      }
      if (!user.isActive) {
        throw new ForbiddenException('Usuario suspendido o inactivo');
      }
      if (user.lastLogoutAt && payload.iat) {
        const tokenIssuedAt = payload.iat * 1000;
        const lastLogoutAt = new Date(user.lastLogoutAt).getTime();
        if (tokenIssuedAt <= lastLogoutAt) {
          throw new UnauthorizedException(
            'Session expired or logged out. Please log in again.',
          );
        }
      }
      return user;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
