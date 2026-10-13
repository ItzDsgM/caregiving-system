import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { BulkRegisterDto } from './dtos/bulk-register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
