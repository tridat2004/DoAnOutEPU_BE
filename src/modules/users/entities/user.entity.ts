import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskComment } from '../../tasks/entities/task-comment.entity';
import { TaskHistory } from '../../tasks/entities/task-history.entity';
import { UserSkill } from '../../ai-assignment/entities/user-skill.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { SystemRole } from '../../auth/constants/system-role.constant';
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'system_role',
    type: 'enum',
    enum: SystemRole,
    enumName: 'user_system_role_enum',
    default: SystemRole.USER,
  })
  systemRole: SystemRole;

  @OneToMany(() => Project, (project) => project.owner)
  ownedProjects: Project[];

  @OneToMany(() => ProjectMember, (projectMember) => projectMember.user)
  projectMembers: ProjectMember[];

  @OneToMany(() => Task, (task) => task.reporter)
  reportedTasks: Task[];

  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks: Task[];

  @OneToMany(() => TaskComment, (comment) => comment.author)
  taskComments!: TaskComment[];

  @OneToMany(() => TaskHistory, (history) => history.changedBy)
  taskHistories!: TaskHistory[];

  @OneToMany(() => UserSkill, (userSkill) => userSkill.user)
  userSkills!: UserSkill[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}
