import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from './entities/project-member.entity';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Project } from './entities/project.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';

@Injectable()
export class ProjectMembersService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly notificationsService: NotificationsService,

    private readonly activityService: ActivityService
  ) { }

  findByProjectAndUser(projectId: string, userId: string) {
    return this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: userId },
      },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
        project: true,
        user: true,
      },
    });
  }

  async addMember(projectId: string, dto: AddProjectMemberDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: {
        owner: true
      }
    })

    if (!project) throw AppErrors.project.projectNotFound()

    const user = await this.userRepository.findOne({
      where: { id: dto.userId }
    });
    if (!user) throw AppErrors.auth.userNotFound();

    if (!user.isActive) throw AppErrors.auth.accountDisabled();

    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId }
    });

    if (!role) throw AppErrors.project.roleNotFound();
    
    const currentUserEntity = await this.userRepository.findOne({
      where: { id: currentUser.id }
    });
    if (!currentUserEntity) throw AppErrors.auth.userNotFound();
    
    const exitstingMember = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: dto.userId },
      },
      relations: {
        role: true,
        user: true
      },
    });

    if (exitstingMember) throw AppErrors.project.memberAlreadyExists();

    try {
      const member = this.projectMemberRepository.create({
        project,
        user,
        role,
        joinedAt: new Date(),
      });
      const savedMember = await this.projectMemberRepository.save(member);
      await this.notificationsService.createAndPush(user.id, {
        type: 'project_member_added',
        title: 'You were added to a project',
        message: `You were added to project ${project.name} as ${role.name}`,
        relatedUrl: `/projects/${project.id}`,
        metadataJson: {
          projectId: project.id,
          roleCode: role.code,
        },
      });
      await this.activityService.log({
        actor: currentUserEntity,
        project,
        actionType: ActivityAction.PROJECT_MEMBER_ADDED,
        targetType: ActivityTargetType.MEMBER,
        targetId: savedMember.id,
        message: `${currentUserEntity.fullName} da them ${user.fullName} vao project ${project.name}`,
        metadata: {
          memberId: savedMember.id,
          addedUserId: user.id,
          addedUserFullName: user.fullName,
          role: role.name,
        },
      });
      return successResponse({
        message: 'Them thanh vien vao project thanh cong',
        data: {
          id: savedMember.id,
          projectId: project.id,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
          },
          role: {
            id: role.id,
            code: role.code,
            name: role.name,
          },
          joinedAt: savedMember.joinedAt,
          addedBy: currentUser.id,
        },
      })
    } catch {
      throw AppErrors.project.memberCreationFailed();
    }
  }

  async getMember(projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw AppErrors.project.projectNotFound();

    const members = await this.projectMemberRepository.find({
      where: {
        project: { id: projectId },
      },

      relations: {
        user: true,
        role: true
      },
      order: {
        createdAt: 'ASC',
      }
    })
    return successResponse({
      message: 'Lay danh sach thanh vien thanh cong',
      data: members.map((member) => ({
        id: member.id,
        user: {
          id: member.user.id,
          email: member.user.email,
          username: member.user.username,
          fullName: member.user.fullName,
          avatarUrl: member.user.avatarUrl,
          isActive: member.user.isActive,
        },
        role: {
          id: member.role.id,
          code: member.role.code,
          name: member.role.name,
        },
        joinedAt: member.joinedAt,
      })),
    })
  }

  async updateMemberRole(projectId: string, memberId: string, dto: UpdateProjectMemberRoleDto, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: {
        owner: true,
      }
    });
    if (!project) {
      throw AppErrors.project.projectNotFound();
    }
    const member = await this.projectMemberRepository.findOne({
      where: {
        id: memberId,
        project: { id: projectId }
      },
      relations: {
        user: true,
        role: true,
        project: true,
      }
    })

    if (!member) throw AppErrors.project.memberNotFound();

    const nextRole = await this.roleRepository.findOne({
      where: { id: dto.roleId },
    });

    if (!nextRole) throw AppErrors.project.roleNotFound();
    if (member.user.id === project.owner.id) {
      throw AppErrors.project.ownerRoleChangeNotAllowed();
    }

    member.role = nextRole;
    try {
      const updatedMember = await this.projectMemberRepository.save(member);

      return successResponse({
        message: 'Cap nhat role thanh vien thanh cong',
        data: {
          id: updatedMember.id,
          projectId: project.id,
          user: {
            id: updatedMember.user.id,
            email: updatedMember.user.email,
            username: updatedMember.user.username,
            fullName: updatedMember.user.fullName,
          },
          role: {
            id: updatedMember.role.id,
            code: updatedMember.role.code,
            name: updatedMember.role.name,
          },
          updatedBy: currentUser.id,
        },
      })
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppErrors.project.memberRoleUpdateFailed();
    }
  }

  async removeMember(projectId: string, memberId: string, currentUser: AuthenticatedUser) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: { owner: true },
    });

    if (!project) throw AppErrors.project.projectNotFound();

    const currentUserEntity = await this.userRepository.findOne({
      where: { id: currentUser.id }
    });
    if (!currentUserEntity) throw AppErrors.auth.userNotFound();

    const member = await this.projectMemberRepository.findOne({
      where: {
        id: memberId,
        project: { id: projectId },
      },
      relations: {
        user: true,
        role: true,
      }
    });

    if (!member) throw AppErrors.project.memberNotFound();

    if (member.user.id === project.owner.id) {
      throw AppErrors.project.ownerRemovalNotAllowed();
    }
    try {
      await this.projectMemberRepository.remove(member);
      await this.activityService.log({
  actor: currentUserEntity,
  project,
  actionType: ActivityAction.PROJECT_MEMBER_REMOVED,
  targetType: ActivityTargetType.MEMBER,
  targetId: member.id,
  message: `${currentUserEntity.fullName} da xoa ${member.user.fullName} khoi project ${project.name}`,
  metadata: {
    memberId: member.id,
    removedUserId: member.user.id,
    removedUserFullName: member.user.fullName,
  },
});
      return successResponse({
        message: 'Xoa thanh vien khoi project thanh cong',
        data: {
          id: member.id,
          projectId,
          removedUserId: member.user.id,
          removedBy: currentUser.id,
        },
      })
    } catch (error) {
      if (error instanceof AppException) {
        throw error
      }
      throw AppErrors.project.memberDeletionFailed();
    }
  }
}