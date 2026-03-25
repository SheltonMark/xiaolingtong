import { shouldEnableTypeOrmSynchronize } from './database.config';

describe('database config', () => {
  it('disables schema sync by default in production', () => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      }),
    };

    expect(shouldEnableTypeOrmSynchronize(config as any)).toBe(false);
  });

  it('allows explicit DB_SYNC override in production', () => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DB_SYNC') return 'true';
        return defaultValue;
      }),
    };

    expect(shouldEnableTypeOrmSynchronize(config as any)).toBe(true);
  });

  it('keeps schema sync enabled by default outside production', () => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      }),
    };

    expect(shouldEnableTypeOrmSynchronize(config as any)).toBe(true);
  });
});
