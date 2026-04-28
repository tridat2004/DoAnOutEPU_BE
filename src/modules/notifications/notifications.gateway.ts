import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtPayload } from '../auth/types/jwt-payload.types';
import { UsersService } from '../users/users.service';

type AuthenicatedSocket = Socket & {
    data: {
        user: AuthenticatedUser;
    };
}
@WebSocketGateway({
    namespace: '/notifications',
    cors: {
        origin: true,
        credentials: true,
    }
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) { }

    private userRoom(userId: string) {
        return `user:${userId}`;
    }
    async handleConnection(@ConnectedSocket() client: AuthenicatedSocket) {
        try {
            const accessToken = this.extractAccessToken(client);

            const user = await this.validateAccessToken(accessToken);

            client.data.user = user;
            await client.join(this.userRoom(user.id));

            client.emit('notification:connected', {
                userId: user.id,
                message: 'Connected to notifications gateway',
            });

            this.logger.log(`User ${user.id} connected to notifications gateway`);
        } catch (error) {
            this.logger.warn(`Notification socket rejected: ${String(error)}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(@ConnectedSocket() client: AuthenicatedSocket) {
        const userId = client.data.user?.id;
        if (userId) {
            this.logger.log(`User ${userId} disconnected from notifications gateway`);
        }
    }

    pushToUser(userId: string, payload: unknown) {
        this.server.to(this.userRoom(userId)).emit('notification:new', payload);
    }

    pushUnreadCount(userId: string, unreadCount: number) {
        this.server
            .to(this.userRoom(userId))
            .emit('notification:unreadCount', { unreadCount });
    }

    pushUpdateNotification(userId: string, payload: unknown) {
        this.server.to(this.userRoom(userId)).emit('notification:update', payload);
    }

    pushDeletedNotification(userId: string, notificationId: string) {
        this.server
            .to(this.userRoom(userId))
            .emit('notification:deleted', { id: notificationId });
    }
    pushMarkedAllAsRead(userId: string) {
        this.server.to(this.userRoom(userId)).emit('notification:read-all', {
            message: 'All notifications marked as read',
        });
    }
    private extractAccessToken(client: Socket): string | undefined {
        const rawCookie = client.handshake.headers.cookie;
        if (!rawCookie) {
            return undefined;
        }

        const parsed = cookie.parse(rawCookie);
        return parsed.access_token;
    }

    private async validateAccessToken(
        accessToken: string | undefined,
    ): Promise<AuthenticatedUser> {
        if (!accessToken) {
            throw new Error('Missing access token');
        }

        const accessSecret = process.env.JWT_ACCESS_SECRET;
        if (!accessSecret) {
            throw new Error('JWT access secret is not configured');
        }

        let payload: JwtPayload;

        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
                secret: accessSecret,
            });
        } catch {
            throw new Error('Invalid access token');
        }

        if (payload.type !== 'access') {
            throw new Error('Invalid token type');
        }

        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.isActive) {
            throw new Error('User is inactive');
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
        };
    }
}
