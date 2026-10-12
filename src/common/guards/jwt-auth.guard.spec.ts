import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

describe('JwtAuthGuard.handleRequest', () => {
  const guard = new JwtAuthGuard();

  it('should return the user when authentication succeeds', () => {
    const user = { id: 'u1' };
    expect(guard.handleRequest(null, user, undefined)).toBe(user);
  });

  it('should throw UnauthorizedException when there is no user (RF01.3.1)', () => {
    expect(() => guard.handleRequest(null, false, undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('should rethrow the strategy error when present (e.g. suspended user 403)', () => {
    const err = new Error('boom');
    expect(() => guard.handleRequest(err, null, undefined)).toThrow(err);
  });
});

describe('@CurrentUser()', () => {
  class Probe {
    handler(@CurrentUser() _user: unknown, @CurrentUser('id') _id: unknown) {}
  }

  const factoryFor = (index: number) => {
    const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
    const key = Object.keys(meta).find((k) => meta[k].index === index) as string;
    return meta[key].factory as (data: unknown, ctx: ExecutionContext) => unknown;
  };

  const ctxWith = (user: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('should inject the full authenticated user when no key is given', () => {
    const user = { id: 'u1', email: 'a@b.c' };
    expect(factoryFor(0)(undefined, ctxWith(user))).toBe(user);
  });

  it('should inject a single property when a key is given', () => {
    expect(factoryFor(1)('id', ctxWith({ id: 'u1' }))).toBe('u1');
  });

  it('should return undefined when there is no authenticated user', () => {
    expect(factoryFor(1)('id', ctxWith(undefined))).toBeUndefined();
  });
});

describe('@Roles()', () => {
  it('should store the required roles under ROLES_KEY', () => {
    class Probe {
      @Roles(UserRole.CLIENT, UserRole.ADMIN)
      handler() {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, Probe.prototype.handler)).toEqual([
      UserRole.CLIENT,
      UserRole.ADMIN,
    ]);
  });
});
