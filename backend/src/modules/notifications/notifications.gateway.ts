import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { IJwtPayload, IUserProfile } from '../../common/interfaces';
import type { NotificationResponseDto } from './dto/notification-response.dto';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connections = new Map<string, Set<Socket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('Missing authentication token');
      }

      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret:
          this.configService.get<string>('jwt.secret') ?? 'fallback-secret',
      });

      const user = await this.authService.validateUser(payload);
      this.registerClient(user.id, client, user);
      client.emit('notifications:connected', { status: 'ok' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(`Notification socket rejected: ${message}`);
      client.emit('notifications:error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data?.user as IUserProfile | undefined)?.id;
    if (userId) {
      this.unregisterClient(userId, client);
    }
  }

  notifyUser(userId: string, payload: NotificationResponseDto): void {
    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    sockets.forEach((socket) => {
      socket.emit('notifications:new', payload);
    });
  }

  emitUnreadCount(userId: string, unread: number): void {
    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    sockets.forEach((socket) => {
      socket.emit('notifications:unread', { unread });
    });
  }

  private registerClient(
    userId: string,
    client: Socket,
    user: IUserProfile,
  ): void {
    client.data.user = user;
    const existing = this.connections.get(userId) ?? new Set<Socket>();
    existing.add(client);
    this.connections.set(userId, existing);
    this.logger.debug(
      `User ${userId} connected to notifications (${existing.size} sockets).`,
    );
  }

  private unregisterClient(userId: string, client: Socket): void {
    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(client);
    if (sockets.size === 0) {
      this.connections.delete(userId);
    }
    this.logger.debug(`User ${userId} disconnected from notifications.`);
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (typeof client.handshake.auth?.token === 'string') {
      return client.handshake.auth.token;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return undefined;
  }
}
