import { MODULE_METADATA } from '@nestjs/common/constants';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('registers auth and role guards as global APP_GUARD providers', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) || [];
    const appGuards = providers.filter((provider: any) => provider?.provide === APP_GUARD);

    expect(appGuards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: APP_GUARD, useClass: AuthGuard }),
        expect.objectContaining({ provide: APP_GUARD, useClass: RoleGuard }),
      ]),
    );
  });
});
