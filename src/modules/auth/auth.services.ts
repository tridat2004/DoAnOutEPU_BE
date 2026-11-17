import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { AppErrors } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { RedisService } from '../../shared/redis/redis.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { clearAuthCookies, setAuthCookie } from './auth-cookie.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.types';
import { SystemRole } from './constants/system-role.constant';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly loginAttemptTtlSeconds = 15 * 60;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  private get accessExpiresIn(): StringValue {
    return (process.env.JWT_ACCESS_EXPIRES_IN as StringValue) ?? '15m';
  }

  private get refreshExpiresIn(): StringValue {
    return (process.env.JWT_REFRESH_EXPIRES_IN as StringValue) ?? '7d';
  }

  private get refreshTtlSeconds() {
    return 7 * 24 * 60 * 60;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashPassword(password: string) {
    try {
      return await bcrypt.hash(password, 10);
    } catch {
      throw AppErrors.auth.passwordHashFailed();
    }
  }

  private getRefreshSessionKey(userId: string, sid: string) {
    return `auth:refresh:${userId}:${sid}`;
  }

  private getLoginAttemptKey(email: string) {
    const emailHash = createHash('sha256').update(email).digest('hex');
    return `auth:login-attempt:${emailHash}`;
  }

  private async recordFailedLogin(key: string) {
    const attempts = await this.redisService.incrementWithExpiry(key, this.loginAttemptTtlSeconds);

    if (attempts >= this.maxLoginAttempts) {
      throw AppErrors.auth.tooManyLoginAttempts();
    }
  }

  private async signAccessToken(user: User, sid: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sid,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: this.accessExpiresIn,
    });
  }

  private async signRefreshToken(user: User, sid: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sid,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: this.refreshExpiresIn,
    });
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      systemRole: user.systemRole,
    };
  }

  private async buildAuthProfile(user: User) {
    const projectMemberships = await this.projectMemberRepository.find({
      where: { user: { id: user.id } },
      relations: {
        project: true,
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
      order: { createdAt: 'DESC' },
    });

    const systemPermissions =
      user.systemRole === SystemRole.ADMIN
        ? (await this.permissionRepository.find({ order: { code: 'ASC' } })).map(
            (permission) => permission.code,
          )
        : [];

    return {
      ...this.sanitizeUser(user),
      systemPermissions,
      projectAccess: projectMemberships.map((membership) => ({
        projectId: membership.project.id,
        role: {
          id: membership.role.id,
          code: membership.role.code,
          name: membership.role.name,
        },
        permissions: membership.role.rolePermissions
          .map((rolePermission) => rolePermission.permission.code)
          .sort(),
      })),
    };
  }

  async getAuthProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw AppErrors.auth.userNotFound();
    if (!user.isActive) throw AppErrors.auth.accountDisabled();

    return successResponse({
      message: 'Lay thong tin user thanh cong',
      data: await this.buildAuthProfile(user),
    });
  }

  async login(dto: LoginDto, res: Response) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const loginAttemptKey = this.getLoginAttemptKey(normalizedEmail);
    const currentAttempts = Number((await this.redisService.get(loginAttemptKey)) ?? 0);

    if (currentAttempts >= this.maxLoginAttempts) {
      throw AppErrors.auth.tooManyLoginAttempts();
    }

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      await this.recordFailedLogin(loginAttemptKey);
      throw AppErrors.auth.invalidCredentials();
    }

    if (!user.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordFailedLogin(loginAttemptKey);
      throw AppErrors.auth.invalidCredentials();
    }

    await this.redisService.del(loginAttemptKey);

    const sid = randomUUID();

    try {
      const accessToken = await this.signAccessToken(user, sid);
      const refreshToken = await this.signRefreshToken(user, sid);
      const refreshKey = this.getRefreshSessionKey(user.id, sid);
      const refreshHash = this.hashToken(refreshToken);

      await this.redisService.set(
        refreshKey,
        JSON.stringify({
          tokenHash: refreshHash,
          userId: user.id,
          sid,
          createdAt: new Date().toISOString(),
        }),
        this.refreshTtlSeconds,
      );

      setAuthCookie(res, accessToken, refreshToken);

      return successResponse({
        message: 'Dang nhap thanh cong',
        data: await this.buildAuthProfile(user),
      });
    } catch {
      throw AppErrors.auth.loginSessionCreationFailed();
    }
  }

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) {
      clearAuthCookies(res);
      throw AppErrors.auth.refreshTokenMissing();
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw AppErrors.auth.refreshSecretNotConfigured();
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      clearAuthCookies(res);
      throw AppErrors.auth.invalidRefreshToken();
    }

    if (payload.type !== 'refresh') {
      clearAuthCookies(res);
      throw AppErrors.auth.invalidTokenType();
    }

    if (!payload.sub || !payload.sid) {
      clearAuthCookies(res);
      throw AppErrors.auth.invalidRefreshPayload();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      clearAuthCookies(res);
      throw AppErrors.auth.userNotFound();
    }

    if (!user.isActive) {
      clearAuthCookies(res);
      throw AppErrors.auth.accountDisabled();
    }

    const key = this.getRefreshSessionKey(payload.sub, payload.sid);
    const sessionRaw = await this.redisService.get(key);

    if (!sessionRaw) {
      clearAuthCookies(res);
      throw AppErrors.auth.refreshSessionNotFound();
    }

    let session: { tokenHash: string; userId: string; sid: string };

    try {
      const parsed: unknown = JSON.parse(sessionRaw);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid refresh session');
      }
      const candidate = parsed as Record<string, unknown>;
      if (
        typeof candidate.tokenHash !== 'string' ||
        typeof candidate.userId !== 'string' ||
        typeof candidate.sid !== 'string'
      ) {
        throw new Error('Invalid refresh session');
      }
      session = {
        tokenHash: candidate.tokenHash,
        userId: candidate.userId,
        sid: candidate.sid,
      };
    } catch {
      await this.redisService.del(key);
      clearAuthCookies(res);
      throw AppErrors.auth.invalidRefreshSession();
    }

    const incomingHash = this.hashToken(refreshToken);

    if (session.tokenHash !== incomingHash) {
      await this.redisService.del(key);
      clearAuthCookies(res);
      throw AppErrors.auth.refreshTokenMismatch();
    }

    const newAccessToken = await this.signAccessToken(user, payload.sid);
    const newRefreshToken = await this.signRefreshToken(user, payload.sid);

    await this.redisService.set(
      key,
      JSON.stringify({
        tokenHash: this.hashToken(newRefreshToken),
        userId: user.id,
        sid: payload.sid,
        rotatedAt: new Date().toISOString(),
      }),
      this.refreshTtlSeconds,
    );

    setAuthCookie(res, newAccessToken, newRefreshToken);

    return successResponse({
      message: 'Refresh token thanh cong',
      data: await this.buildAuthProfile(user),
    });
  }

  async logout(refreshToken: string | undefined, res: Response) {
    try {
      if (refreshToken) {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET,
        });

        if (payload?.sub && payload?.sid) {
          const key = this.getRefreshSessionKey(payload.sub, payload.sid);
          await this.redisService.del(key);
        }
      }
    } catch {
      // Logout is idempotent even when the refresh token is missing or invalid.
    }

    clearAuthCookies(res);

    return successResponse({
      message: 'Dang xuat thanh cong',
      data: null,
    });
  }

  async validateAccessToken(accessToken: string | undefined) {
    if (!accessToken) {
      throw AppErrors.auth.accessTokenMissing();
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw AppErrors.auth.invalidAccessToken();
    }

    if (payload.type !== 'access') {
      throw AppErrors.auth.invalidTokenType();
    }

    const session = await this.redisService.get(
      this.getRefreshSessionKey(payload.sub, payload.sid),
    );
    if (!session) {
      throw AppErrors.auth.invalidAccessToken();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw AppErrors.auth.userNotFound();
    }

    if (!user.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    return this.sanitizeUser(user);
  }

  async createManagedUser(dto: RegisterDto, systemRole: SystemRole = SystemRole.USER) {
    return this.createAccount(dto, systemRole);
  }

  async updateManagedUserStatus(userId: string, isActive: boolean) {
    const user = await this.usersService.updateStatus(userId, isActive);
    if (!isActive) {
      await this.redisService.deleteByPattern(`auth:refresh:${userId}:*`);
    }

    return successResponse({
      message: isActive ? 'Mo khoa tai khoan thanh cong' : 'Khoa tai khoan thanh cong',
      data: this.sanitizeUser(user),
    });
  }

  async updateManagedUser(userId: string, dto: UpdateManagedUserDto) {
    const email = dto.email?.trim().toLowerCase();
    const username = dto.userName?.trim();
    const fullName = dto.fullName?.trim();

    if (dto.email !== undefined && !email) {
      throw AppErrors.common.validationMessages(['Email khong duoc de trong']);
    }
    if (dto.userName !== undefined && !username) {
      throw AppErrors.common.validationMessages(['Username khong duoc de trong']);
    }
    if (dto.fullName !== undefined && !fullName) {
      throw AppErrors.common.validationMessages(['Full name khong duoc de trong']);
    }

    const user = await this.usersService.updateProfile(userId, {
      email,
      username,
      fullName,
    });

    return successResponse({
      message: 'Cap nhat tai khoan thanh cong',
      data: this.sanitizeUser(user),
    });
  }

  async updateManagedUserRole(userId: string, systemRole: SystemRole) {
    const user = await this.usersService.updateSystemRole(userId, systemRole);
    return successResponse({
      message: 'Cap nhat system role thanh cong',
      data: this.sanitizeUser(user),
    });
  }

  async resetManagedUserPassword(userId: string, password: string) {
    const passwordHash = await this.hashPassword(password);
    const user = await this.usersService.updatePasswordHash(userId, passwordHash);
    await this.redisService.deleteByPattern(`auth:refresh:${userId}:*`);

    return successResponse({
      message: 'Reset mat khau thanh cong',
      data: { id: user.id },
    });
  }

  private async createAccount(dto: RegisterDto, systemRole: SystemRole) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.userName.trim();
    const normalizedFullName = dto.fullName.trim();

    const existingEmail = await this.usersService.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw AppErrors.auth.emailAlreadyExists();
    }

    const existingUsername = await this.usersService.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw AppErrors.auth.usernameAlreadyExists();
    }

    const passwordHash = await this.hashPassword(dto.password);

    try {
      const user = await this.usersService.createUser({
        email: normalizedEmail,
        username: normalizedUsername,
        fullName: normalizedFullName,
        passwordHash,
        systemRole,
      });

      return successResponse({
        message: 'Tao tai khoan thanh cong',
        data: this.sanitizeUser(user),
      });
    } catch {
      throw AppErrors.auth.accountCreationFailed();
    }
  }
}
