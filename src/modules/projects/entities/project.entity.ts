import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from './project-member.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectStatus } from '../constants/project-status.constant';
import { Board } from '../../board/entities/board.entity';

@Entity('projects')
export class Project extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'project_key', type: 'varchar', length: 20 })
  projectKey: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status_enum',
    default: ProjectStatus.PLANNING,
  })
  status!: ProjectStatus;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deleted_by_user_id' })
  deletedBy!: User | null;

  @ManyToOne(() => User, (user) => user.ownedProjects, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'owner_user_id' })
  owner: User;

  @OneToMany(() => ProjectMember, (projectMember) => projectMember.project)
  projectMembers: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => Board, (board) => board.project)
  boards!: Board[];
}
