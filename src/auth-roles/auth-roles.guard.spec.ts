import { AuthRolesGuard } from './auth-roles.guard';

describe('AuthRolesGuard', () => {
  it('should be defined', () => {
    expect(new AuthRolesGuard()).toBeDefined();
  });
});
