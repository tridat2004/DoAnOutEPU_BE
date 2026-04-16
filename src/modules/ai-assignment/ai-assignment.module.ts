import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AiAssignmentService } from './ai-assignment.service';
import { AiAssignmentController } from './ai-assignment.controller';
import { AiRecommendationController } from './ai-recommendation.controller';

import { UserSkill } from './entities/user-skill.entity';
import { AiAssignmentLog } from './entities/ai-assignment-log.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    HttpModule,
    TasksModule,
    TypeOrmModule.forFeature([
      UserSkill,
      AiAssignmentLog,
      User,
      Task,
      Project,
      ProjectMember,
    ]),
  ],
  controllers: [AiAssignmentController, AiRecommendationController],
  providers: [AiAssignmentService],
  exports: [AiAssignmentService, TypeOrmModule],
})
export class AiAssignmentModule {}