import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// ws 为间接依赖，这里用 require 规避额外类型依赖
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws = require('ws');

type WsClient = any;
type IncomingMessage = any;

@Injectable()
export class ChatRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private wss: any;
  private userClients = new Map<number, Set<WsClient>>();
  private clientUser = new WeakMap<WsClient, number>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const httpServer = this.httpAdapterHost.httpAdapter?.getHttpServer?.();
    if (!httpServer) {
      this.logger.warn('HTTP server not ready, skip ws init');
      return;
    }

    this.wss = new ws.WebSocketServer({
      server: httpServer,
      path: '/ws/chat',
    });

    this.wss.on('connection', (client: WsClient, req: IncomingMessage) => {
      this.handleConnection(client, req).catch((error) => {
        this.logger.warn(`ws auth failed: ${error?.message || error}`);
        try {
          client.close(1008, 'unauthorized');
        } catch {}
      });
    });

    this.logger.log('chat websocket listening at /ws/chat');
  }

  onModuleDestroy() {
    if (!this.wss) return;
    try {
      this.wss.close();
    } catch {}
    this.userClients.clear();
  }

  emitToUser(userId: number, event: string, data: any) {
    const set = this.userClients.get(Number(userId));
    if (!set || !set.size) return;
    const packet = JSON.stringify({ event, data });
    set.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(packet);
      }
    });
  }

  private async handleConnection(client: WsClient, req: IncomingMessage) {
    const token = this.extractToken(req);
    if (!token) throw new Error('token missing');

    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get('JWT_SECRET'),
    });
    const userId = Number(payload?.sub || 0);
    if (!userId) throw new Error('invalid user id');

    this.bindClient(userId, client);
    this.send(client, 'connected', { userId, ts: Date.now() });

    client.on('message', (raw: Buffer | string) => {
      // 预留：后续可支持客户端心跳、输入状态等事件
      this.handleClientMessage(client, raw);
    });

    client.on('close', () => {
      this.unbindClient(client);
    });

    client.on('error', () => {
      this.unbindClient(client);
    });
  }

  private handleClientMessage(client: WsClient, raw: Buffer | string) {
    let message: any = null;
    try {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (!message || message.event !== 'ping') return;
    this.send(client, 'pong', { ts: Date.now() });
  }

  private send(client: WsClient, event: string, data: any) {
    if (!client || client.readyState !== ws.OPEN) return;
    client.send(JSON.stringify({ event, data }));
  }

  private bindClient(userId: number, client: WsClient) {
    const id = Number(userId);
    if (!this.userClients.has(id)) {
      this.userClients.set(id, new Set<WsClient>());
    }
    this.userClients.get(id)!.add(client);
    this.clientUser.set(client, id);
  }

  private unbindClient(client: WsClient) {
    const userId = this.clientUser.get(client);
    if (!userId) return;
    const set = this.userClients.get(userId);
    if (!set) return;
    set.delete(client);
    if (!set.size) {
      this.userClients.delete(userId);
    }
  }

  private extractToken(req: IncomingMessage): string {
    const url = req.url || '';
    const host = req.headers?.host || 'localhost';
    const parsed = new URL(url, `http://${host}`);

    const queryToken = parsed.searchParams.get('token');
    if (queryToken) return queryToken;

    const authorization = req.headers?.authorization || '';
    const [type, token] = authorization.split(' ');
    if (type === 'Bearer' && token) return token;

    return '';
  }
}
