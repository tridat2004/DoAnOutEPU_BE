import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...createDatabaseOptions(),
      autoLoadEntities: false,
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
  ],
})
export class AppModule {}
