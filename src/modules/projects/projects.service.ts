import { Injectable } from "@nestjs/common";
import { DataSource, In, Repository } from "typeorm";
import { Project } from "./entities/project.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ProjectMember } from "./entities/project-member.entity";
import { Role } from "../auth/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { CreateProjectDto } from "./dto/create-project.dto";
import { AppErrors, AppException } from "../../common/exceptions/exception";
import { exit } from "process";
import { successResponse } from "../../common/response";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';
import { ActivityService } from '../activity/activity.service';

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
    private readonly activityService: ActivityService,
  ) { }

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

    const existingProject = await this.projectRepository.findOne({
      where: { projectKey: normalizedProjectKey },
    });

    if (existingProject) {
      throw AppErrors.project.projectKeyAlreadyExists();
    }

    const adminRole = await this.roleRepository.findOne({
      where: { code: 'admin' },
    });

    if (!adminRole) {
      throw AppErrors.project.adminRoleNotSeeded();
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const project = manager.create(Project, {
          name: normalizedName,
          projectKey: normalizedProjectKey,
          description: normalizedDescription || undefined,
          owner,
        });

        const savedProject = await manager.save(Project, project);

        const projectMember = manager.create(ProjectMember, {
          project: savedProject,
          user: owner,
          role: adminRole,
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
        role: true,
      }
    });

    if (!membership) {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw AppErrors.project.projectNotFound();
      }

      throw AppErrors.project.membershipRequired();
    }

    return successResponse({
      message: 'Get project detail successfully',
      data: {
        id: membership.project.id,
        name: membership.project.name,
        projectKey: membership.project.projectKey,
        description: membership.project.description,
        owner: membership.project.owner
          ? {
            id: membership.project.owner.id,
            email: membership.project.owner.email,
            username: membership.project.owner.username,
            fullName: membership.project.owner.fullName,
          }
          : null,
        myRole: {
          id: membership.role.id,
          code: membership.role.code,
          name: membership.role.name,
        }
      }
    })
  }

  async getMyProject(currentUser: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw AppErrors.project.authRequired();
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) throw AppErrors.auth.userNotFound();
    if (!user.isActive) throw AppErrors.auth.accountDisabled();

    const memberships = await this.projectMemberRepository.find({
      where: {
        user: { id: currentUser.id },
      },
      relations: {
        project: {
          owner: true,
        },
        role: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return successResponse({
      message: 'Get project list successfully',
      data: memberships.map((item) => ({
        id: item.project.id,
        createdAt: item.project.createdAt,
        updatedAt: item.project.updatedAt,
        name: item.project.name,
        projectKey: item.project.projectKey,
        description: item.project.description,
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
    });
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();
    if (project.owner.id !== currentUser.id) {
      throw AppErrors.project.permissionDenied();
    }

    if (dto.name === undefined && dto.description === undefined) {
      throw AppErrors.project.projectUpdatePayloadEmpty();
    }

    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    const nextDescription =
      dto.description !== undefined ? dto.description.trim() : undefined;

    if (dto.name !== undefined && !nextName) {
      throw AppErrors.common.validationMessages(['Name is required']);
    }

    if (nextName !== undefined) project.name = nextName;
    if (nextDescription !== undefined) project.description = nextDescription || undefined;

    try {
      const updated = await this.projectRepository.save(project);

      return successResponse({
        message: 'Update project successfully',
        data: {
          id: updated.id,
          name: updated.name,
          projectKey: updated.projectKey,
          description: updated.description,
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

    if (project.owner.id !== currentUser.id) {
      throw AppErrors.project.permissionDenied();
    }

    const deletedId = project.id;

    try {
      await this.projectRepository.remove(project);

      return successResponse({
        message: 'Delete project successfully',
        data: {
          id: deletedId,
          deletedBy: currentUser.id,
        },
      });
    } catch {
      throw AppErrors.project.projectDeleteFailed();
    }
  }
}