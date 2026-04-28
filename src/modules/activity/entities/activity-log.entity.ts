import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('activity_logs')
@Index('idx_activity_project_created_at', ['project', 'createdAt'])
@Index('idx_activity_actor_created_at', ['actor', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;

  @Column({ name: 'action_type', type: 'varchar', length: 100 })
  actionType: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true })
  targetType?: string | null;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId?: string | null;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}