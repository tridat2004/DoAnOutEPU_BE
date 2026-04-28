import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  getMyNotifications(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListNotificationsDto,
  ) {
    console.log('CURRENT_USER_NOTIFICATIONS:', currentUser);
    return this.notificationsService.getMyNotifications(currentUser, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(currentUser);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(notificationId, currentUser);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(currentUser);
  }

  @Delete(':notificationId')
  deleteNotification(
    @Param('notificationId') notificationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.deleteNotification(
      notificationId,
      currentUser,
    );
  }
}