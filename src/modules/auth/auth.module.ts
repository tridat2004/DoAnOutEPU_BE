import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.services';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { RedisService } from '../../shared/redis/redis.service';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { ProjectPermissionGuard } from '../../common/guards/project-permission.guard';
import { SystemRoleGuard } from '../../common/guards/system-role.guard';
import { AdminUsersController } from './admin-users.controller';

import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';

@Module({
  imports: [
    UsersModule,
    ProjectsModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([Role, Permission, RolePermission, ProjectMember]),
  ],
  controllers: [AuthController, RolesController, AdminUsersController],
  providers: [
    AuthService,
    RolesService,
    RedisService,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SystemRoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProjectPermissionGuard,
    },
  ],
  exports: [AuthService, RolesService],
})
export class AuthModule {}
