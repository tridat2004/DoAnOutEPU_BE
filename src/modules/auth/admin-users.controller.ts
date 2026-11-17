import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SystemRoles } from './decorators/system-roles.decorator';
import { SystemRole } from './constants/system-role.constant';
import { AuthService } from './auth.services';
import { UsersService } from '../users/users.service';
import { ListUsersDto } from '../users/dto/list-users.dto';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { UpdateManagedUserStatusDto } from './dto/update-managed-user-status.dto';
import { UpdateManagedUserRoleDto } from './dto/update-managed-user-role.dto';
import { ResetManagedUserPasswordDto } from './dto/reset-managed-user-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AppErrors } from '../../common/exceptions/exception';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto';

@Controller('admin/users')
@SystemRoles(SystemRole.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(@Query() query: ListUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateManagedUserDto) {
    return this.authService.createManagedUser(dto, dto.systemRole ?? SystemRole.USER);
  }

  @Patch(':userId')
  update(@Param('userId') userId: string, @Body() dto: UpdateManagedUserDto) {
    return this.authService.updateManagedUser(userId, dto);
  }

  @Patch(':userId/status')
  updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateManagedUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (userId === currentUser.id && !dto.isActive) {
      throw AppErrors.auth.forbidden();
    }

    return this.authService.updateManagedUserStatus(userId, dto.isActive);
  }

  @Patch(':userId/system-role')
  updateSystemRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateManagedUserRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (userId === currentUser.id && dto.systemRole !== SystemRole.ADMIN) {
      throw AppErrors.auth.forbidden();
    }

    return this.authService.updateManagedUserRole(userId, dto.systemRole);
  }

  @Post(':userId/reset-password')
  resetPassword(@Param('userId') userId: string, @Body() dto: ResetManagedUserPasswordDto) {
    return this.authService.resetManagedUserPassword(userId, dto.password);
  }
}
