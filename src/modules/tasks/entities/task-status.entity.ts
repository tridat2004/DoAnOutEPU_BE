import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Task } from './task.entity';
import { BoardColumn } from '../../board/entities/board-column.entity';

@Entity('task_statuses')
export class TaskStatus extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color?: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => Task, (task) => task.status)
  tasks: Task[];

  @OneToMany(() => BoardColumn, (column) => column.status)
  boardColumns!: BoardColumn[];
}
