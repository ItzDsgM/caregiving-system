import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { BulkRegisterDto } from './dtos/bulk-register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { TwoFactorCodeDto, TwoFactorAuthenticateDto } from './dtos/two-factor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a single Caregiver or Client user.
   * Rejects ADMIN role injection attempts.
   *
   * @param registerDto - User registration payload.
   * @returns Newly created sanitized user entity.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new Caregiver or Client user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
      example: {
        id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        email: 'carlos.mendoza@example.com',
        firstName: 'Carlos',
        lastName: 'Mendoza',
        phone: '+573001234567',
        role: 'CAREGIVER',
        isActive: true,
        suspensionReason: null,
        createdAt: '2026-10-12T20:00:00.000Z',
        updatedAt: '2026-10-12T20:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or Admin registration attempt',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Role must be either CAREGIVER or CLIENT. Admin role registration is prohibited',
        ],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/register',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already registered: carlos.mendoza@example.com',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/register',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Registers multiple users in a single atomic batch.
   * Validates duplicate emails internally and against database before persisting.
   *
   * @param bulkDto - Batch registration payload containing an array of user payloads.
   * @returns Total count and array of created sanitized users.
   */
  @Post('bulk-register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register multiple Caregiver or Client users in a single batch' })
  @ApiResponse({
    status: 201,
    description: 'Batch of users successfully created',
    schema: {
      example: {
        count: 2,
        users: [
          {
            id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
            email: 'maria.caregiver@example.com',
            firstName: 'Maria',
            lastName: 'Lopez',
            phone: '+573005551001',
            role: 'CAREGIVER',
            isActive: true,
            suspensionReason: null,
            createdAt: '2026-10-12T20:00:00.000Z',
            updatedAt: '2026-10-12T20:00:00.000Z',
          },
          {
            id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
            email: 'juan.client@example.com',
            firstName: 'Juan',
            lastName: 'Rodriguez',
            phone: '+573005551002',
            role: 'CLIENT',
            isActive: true,
            suspensionReason: null,
            createdAt: '2026-10-12T20:00:00.000Z',
            updatedAt: '2026-10-12T20:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch input, duplicate emails, or Admin registration attempt',
    schema: {
      example: {
        statusCode: 400,
        message: 'Duplicate emails found within batch payload: maria.caregiver@example.com',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/bulk-register',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'One or more emails are already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'One or more emails are already registered: maria.caregiver@example.com',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/bulk-register',
      },
    },
  })
  async bulkRegister(@Body() bulkDto: BulkRegisterDto) {
    return this.authService.bulkRegister(bulkDto);
  }

  /**
   * Authenticates user credentials and issues a signed JWT Bearer access token.
   * Rejects suspended or inactive accounts with 403 Forbidden.
   *
   * @param loginDto - Credentials payload containing email and password.
   * @returns Signed JWT access token and sanitized user profile.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and issue JWT bearer token' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful with JWT token',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
          email: 'carlos.mendoza@example.com',
          firstName: 'Carlos',
          lastName: 'Mendoza',
          role: 'CAREGIVER',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account is inactive or suspended',
    schema: {
      example: {
        statusCode: 403,
        message: 'User account is suspended or inactive',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Dispatches a 15-minute cryptographically secure recovery token if the account email exists.
   * Protects against user enumeration attacks with generic confirmation.
   *
   * @param forgotPasswordDto - Payload containing the account email.
   * @returns Generic confirmation message.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate password recovery flow' })
  @ApiResponse({
    status: 200,
    description: 'Recovery token dispatched if account exists',
    schema: {
      example: {
        message:
          'If an account with this email exists, a password reset link has been dispatched',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input email',
    schema: {
      example: {
        statusCode: 400,
        message: ['Invalid email address'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/forgot-password',
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * Resets the account password using a valid, unexpired recovery token.
   * Clears the recovery token upon success.
   *
   * @param resetPasswordDto - Payload containing the token and new password.
   * @returns Confirmation message on password reset.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password using recovery token' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated',
    schema: {
      example: {
        message:
          'Password has been successfully updated. You may now log in with your new credentials',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Reset token is invalid or has expired',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/auth/reset-password',
      },
    },
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * Generates a new 2FA secret and otpauth URI for the authenticated user.
   *
   * @param userId - Extracted UUID of the authenticated user.
   * @returns Secret and otpauth URI suitable for scanning in authenticator apps.
   */
  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a new 2FA secret and otpauth URL for the current user' })
  @ApiResponse({
    status: 200,
    description: '2FA secret generated successfully',
    schema: {
      example: {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/CareConnect:user%40test.com?secret=JBSWY3DPEHPK3PXP&issuer=CareConnect',
      },
    },
  })
  async generate2fa(@CurrentUser('id') userId: string) {
    return this.authService.generateTwoFactorSecret(userId);
  }

  /**
   * Verifies a 6-digit TOTP code and activates two-factor authentication.
   *
   * @param userId - Extracted UUID of the authenticated user.
   * @param dto - DTO containing the 6-digit verification code.
   * @returns Success confirmation.
   */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and enable two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: 'Two-factor authentication successfully enabled',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid 2FA code or secret not generated',
  })
  async enable2fa(
    @CurrentUser('id') userId: string,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  /**
   * Disables two-factor authentication after verifying a valid TOTP code.
   *
   * @param userId - Extracted UUID of the authenticated user.
   * @param dto - DTO containing the 6-digit verification code.
   * @returns Success confirmation.
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and disable two-factor authentication' })
  @ApiResponse({
    status: 200,
    description: 'Two-factor authentication successfully disabled',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid 2FA code or 2FA not enabled',
  })
  async disable2fa(
    @CurrentUser('id') userId: string,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.disableTwoFactor(userId, dto.code);
  }

  /**
   * Completes two-factor authentication challenge during login.
   * Issues standard signed JWT access token upon successful code validation.
   *
   * @param dto - Payload containing user email and 6-digit TOTP code.
   * @returns Signed JWT access token and sanitized user profile.
   */
  @Post('2fa/authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit 2FA code to complete login and obtain JWT access token' })
  @ApiResponse({
    status: 200,
    description: '2FA authentication successful with JWT token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid 2FA code or 2FA not enabled',
  })
  async authenticate2fa(@Body() dto: TwoFactorAuthenticateDto) {
    return this.authService.authenticateTwoFactor(dto);
  }

  /**
   * Logs out the user by invalidating tokens issued prior to the current timestamp.
   *
   * @param userId - Extracted UUID of the authenticated user.
   * @returns Logout confirmation message.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current user and invalidate active session tokens' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      example: {
        message: 'Successfully logged out',
      },
    },
  })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }
}

