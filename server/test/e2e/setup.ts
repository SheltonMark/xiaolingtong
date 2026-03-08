import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export async function globalSetup() {
  console.log('Setting up E2E test environment...');

  // 初始化测试数据库
  try {
    execSync('npm run typeorm migration:run -- --dataSource=test', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }

  console.log('E2E test environment ready');
}

export async function globalTeardown() {
  console.log('Cleaning up E2E test environment...');
  // 清理测试数据
}
