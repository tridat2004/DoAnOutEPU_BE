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

        return savedProject;
      });

      return successResponse({
        message: 'Tạo project thành công',
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

  async getProjectDetail(projectId: string, currentUser: AuthenticatedUser){
    if(!currentUser?.id){
      throw AppErrors.project.authRequired();
    }

    const membership = await this.projectMemberRepository.findOne({
      where: {
        project: {id : projectId},
        user: { id: currentUser.id},
      },
      relations: {
        project: {
          owner: true,
        },
        role: true,
      }
    });

    if(!membership){
      const project = await this.projectRepository.findOne({
        where: { id : projectId},
      });

      if(!project){
        throw AppErrors.project.projectNotFound();
      }

      throw AppErrors.project.membershipRequired();
    }

    return successResponse({
      message: 'Lấy chi tiết project thành công',
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

  async getMyProject(currentUser: AuthenticatedUser){
    if(!currentUser?.id){
      throw AppErrors.project.authRequired();
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUser.id},
    })

    if(!user) {
      throw AppErrors.auth.userNotFound();
    }
    if(!user.isActive){
      throw AppErrors.auth.accountDisabled();
    }

    const memberships = await this.projectMemberRepository.find({
      where:{
        user: { id : currentUser.id},
      },
      relations: {
        project: true,
        role: true,
      },
      order:{
        createdAt: 'DESC',
      }
    });
    return successResponse({
      message: 'Lấy danh sách project thành công',
      data: memberships.map((item) => ({
        projectId: item.project.id,
        name: item.project.name,
        projectKey: item.project.projectKey,
        description: item.project.description,
        role: {
          id: item.role.id,
          code: item.role.code,
          name: item.role.name,
        },
        joinedAt: item.joinedAt,
      })),
    })
  }

  async updateProject(projectId: string, dto: UpdateProjectDto, currentUser: AuthenticatedUser){
    const project = await this.projectRepository.findOne({
      where: {id : projectId},
      relations: {
        owner: true,
      }
    })

    if(!project){
      throw AppErrors.project.projectNotFound();
    }

    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    const nextDescription = dto.description !== undefined? dto.description.trim() : undefined;

    if(dto.name === undefined && dto.description === undefined){
      throw AppErrors.project.projectUpdatePayloadEmpty();
    }

    if(dto.name !== undefined && !nextName){
      throw AppErrors.common.validationMessages([
        'Tên project không được để trống',
      ])
    }

    if(nextName !== undefined){
      project.name = nextName;
    }

    if( nextDescription !== undefined){
      project.description = nextDescription ||undefined;
    }
    try{
      const updated = await this.projectRepository.save(project);

      return successResponse({
        message: 'Cập nhật project thành công',
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
        }
      })
    }catch{
      throw AppErrors.project.projectUpdateFailed();
    }
  }

  async deleteProject(projectId: string, currentUser: AuthenticatedUser){
    const project = await this.projectRepository.findOne({
      where:{id:projectId},
    })

    if(!project) throw AppErrors.project.projectNotFound();

    try{
      await this.projectRepository.remove(project);

      return successResponse({
        message:'Xoá project thành công',
        data:{
          id: project.id,
          deletedBy: currentUser.id,
        }
      });
    }catch{
      throw AppErrors.project.projectDeleteFailed();
    }
  }
}