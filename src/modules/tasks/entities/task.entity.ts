import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';
import { TaskType } from './task-type.entity';
import { TaskStatus } from './task-status.entity';
import { Priority } from './priority.entity';
import { User } from '../../users/entities/user.entity';
import { TaskComment } from './task-comment.entity';
import { TaskHistory } from './task-history.entity';
import { BoardColumn } from '../../board/entities/board-column.entity';
@Entity('tasks')
export class Task extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deleted_by_user_id' })
  deletedBy!: User | null;

  @ManyToOne(() => Project, (project) => project.tasks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Index({ unique: true })
  @Column({ name: 'task_code', type: 'varchar', length: 30 })
  taskCode!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToOne(() => TaskType, (taskType) => taskType.tasks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'task_type_id' })
  taskType!: TaskType;

  @ManyToOne(() => TaskStatus, (status) => status.tasks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'status_id' })
  status!: TaskStatus;

  @ManyToOne(() => BoardColumn, (column) => column.tasks, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'board_column_id' })
  boardColumn!: BoardColumn | null;

  @ManyToOne(() => Priority, (priority) => priority.tasks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'priority_id' })
  priority!: Priority;

  @ManyToOne(() => User, (user) => user.reportedTasks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reporter_user_id' })
  reporter!: User;

  @ManyToOne(() => User, (user) => user.assignedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_user_id' })
  assignee!: User | null;

  @ManyToOne(() => Task, (task) => task.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask!: Task | null;

  @OneToMany(() => Task, (task) => task.parentTask)
  children!: Task[];

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ name: 'estimated_hours', type: 'int', nullable: true })
  estimatedHours!: number | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @OneToMany(() => TaskComment, (comment) => comment.task)
  comments!: TaskComment[];

  @OneToMany(() => TaskHistory, (history) => history.task)
  histories!: TaskHistory[];
}
