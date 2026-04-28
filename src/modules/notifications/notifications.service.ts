import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from './constants/notification-type.constant';
import { error } from 'console';

type CreateNotificationInput = {
    type: string;
    title: string;
    message: string;
    relatedUrl?: string | null;
    metadataJson?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    async createNotification(userId: string, input: CreateNotificationInput) {
        try {
            const notification = this.notificationRepository.create({
                user: { id: userId } as any,
                type: input.type,
                title: input.title,
                message: input.message,
                relatedUrl: input.relatedUrl ?? null,
                metadataJson: input.metadataJson ?? null,
                isRead: false,
                readAt: null,
            });

            return await this.notificationRepository.save(notification);
        } catch (error) {
            if (error instanceof AppException) {
                throw error;
            }
            throw AppErrors.notification.notificationCreationFailed();
        }
    }

    async createAndPush(userId: string, input: CreateNotificationInput) {
        const saved = await this.createNotification(userId, input);

        const reloaded = await this.notificationRepository.findOne({
            where: { id: saved.id },
            relations: { user: true },
        });

        if (!reloaded) {
            throw AppErrors.notification.notificationCreationFailed();
        }

        const payload = this.serializeNotification(reloaded);

        this.notificationsGateway.pushToUser(userId, payload);

        const unreadCount = await this.getUnreadCountValue(userId);
        this.notificationsGateway.pushUnreadCount(userId, unreadCount);

        return reloaded;
    }

    async getMyNotifications(
        currentUser: AuthenticatedUser,
        query: ListNotificationsDto,
    ) {
        try {
            const page = query.page ?? 1;
            const limit = query.limit ?? 20;

            const qb = this.notificationRepository
                .createQueryBuilder('notification')
                .leftJoinAndSelect('notification.user', 'user')
                .where('user.id = :userId', { userId: currentUser.id });

            if (query.isRead !== undefined) {
                qb.andWhere('notification.isRead = :isRead', {
                    isRead: query.isRead,
                });
            }

            if (query.type) {
                qb.andWhere('notification.type = :type', {
                    type: query.type,
                });
            }

            qb.orderBy('notification.createdAt', 'DESC')
                .skip((page - 1) * limit)
                .take(limit);

            const [items, total] = await qb.getManyAndCount();

            return successResponse({
                message: 'Get notifications list successfully',
                data: {
                    items: items.map((item) => this.serializeNotification(item)),
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPage: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error) {
            console.error('NOTIFICATION_ERROR:', error);
            throw AppErrors.notification.notificationLoadFailed();
        }
    }

    async getUnreadCount(currentUser: AuthenticatedUser) {
        const unreadCount = await this.getUnreadCountValue(currentUser.id);

        return successResponse({
            message: 'Get unread count successfully',
            data: { unreadCount },
        });
    }

    async markAsRead(notificationId: string, currentUser: AuthenticatedUser) {
        const notification = await this.notificationRepository.findOne({
            where: {
                id: notificationId,
                user: { id: currentUser.id },
            },
            relations: {
                user: true,
            },
        });

        if (!notification) {
            throw AppErrors.notification.notificationNotFound();
        }

        if (notification.isRead) {
            return successResponse({
                message: 'Notification has been marked as read',
                data: this.serializeNotification(notification),
            });
        }

        try {
            notification.isRead = true;
            notification.readAt = new Date();

            const saved = await this.notificationRepository.save(notification);

            const payload = this.serializeNotification(saved);
            this.notificationsGateway.pushUpdateNotification(currentUser.id, payload);

            const unreadCount = await this.getUnreadCountValue(currentUser.id);
            this.notificationsGateway.pushUnreadCount(currentUser.id, unreadCount);

            return successResponse({
                message: 'Mark notification as read successfully',
                data: payload,
            });
        } catch (error) {
            console.error('NOTIFICATION_ERROR:', error);
            throw AppErrors.notification.notificationReadFailed();
        }
    }

    async markAllAsRead(currentUser: AuthenticatedUser) {
        try {
            await this.notificationRepository
                .createQueryBuilder()
                .update(Notification)
                .set({
                    isRead: true,
                    readAt: () => 'CURRENT_TIMESTAMP',
                })
                .where('user_id = :userId', { userId: currentUser.id })
                .andWhere('is_read = :isRead', { isRead: false })
                .execute();

            const unreadCount = await this.getUnreadCountValue(currentUser.id);

            this.notificationsGateway.pushUnreadCount(currentUser.id, unreadCount);
            this.notificationsGateway.pushMarkedAllAsRead(currentUser.id);

            return successResponse({
                message: 'Mark all notifications as read successfully',
                data: {
                    unreadCount,
                },
            });
        } catch (error) {
            console.error('NOTIFICATION_ERROR:', error);
            throw AppErrors.notification.notificationReadFailed();
        }
    }

    async deleteNotification(
        notificationId: string,
        currentUser: AuthenticatedUser,
    ) {
        const notification = await this.notificationRepository.findOne({
            where: {
                id: notificationId,
                user: { id: currentUser.id },
            },
            relations: {
                user: true,
            },
        });

        if (!notification) {
            throw AppErrors.notification.notificationNotFound();
        }

        try {
            await this.notificationRepository.remove(notification);

            this.notificationsGateway.pushDeletedNotification(
                currentUser.id,
                notification.id,
            );

            const unreadCount = await this.getUnreadCountValue(currentUser.id);
            this.notificationsGateway.pushUnreadCount(currentUser.id, unreadCount);

            return successResponse({
                message: 'Delete notification successfully',
                data: {
                    id: notification.id,
                },
            });
        } catch (error) {
            console.error('NOTIFICATION_ERROR:', error);
            throw AppErrors.notification.notificationDeleteFailed();
        }
    }

    async notifyTaskAssigned(
        userId: string,
        taskCode: string,
        taskId: string,
        projectId: string,
    ) {
        return this.createAndPush(userId, {
            type: NotificationType.TASK_ASSIGNED,
            title: 'You have been assigned a new task',
            message: `You have been assigned ${taskCode}`,
            relatedUrl: `/projects/${projectId}/tasks/${taskId}`,
            metadataJson: {
                taskId,
                taskCode,
                projectId,
            },
        });
    }

    async notifyTaskCommented(
        userId: string,
        actorName: string,
        taskCode: string,
        taskId: string,
        projectId: string,
    ) {
        return this.createAndPush(userId, {
            type: NotificationType.TASK_COMMENTED,
            title: 'New comment on task',
            message: `${actorName} commented on ${taskCode}`,
            relatedUrl: `/projects/${projectId}/tasks/${taskId}`,
            metadataJson: {
                actorName,
                taskId,
                taskCode,
                projectId,
            },
        });
    }

    async notifyProjectMemberAdded(
        userId: string,
        projectName: string,
        projectId: string,
    ) {
        return this.createAndPush(userId, {
            type: NotificationType.PROJECT_MEMBER_ADDED,
            title: 'You have been added to project',
            message: `You have been added to project ${projectName}`,
            relatedUrl: `/projects/${projectId}/members`,
            metadataJson: {
                projectId,
                projectName,
            },
        });
    }

    async notifyTaskDeadlineChanged(
        userId: string,
        taskCode: string,
        taskId: string,
        projectId: string,
        dueDate: Date | string | null,
    ) {
        return this.createAndPush(userId, {
            type: NotificationType.TASK_DEADLINE_CHANGED,
            title: 'Task deadline has changed',
            message: `Deadline for ${taskCode} has been updated`,
            relatedUrl: `/projects/${projectId}/tasks/${taskId}`,
            metadataJson: {
                taskId,
                taskCode,
                projectId,
                dueDate,
            },
        });
    }

    private async getUnreadCountValue(userId: string) {
        return this.notificationRepository.count({
            where: {
                user: { id: userId },
                isRead: false,
            },
        });
    }

    private serializeNotification(notification: Notification) {
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            relatedUrl: notification.relatedUrl,
            metadataJson: notification.metadataJson,
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
        };
    }
}