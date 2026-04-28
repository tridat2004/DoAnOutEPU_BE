import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ActivityLog } from './entities/activity-log.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { GetActivityDto } from './dto/get-activity.dto';
import { successPaginationResponse, successResponse } from '../../common/response';
import { AppErrors } from '../../common/exceptions/exception';

type CreateActivityParams = {
    actor: User;
    project?: Project | null;
    actionType: string;
    targetType?: string | null;
    targetId?: string | null;
    message: string;
    metadata?: Record<string, any> | null;
};

@Injectable()
export class ActivityService {
    constructor(
        @InjectRepository(ActivityLog)
        private readonly activityRepository: Repository<ActivityLog>
    ) { }

    async log(params: CreateActivityParams) {
        try {
            const activity = this.activityRepository.create({
                actor: params.actor,
                project: params.project ?? null,
                actionType: params.actionType,
                targetType: params.targetType ?? null,
                targetId: params.targetId ?? null,
                message: params.message,
                metadata: params.metadata ?? null,
            });

            return await this.activityRepository.save(activity)
        } catch (error) {
            console.error('ACTIVITY_LOG_CREATE_ERROR: ', error);
            throw AppErrors.activity.activityCreateFailed();
        }
    }

    async getAllActivities(query: GetActivityDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        try {
            const qb = this.activityRepository
                .createQueryBuilder('activity')
                .leftJoinAndSelect('activity.actor', 'actor')
                .leftJoinAndSelect('activity.project', 'project')
                .orderBy('activity.createdAt', 'DESC')

            if (query.actionType) {
                qb.andWhere('activity.actionType = :actionType', {
                    actionType: query.actionType
                });
            }

            qb.skip((page - 1) * limit).take(limit);

            const [rows, total] = await qb.getManyAndCount();
            const totalPages = Math.ceil(total / limit);

            return successPaginationResponse({
                message: 'Lay danh sach activity thanh cong',
                data: rows.map((item) => ({
                    id: item.id,
                    actionType: item.actionType,
                    targetType: item.targetType,
                    targetId: item.targetId,
                    message: item.message,
                    metadata: item.metadata,
                    actor: item.actor
                        ? {
                            id: item.actor.id,
                            email: item.actor.email,
                            username: item.actor.username,
                            fullName: item.actor.fullName,
                            avatarUrl: item.actor.avatarUrl,
                        }
                        : null,
                    project: item.project
                        ? {
                            id: item.project.id,
                            name: item.project.name,
                            projectKey: item.project.projectKey,
                        }
                        : null,
                    createdAt: item.createdAt,
                })),
                meta: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            });
        } catch (error) {
            console.error('GET_ALL_ACTIVITY_ERROR:', error);
            throw AppErrors.activity.activityListFailed();
        }
    }

    async getProjectActivities(projectId: string, query: GetActivityDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        try {
            const qb = this.activityRepository
                .createQueryBuilder('activity')
                .leftJoinAndSelect('activity.actor', 'actor')
                .leftJoinAndSelect('activity.project', 'project')
                .where('project.id = :projectId', { projectId })
                .orderBy('activity.createdAt', 'DESC');

            if (query.actionType) {
                qb.andWhere('activity.actionType = :actionType', {
                    actionType: query.actionType,
                });
            }

            qb.skip((page - 1) * limit).take(limit);

            const [rows, total] = await qb.getManyAndCount();
            const totalPages = Math.ceil(total / limit);

            return successPaginationResponse({
                message: 'Lay activity cua project thanh cong',
                data: rows.map((item) => ({
                    id: item.id,
                    actionType: item.actionType,
                    targetType: item.targetType,
                    targetId: item.targetId,
                    message: item.message,
                    metadata: item.metadata,
                    actor: item.actor
                        ? {
                            id: item.actor.id,
                            email: item.actor.email,
                            username: item.actor.username,
                            fullName: item.actor.fullName,
                            avatarUrl: item.actor.avatarUrl,
                        }
                        : null,
                    project: item.project
                        ? {
                            id: item.project.id,
                            name: item.project.name,
                            projectKey: item.project.projectKey,
                        }
                        : null,
                    createdAt: item.createdAt,
                })),
                meta: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            });
        } catch (error) {
            console.error('GET_PROJECT_ACTIVITY_ERROR:', error);
            throw AppErrors.activity.projectActivityListFailed();
        }
    }
}