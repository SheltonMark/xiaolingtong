type ConfigLike = {
  get<T = string>(key: string, defaultValue?: T): T | undefined;
};

function parseBooleanEnv(value: unknown): boolean | undefined {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

export function shouldEnableTypeOrmSynchronize(config: ConfigLike): boolean {
  const explicit = parseBooleanEnv(config.get('DB_SYNC'));
  if (explicit !== undefined) return explicit;
  const nodeEnv = String(config.get('NODE_ENV') ?? 'development').trim().toLowerCase();
  return nodeEnv !== 'production';
}
