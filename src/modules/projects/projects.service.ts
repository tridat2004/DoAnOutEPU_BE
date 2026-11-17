import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectMember } from './entities/project-member.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successPaginationResponse, successResponse } from '../../common/response';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';
import { ActivityService } from '../activity/activity.service';
import { SystemRole } from '../auth/constants/system-role.constant';
import { ProjectStatus } from './constants/project-status.constant';
import { ListDeletedProjectsDto } from './dto/list-deleted-projects.dto';
import { Permission } from '../auth/entities/permission.entity';
import { ListProjectsDto } from './dto/list-projects.dto';
import { Board } from '../board/entities/board.entity';
import { BoardColumn } from '../board/entities/board-column.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly activityService: ActivityService,
  ) {}

  async createProject(dto: CreateProjectDto, currentUser: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw AppErrors.project.authRequired();
    }

    const owner = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!owner) {
      throw AppErrors.auth.userNotFound();
    }

    if (!owner.isActive) {
      throw AppErrors.auth.accountDisabled();
    }

    const normalizedName = dto.name.trim();
    const normalizedProjectKey = dto.projectKey.trim().toUpperCase();
    const normalizedDescription = dto.description?.trim() || null;
    this.validateProjectDates(dto.startDate ?? null, dto.endDate ?? null);

    const existingProject = await this.projectRepository.findOne({
      where: { projectKey: normalizedProjectKey },
    });

    if (existingProject) {
      throw AppErrors.project.projectKeyAlreadyExists();
    }

    const managerRole =
      (await this.roleRepository.findOne({ where: { code: 'manager' } })) ??
      (await this.roleRepository.findOne({ where: { code: 'admin' } }));

    if (!managerRole) {
      throw AppErrors.project.adminRoleNotSeeded();
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const project = manager.create(Project, {
          name: normalizedName,
          projectKey: normalizedProjectKey,
          description: normalizedDescription || undefined,
          startDate: dto.startDate ?? null,
          endDate: dto.endDate ?? null,
          status: dto.status ?? ProjectStatus.PLANNING,
          archivedAt: null,
          owner,
        });

        const savedProject = await manager.save(Project, project);

        const defaultStatuses = await manager.find(TaskStatus, {
          where: { code: In(['todo', 'in_progress', 'done']) },
          order: { position: 'ASC' },
        });
        if (defaultStatuses.length === 0) {
          throw AppErrors.task.taskStatusNotFound();
        }
        const defaultBoard = await manager.save(
          Board,
          manager.create(Board, {
            project: savedProject,
            name: 'Main Board',
            position: 0,
            isDefault: true,
          }),
        );
        await manager.save(
          BoardColumn,
          defaultStatuses.map((status, position) =>
            manager.create(BoardColumn, {
              board: defaultBoard,
              status,
              name: status.name,
              color: status.color ?? null,
              position,
              wipLimit: null,
            }),
          ),
        );

        const projectMember = manager.create(ProjectMember, {
          project: savedProject,
          user: owner,
          role: managerRole,
          joinedAt: new Date(),
        });

        await manager.save(ProjectMember, projectMember);
        await this.activityService.log({
          actor: owner,
          project: savedProject,
          actionType: ActivityAction.PROJECT_CREATED,
          targetType: ActivityTargetType.PROJECT,
          targetId: savedProject.id,
          message: `${owner.fullName} da tao project ${savedProject.name}`,
          metadata: {
            projectId: savedProject.id,
            projectKey: savedProject.projectKey,
          },
        });
        return savedProject;
      });

      return successResponse({
        message: 'Create project successfully',
        data: {
          id: result.id,
          name: result.name,
          projectKey: result.projectKey,
          description: result.description,
          startDate: result.startDate,
          endDate: result.endDate,
          status: result.status,
          archivedAt: result.archivedAt,
          owner: {
            id: owner.id,
            email: owner.email,
            username: owner.username,
            fullName: owner.fullName,
          },
        },
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw AppErrors.project.projectCreationFailed();
    }
  }

  async getProjectDetail(projectId: string, currentUser: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw AppErrors.project.authRequired();
    }

    const membership = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: currentUser.id },
      },
      relations: {
        project: {
          owner: true,
        },
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    const project =
      membership?.project ??
      (await this.projectRepository.findOne({
        where: { id: projectId },
        relations: { owner: true },
      }));

    if (!project) {
      throw AppErrors.project.projectNotFound();
    }

    if (!membership && currentUser.systemRole !== SystemRole.ADMIN) {
      throw AppErrors.project.membershipRequired();
    }

    const myPermissions =
      currentUser.systemRole === SystemRole.ADMIN
        ? (await this.permissionRepository.find({ order: { code: 'ASC' } })).map(
            (permission) => permission.code,
          )
        : (membership?.role.rolePermissions ?? [])
            .map((rolePermission) => rolePermission.permission.code)
            .sort();

    return successResponse({
      message: 'Get project detail successfully',
      data: {
        id: project.id,
        name: project.name,
        projectKey: project.projectKey,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        archivedAt: project.archivedAt,
        owner: project.owner
          ? {
              id: project.owner.id,
              email: project.owner.email,
              username: project.owner.username,
              fullName: project.owner.fullName,
            }
          : null,
        myRole: membership
          ? {
              id: membership.role.id,
              code: membership.role.code,
              name: membership.role.name,
            }
          : {
              id: null,
              code: 'system_admin',
              name: 'System Admin',
            },
        myPermissions,
      },
    });
  }

  async getMyProject(query: ListProjectsDto, currentUser: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw AppErrors.project.authRequired();
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) throw AppErrors.auth.userNotFound();
    if (!user.isActive) throw AppErrors.auth.accountDisabled();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const keyword = query.keyword?.trim();

    if (user.systemRole === SystemRole.ADMIN) {
      const qb = this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.owner', 'owner')
        .orderBy('project.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (keyword) {
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('project.name ILIKE :keyword', { keyword: `%${keyword}%` })
              .orWhere('project.projectKey ILIKE :keyword', { keyword: `%${keyword}%` });
          }),
        );
      }

      const [projects, total] = await qb.getManyAndCount();

      return successPaginationResponse({
        message: 'Get project list successfully',
        data: projects.map((project) => ({
          id: project.id,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          name: project.name,
          projectKey: project.projectKey,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          archivedAt: project.archivedAt,
          owner: project.owner
            ? {
                id: project.owner.id,
                email: project.owner.email,
                username: project.owner.username,
                fullName: project.owner.fullName,
              }
            : null,
          role: {
            id: null,
            code: 'system_admin',
            name: 'System Admin',
          },
          joinedAt: null,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    }

    const membershipQb = this.projectMemberRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .innerJoinAndSelect('membership.role', 'role')
      .where('membership.user_id = :userId', { userId: currentUser.id })
      .orderBy('membership.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (keyword) {
      membershipQb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('project.name ILIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('project.projectKey ILIKE :keyword', { keyword: `%${keyword}%` });
        }),
      );
    }

    const [memberships, total] = await membershipQb.getManyAndCount();

    return successPaginationResponse({
      message: 'Get project list successfully',
      data: memberships.map((item) => ({
        id: item.project.id,
        createdAt: item.project.createdAt,
        updatedAt: item.project.updatedAt,
        name: item.project.name,
        projectKey: item.project.projectKey,
        description: item.project.description,
        startDate: item.project.startDate,
        endDate: item.project.endDate,
        status: item.project.status,
        archivedAt: item.project.archivedAt,
        owner: item.project.owner
          ? {
              id: item.project.owner.id,
              email: item.project.owner.email,
              username: item.project.owner.username,
              fullName: item.project.owner.fullName,
            }
          : null,
        role: {
          id: item.role.id,
          code: item.role.code,
          name: item.role.name,
        },
        joinedAt: item.joinedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  }

  async updateProject(projectId: string, dto: UpdateProjectDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.startDate === undefined &&
      dto.endDate === undefined &&
      dto.status === undefined
    ) {
      throw AppErrors.project.projectUpdatePayloadEmpty();
    }

    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    const nextDescription = dto.description !== undefined ? dto.description.trim() : undefined;
    const nextStartDate = dto.startDate !== undefined ? dto.startDate : undefined;
    const nextEndDate = dto.endDate !== undefined ? dto.endDate : undefined;

    if (dto.name !== undefined && !nextName) {
      throw AppErrors.common.validationMessages(['Name is required']);
    }

    if (nextName !== undefined) project.name = nextName;
    if (nextDescription !== undefined) project.description = nextDescription || undefined;
    if (nextStartDate !== undefined) project.startDate = nextStartDate || null;
    if (nextEndDate !== undefined) project.endDate = nextEndDate || null;
    if (dto.status !== undefined) project.status = dto.status;

    this.validateProjectDates(project.startDate, project.endDate);

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (!actor) throw AppErrors.auth.userNotFound();

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(Project, project);
        await this.activityService.log(
          {
            actor,
            project: saved,
            actionType: ActivityAction.PROJECT_UPDATED,
            targetType: ActivityTargetType.PROJECT,
            targetId: saved.id,
            message: `${actor.fullName} da cap nhat project ${saved.name}`,
            metadata: {
              projectId: saved.id,
              projectKey: saved.projectKey,
            },
          },
          manager,
        );
        return saved;
      });

      return successResponse({
        message: 'Update project successfully',
        data: {
          id: updated.id,
          name: updated.name,
          projectKey: updated.projectKey,
          description: updated.description,
          startDate: updated.startDate,
          endDate: updated.endDate,
          status: updated.status,
          archivedAt: updated.archivedAt,
          owner: updated.owner
            ? {
                id: updated.owner.id,
                email: updated.owner.email,
                username: updated.owner.username,
                fullName: updated.owner.fullName,
              }
            : null,
          updatedBy: currentUser.id,
        },
      });
    } catch {
      throw AppErrors.project.projectUpdateFailed();
    }
  }

  async deleteProject(projectId: string, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!actor) throw AppErrors.auth.userNotFound();

    try {
      await this.dataSource.transaction(async (manager) => {
        project.deletedBy = actor;
        await manager.save(Project, project);
        await manager.softRemove(Project, project);
        await this.activityService.log(
          {
            actor,
            project,
            actionType: ActivityAction.PROJECT_DELETED,
            targetType: ActivityTargetType.PROJECT,
            targetId: project.id,
            message: `${actor.fullName} da xoa project ${project.name}`,
            metadata: {
              projectId: project.id,
              projectKey: project.projectKey,
              projectName: project.name,
            },
          },
          manager,
        );
      });

      return successResponse({
        message: 'Delete project successfully',
        data: {
          id: project.id,
          deletedBy: currentUser.id,
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.project.projectDeleteFailed();
    }
  }

  async restoreProject(projectId: string, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
      withDeleted: true,
    });

    if (!project) throw AppErrors.project.projectNotFound();

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!actor) throw AppErrors.auth.userNotFound();

    if (!project.deletedAt) {
      return successResponse({
        message: 'Project chua bi xoa',
        data: { id: project.id },
      });
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.restore(Project, project.id);
        await this.activityService.log(
          {
            actor,
            project,
            actionType: ActivityAction.PROJECT_RESTORED,
            targetType: ActivityTargetType.PROJECT,
            targetId: project.id,
            message: `${actor.fullName} da khoi phuc project ${project.name}`,
            metadata: {
              projectId: project.id,
              projectKey: project.projectKey,
              projectName: project.name,
            },
          },
          manager,
        );
      });

      return successResponse({
        message: 'Restore project successfully',
        data: {
          id: project.id,
          restoredBy: currentUser.id,
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.project.projectRestoreFailed();
    }
  }

  async getDeletedProjects(query: ListDeletedProjectsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    try {
      const qb = this.projectRepository
        .createQueryBuilder('project')
        .withDeleted()
        .leftJoinAndSelect('project.owner', 'owner')
        .leftJoinAndSelect('project.deletedBy', 'deletedBy')
        .where('project.deleted_at IS NOT NULL')
        .orderBy('project.deleted_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.keyword?.trim()) {
        const keyword = `%${query.keyword.trim()}%`;
        qb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('project.name ILIKE :keyword', { keyword })
              .orWhere('project.project_key ILIKE :keyword', { keyword });
          }),
        );
      }

      const [projects, total] = await qb.getManyAndCount();

      return successPaginationResponse({
        message: 'Lay danh sach project da xoa thanh cong',
        data: projects.map((project) => ({
          id: project.id,
          name: project.name,
          projectKey: project.projectKey,
          description: project.description,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          archivedAt: project.archivedAt,
          deletedAt: project.deletedAt,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.owner
            ? {
                id: project.owner.id,
                email: project.owner.email,
                username: project.owner.username,
                fullName: project.owner.fullName,
              }
            : null,
          deletedBy: project.deletedBy
            ? {
                id: project.deletedBy.id,
                email: project.deletedBy.email,
                username: project.deletedBy.username,
                fullName: project.deletedBy.fullName,
              }
            : null,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.project.projectListLoadFailed();
    }
  }

  async setProjectArchived(projectId: string, archived: boolean, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();

    const actor = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });
    if (!actor) throw AppErrors.auth.userNotFound();

    if (Boolean(project.archivedAt) === archived) {
      return successResponse({
        message: archived ? 'Project da duoc archive' : 'Project chua bi archive',
        data: { id: project.id, archivedAt: project.archivedAt },
      });
    }

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        project.archivedAt = archived ? new Date() : null;
        const saved = await manager.save(Project, project);
        await this.activityService.log(
          {
            actor,
            project: saved,
            actionType: archived
              ? ActivityAction.PROJECT_ARCHIVED
              : ActivityAction.PROJECT_UNARCHIVED,
            targetType: ActivityTargetType.PROJECT,
            targetId: saved.id,
            message: archived
              ? `${actor.fullName} da archive project ${saved.name}`
              : `${actor.fullName} da bo archive project ${saved.name}`,
            metadata: {
              projectId: saved.id,
              projectKey: saved.projectKey,
            },
          },
          manager,
        );
        return saved;
      });

      return successResponse({
        message: archived ? 'Archive project thanh cong' : 'Bo archive project thanh cong',
        data: { id: updated.id, archivedAt: updated.archivedAt },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.project.projectUpdateFailed();
    }
  }

  async leaveProject(projectId: string, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();
    if (project.owner.id === currentUser.id) {
      throw AppErrors.project.ownerRemovalNotAllowed();
    }

    const membership = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: currentUser.id },
      },
      relations: { user: true, role: true },
    });

    if (!membership) throw AppErrors.project.memberNotFound();

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.remove(ProjectMember, membership);
        await this.activityService.log(
          {
            actor: membership.user,
            project,
            actionType: ActivityAction.PROJECT_MEMBER_REMOVED,
            targetType: ActivityTargetType.MEMBER,
            targetId: membership.id,
            message: `${membership.user.fullName} da roi project ${project.name}`,
            metadata: {
              memberId: membership.id,
              removedUserId: membership.user.id,
              selfLeave: true,
            },
          },
          manager,
        );
      });

      return successResponse({
        message: 'Roi project thanh cong',
        data: { projectId, userId: currentUser.id },
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.project.memberDeletionFailed();
    }
  }

  private validateProjectDates(startDate: string | null, endDate: string | null) {
    if (startDate && endDate && startDate > endDate) {
      throw AppErrors.common.validationMessages(['startDate phai nho hon hoac bang endDate']);
    }
  }
}
