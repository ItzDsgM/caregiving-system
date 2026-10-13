import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<
    Pick<AuthService, 'register' | 'bulkRegister' | 'login' | 'forgotPassword' | 'resetPassword'>
  >;

  beforeEach(() => {
    service = {
      register: jest.fn(),
      bulkRegister: jest.fn(),
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };
    controller = new AuthController(service as unknown as AuthService);
  });

  it('register should delegate to the service and return its result', async () => {
    const dto = { email: 'a@b.c' } as RegisterDto;
    service.register.mockResolvedValue({ id: 'u1' } as never);

    await expect(controller.register(dto)).resolves.toEqual({ id: 'u1' });
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('bulkRegister should delegate to the service and return its result', async () => {
    const dto = { users: [] };
    service.bulkRegister.mockResolvedValue({ count: 0, users: [] });

    await expect(controller.bulkRegister(dto)).resolves.toEqual({ count: 0, users: [] });
    expect(service.bulkRegister).toHaveBeenCalledWith(dto);
  });

  it('login should delegate to the service', async () => {
    const dto = { email: 'a@b.c', password: 'x' } as LoginDto;
    service.login.mockResolvedValue({ access_token: 't', user: {} } as never);

    await expect(controller.login(dto)).resolves.toMatchObject({ access_token: 't' });
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('forgotPassword should delegate to the service', async () => {
    const dto = { email: 'a@b.c' } as ForgotPasswordDto;
    service.forgotPassword.mockResolvedValue({ message: 'ok' });

    await expect(controller.forgotPassword(dto)).resolves.toEqual({ message: 'ok' });
    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('resetPassword should delegate to the service', async () => {
    const dto = { token: 't', newPassword: 'Passw0rdX' } as ResetPasswordDto;
    service.resetPassword.mockResolvedValue({ message: 'done' });

    await expect(controller.resetPassword(dto)).resolves.toEqual({ message: 'done' });
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('should expose the documented HTTP status codes (201 register, 200 others)', () => {
    const code = (fn: object) => Reflect.getMetadata(HTTP_CODE_METADATA, fn);
    expect(code(AuthController.prototype.register)).toBe(HttpStatus.CREATED);
    expect(code(AuthController.prototype.bulkRegister)).toBe(HttpStatus.CREATED);
    expect(code(AuthController.prototype.login)).toBe(HttpStatus.OK);
    expect(code(AuthController.prototype.forgotPassword)).toBe(HttpStatus.OK);
    expect(code(AuthController.prototype.resetPassword)).toBe(HttpStatus.OK);
  });
});
