import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WalletService } from '../src/modules/wallet/wallet.service';

async function testWorkerWithdraw() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletService = app.get(WalletService);

  try {
    console.log('=== 测试临工提现 ===');
    console.log('userId: 8 (临工用户)');

    // 获取当前余额
    const wallet = await walletService.getBalance(8);
    console.log('当前余额:', wallet.balance);
    console.log('总收入:', wallet.totalIncome);
    console.log('总提现:', wallet.totalWithdraw);

    // 提现 3元
    console.log('\n开始提现 3.00 元...');
    const result = await walletService.withdraw(8, 3.00);
    console.log('提现结果:', result);

    // 查看更新后的余额
    const updatedWallet = await walletService.getBalance(8);
    console.log('\n提现后余额:', updatedWallet.balance);
    console.log('总提现:', updatedWallet.totalWithdraw);

  } catch (error) {
    console.error('提现失败:', error.message);
  } finally {
    await app.close();
  }
}

testWorkerWithdraw();
