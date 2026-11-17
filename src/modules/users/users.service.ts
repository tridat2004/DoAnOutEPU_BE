import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ListUsersDto } from './dto/list-users.dto';
import { successResponse } from '../../common/response';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { SystemRole } from '../auth/constants/system-role.constant';

type CreateUserInput = {
  email: string;
  username: string;
  fullName: string;
  passwordHash: string;
  systemRole?: SystemRole;
};

type UpdateUserInput = {
  email?: string;
  username?: string;
  fullName?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  findByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  findById(id: string) {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  countUsers() {
    return this.userRepository.count();
  }

  async findAll(query: ListUsersDto) {
    const keyword = query.keyword?.trim();
    const limit = query.limit ?? 20;
    const onlyActive = query.onlyActive ?? true;

    try {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.email',
          'user.username',
          'user.fullName',
          'user.avatarUrl',
          'user.isActive',
          'user.systemRole',
          'user.createdAt',
          'user.updatedAt',
        ])
        .orderBy('user.fullName', 'ASC')
        .take(limit);

      if (onlyActive) {
        qb.andWhere('user.is_active = :isActive', { isActive: true });
      }

      if (keyword) {
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('user.email ILIKE :keyword', { keyword: `%${keyword}%` })
              .orWhere('user.username ILIKE :keyword', {
                keyword: `%${keyword}%`,
              })
              .orWhere('user.full_name ILIKE :keyword', {
                keyword: `%${keyword}%`,
              });
          }),
        );
      }

      if (query.excludeProjectId) {
        qb.andWhere(
          `user.id NOT IN (
            SELECT pm.user_id
            FROM project_members pm
            WHERE pm.project_id = :excludeProjectId
          )`,
          { excludeProjectId: query.excludeProjectId },
        );
      }

      const users = await qb.getMany();

      return successResponse({
        message: 'Lay danh sach user thanh cong',
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          systemRole: user.systemRole,
        })),
      });
    } catch {
      throw AppErrors.users.userLoadFailed();
    }
  }

  async createUser(input: CreateUserInput) {
    const user = this.userRepository.create({
      email: input.email,
      username: input.username,
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      isActive: true,
      systemRole: input.systemRole ?? SystemRole.USER,
    });

    return this.userRepository.save(user);
  }

  async updateStatus(userId: string, isActive: boolean) {
    const user = await this.findById(userId);
    if (!user) throw AppErrors.auth.userNotFound();

    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  async updateSystemRole(userId: string, systemRole: SystemRole) {
    const user = await this.findById(userId);
    if (!user) throw AppErrors.auth.userNotFound();

    user.systemRole = systemRole;
    return this.userRepository.save(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    const user = await this.findById(userId);
    if (!user) throw AppErrors.auth.userNotFound();

    user.passwordHash = passwordHash;
    return this.userRepository.save(user);
  }

  async updateProfile(userId: string, input: UpdateUserInput) {
    if (input.email === undefined && input.username === undefined && input.fullName === undefined) {
      throw AppErrors.common.validationMessages(['Can it nhat mot truong de cap nhat']);
    }

    const user = await this.findById(userId);
    if (!user) throw AppErrors.auth.userNotFound();

    if (input.email !== undefined) {
      const existingEmail = await this.findByEmail(input.email);
      if (existingEmail && existingEmail.id !== userId) {
        throw AppErrors.auth.emailAlreadyExists();
      }
      user.email = input.email;
    }

    if (input.username !== undefined) {
      const existingUsername = await this.findByUsername(input.username);
      if (existingUsername && existingUsername.id !== userId) {
        throw AppErrors.auth.usernameAlreadyExists();
      }
      user.username = input.username;
    }

    if (input.fullName !== undefined) {
      user.fullName = input.fullName;
    }

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.auth.accountUpdateFailed();
    }
  }
}
