import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AiAssignmentModule } from './modules/ai-assignment/ai-assignment.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BoardModule } from './modules/board/board.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ActivityModule } from './modules/activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...createDatabaseOptions(),
      autoLoadEntities: false,
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    AiAssignmentModule,
    NotificationsModule,
    DashboardModule,
    BoardModule,
    TimelineModule,
    ActivityModule,
  ],
})
export class AppModule {}
