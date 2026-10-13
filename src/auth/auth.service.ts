import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { BulkRegisterDto } from './dtos/bulk-register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { TwoFactorAuthenticateDto } from './dtos/two-factor.dto';
import {
  generateTotpSecret,
  verifyTotp,
  generateOtpauthUrl,
} from './utils/totp.util';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers a new user (either CAREGIVER or CLIENT) within an atomic database transaction.
   * If the role is CAREGIVER, an associated empty CaregiverProfile is automatically initialized.
   *
   * @param registerDto - Data transfer object containing registration details (email, password, names, phone, role).
   * @returns The newly created user entity without the sensitive password field.
   * @throws BadRequestException If an attempt is made to register publicly with the ADMIN role.
   * @throws ConflictException If the provided email address is already registered in the system.
   */
  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    if (registerDto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin role cannot be registered publicly');
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: registerDto.role,
        isActive: true,
      });

      const savedUser = await queryRunner.manager.save(user);

      if (registerDto.role === UserRole.CAREGIVER) {
        const caregiverProfile = queryRunner.manager.create(CaregiverProfile, {
          userId: savedUser.id,
        });
        await queryRunner.manager.save(caregiverProfile);
      }

      await queryRunner.commitTransaction();
      return this.sanitizeUser(savedUser);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Registers multiple users in bulk within a single atomic database transaction.
   * Validates duplicate emails within the payload and against existing records before execution.
   *
   * @param bulkDto - DTO containing an array of user registration payloads.
   * @returns Object containing the total count and list of sanitized created users.
   * @throws BadRequestException If internal duplicate emails exist or an ADMIN role is present.
   * @throws ConflictException If any email is already registered in the database.
   */
  async bulkRegister(
    bulkDto: BulkRegisterDto,
  ): Promise<{ count: number; users: Omit<User, 'password'>[] }> {
    const emails = bulkDto.users.map((u) => u.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      throw new BadRequestException('Duplicate emails found within the registration payload');
    }

    for (const dto of bulkDto.users) {
      if (dto.role === UserRole.ADMIN) {
        throw new BadRequestException('Admin role cannot be registered publicly');
      }
      const existingUser = await this.usersService.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException(`Email "${dto.email}" is already registered`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdUsers: User[] = [];

      for (const dto of bulkDto.users) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = queryRunner.manager.create(User, {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
          isActive: true,
        });

        const savedUser = await queryRunner.manager.save(user);

        if (dto.role === UserRole.CAREGIVER) {
          const caregiverProfile = queryRunner.manager.create(CaregiverProfile, {
            userId: savedUser.id,
          });
          await queryRunner.manager.save(caregiverProfile);
        }

        createdUsers.push(savedUser);
      }

      await queryRunner.commitTransaction();

      return {
        count: createdUsers.length,
        users: createdUsers.map((u) => this.sanitizeUser(u)),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Authenticates user credentials and issues a signed JWT access token.
   * Enforces account activation status check (rejects suspended/inactive accounts).
   * If two-factor authentication is enabled for the account, returns a challenge requirement.
   *
   * @param loginDto - Credentials DTO containing email and plain-text password.
   * @returns Object containing signed JWT token or 2FA challenge response.
   * @throws UnauthorizedException If credentials are invalid (generic message to avoid enumeration).
   * @throws ForbiddenException If the user account is suspended or inactive.
   */
  async login(loginDto: LoginDto): Promise<
    | {
        access_token: string;
        user: Omit<User, 'password' | 'resetPasswordToken' | 'resetPasswordExpires'>;
      }
    | {
        isTwoFactorRequired: true;
        email: string;
        message: string;
      }
  > {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Usuario suspendido o inactivo');
    }

    if (user.isTwoFactorEnabled) {
      return {
        isTwoFactorRequired: true,
        email: user.email,
        message:
          'Two-factor authentication code required. Submit code to /api/v1/auth/2fa/authenticate',
      };
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Generates a new 2FA secret and otpauth URL for the requesting user.
   *
   * @param userId - ID of the authenticated user.
   * @returns Generated Base32 secret and otpauth URI.
   * @throws NotFoundException If user does not exist.
   */
  async generateTwoFactorSecret(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.usersService.findById(userId);
    const secret = generateTotpSecret();
    const otpauthUrl = generateOtpauthUrl(user.email, secret);

    user.twoFactorSecret = secret;
    await this.usersService.save(user);

    return { secret, otpauthUrl };
  }

  /**
   * Validates a TOTP code and activates two-factor authentication for the user.
   *
   * @param userId - ID of the authenticated user.
   * @param code - 6-digit TOTP verification code.
   * @returns Confirmation message and updated 2FA status.
   * @throws NotFoundException If user does not exist.
   * @throws BadRequestException If secret was not generated or code is invalid.
   */
  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ message: string; isTwoFactorEnabled: boolean }> {
    const user = await this.usersService.findByIdWith2faSecret(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" was not found`);
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Please generate a 2FA secret before enabling');
    }

    const isValid = verifyTotp(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Invalid two-factor authentication code');
    }

    user.isTwoFactorEnabled = true;
    await this.usersService.save(user);

    return {
      message: 'Two-factor authentication successfully enabled',
      isTwoFactorEnabled: true,
    };
  }

  /**
   * Disables two-factor authentication after verifying a valid TOTP code.
   *
   * @param userId - ID of the authenticated user.
   * @param code - 6-digit TOTP verification code.
   * @returns Confirmation message and updated 2FA status.
   * @throws NotFoundException If user does not exist.
   * @throws BadRequestException If 2FA is not enabled or code is invalid.
   */
  async disableTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ message: string; isTwoFactorEnabled: boolean }> {
    const user = await this.usersService.findByIdWith2faSecret(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" was not found`);
    }

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not currently enabled');
    }

    const isValid = verifyTotp(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Invalid two-factor authentication code');
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.usersService.save(user);

    return {
      message: 'Two-factor authentication successfully disabled',
      isTwoFactorEnabled: false,
    };
  }

  /**
   * Completes two-factor authentication login challenge by verifying a 6-digit TOTP code.
   * Issues standard signed JWT access token upon successful code validation.
   *
   * @param dto - 2FA authentication payload containing email and 6-digit code.
   * @returns Signed JWT access token and sanitized user profile.
   * @throws UnauthorizedException If credentials or code are invalid, or 2FA is not enabled.
   * @throws ForbiddenException If user is suspended or inactive.
   */
  async authenticateTwoFactor(dto: TwoFactorAuthenticateDto): Promise<{
    access_token: string;
    user: Omit<User, 'password' | 'resetPasswordToken' | 'resetPasswordExpires'>;
  }> {
    const user = await this.usersService.findByEmailWith2faSecret(dto.email);

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException(
        'Invalid 2FA credentials or two-factor authentication not enabled for this user',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Usuario suspendido o inactivo');
    }

    const isValid = verifyTotp(dto.code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Logs out the user by recording the current timestamp in lastLogoutAt.
   * Any JWT tokens issued prior to this timestamp are invalidated by JwtStrategy.
   *
   * @param userId - ID of the authenticated user to log out.
   * @returns Confirmation logout message.
   */
  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    user.lastLogoutAt = new Date();
    await this.usersService.save(user);

    return {
      message: 'Successfully logged out',
    };
  }

  /**
   * Generates a 15-minute cryptographically secure password reset token if the email exists.
   * Returns a generic message to prevent account enumeration attacks.
   *
   * @param forgotPasswordDto - DTO containing the user's email address.
   * @returns Generic confirmation message dispatched to the requester.
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;

      await this.usersService.save(user);

      this.logger.log(
        `Password reset requested for email: ${user.email}. Token generated: ${resetToken}`,
      );
    }

    return {
      message:
        'If the email is registered, a password reset link has been dispatched.',
    };
  }

  /**
   * Validates a password reset token and updates the user's password with a new hash.
   * Clears the reset token and expiry timestamp upon successful password change.
   *
   * @param resetPasswordDto - DTO with the valid reset token and new plain-text password.
   * @returns Confirmation message on successful reset.
   * @throws BadRequestException If the token does not exist or has expired.
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken(
      resetPasswordDto.token,
    );

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersService.save(user);

    return {
      message: 'Password has been successfully reset.',
    };
  }

  /**
   * Strips sensitive security fields (password hash, reset tokens) from a User entity.
   *
   * @param user - User entity to sanitize.
   * @returns Sanitized user representation safe for client consumption.
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    const {
      password: _password,
      resetPasswordToken: _resetPasswordToken,
      resetPasswordExpires: _resetPasswordExpires,
      ...sanitized
    } = user;
    return sanitized as Omit<User, 'password'>;
  }
}
