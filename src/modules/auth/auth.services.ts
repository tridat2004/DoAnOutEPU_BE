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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
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

  private getRefreshSessionKey(userId: string, sid: string) {
    return `auth:refresh:${userId}:${sid}`;
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
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw AppErrors.auth.invalidCredentials();
    }

    if (!user.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppErrors.auth.invalidCredentials();
    }

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
        data: this.sanitizeUser(user),
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
      session = JSON.parse(sessionRaw);
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
      data: this.sanitizeUser(user),
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
    } catch {}

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

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw AppErrors.auth.userNotFound();
    }

    if (!user.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    return this.sanitizeUser(user);
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.userName.trim();
    const normalizedFullName = dto.fullName.trim();

    const existingUsername = await this.usersService.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw AppErrors.auth.usernameAlreadyExists();
    }

    let passwordHash: string;

    try {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } catch {
      throw AppErrors.auth.passwordHashFailed();
    }

    try {
      const user = await this.usersService.createUser({
        email: normalizedEmail,
        username: normalizedUsername,
        fullName: normalizedFullName,
        passwordHash,
      });

      return successResponse({
        message: 'Dang ky tai khoan thanh cong',
        data: this.sanitizeUser(user),
      });
    } catch {
      throw AppErrors.auth.accountCreationFailed();
    }
  }
}
