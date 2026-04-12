import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 浏览器误打开「小程序路径」时的说明页（域名与 API 同机时常出现） */
function inviteLandingHtml(inviteCode: string) {
  const code = inviteCode ? escapeHtml(inviteCode) : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>小灵通 · 邀请</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#1e293b;line-height:1.6;}
    .card{max-width:420px;margin:40px auto;padding:28px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(15,23,42,.08);}
    h1{font-size:20px;margin:0 0 12px;}
    p{font-size:15px;color:#64748b;margin:0 0 16px;}
    .code{font-size:22px;font-weight:700;letter-spacing:.08em;color:#2563eb;padding:12px 16px;background:#eff6ff;border-radius:12px;text-align:center;margin:16px 0;}
    .hint{font-size:13px;color:#94a3b8;}
  </style>
</head>
<body>
  <div class="card">
    <h1>请在微信内打开小程序</h1>
    <p>该地址是<strong>微信小程序</strong>内的页面路径，无法在普通浏览器中直接打开。</p>
    <p>请使用微信搜索小程序「小灵通」，或通过好友分享的<strong>小程序卡片</strong>进入；邀请关系会在对方首次登录时自动关联。</p>
    ${
      code
        ? `<p>本次链接中的邀请码：</p><div class="code">${code}</div><p class="hint">可将此码发给对方，在小程序内按页面提示完成注册即可。</p>`
        : ''
    }
  </div>
</body>
</html>`;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const p = req.path || '';
    if (p !== '/pages/index/index' && p !== '/pages/index/index/') return next();
    const raw = req.query.inviteCode;
    const inviteCode = typeof raw === 'string' ? raw.slice(0, 64) : '';
    res.type('html').send(inviteLandingHtml(inviteCode));
  });

  const publicDir = join(__dirname, '..', 'public');
  const uploadsDir = join(__dirname, '..', 'storage', 'uploads');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors();
  app.useStaticAssets(publicDir);
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
