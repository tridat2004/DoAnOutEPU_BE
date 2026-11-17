import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskStatus } from '../../tasks/entities/task-status.entity';
import { Board } from './board.entity';

@Entity('board_columns')
@Unique('uq_board_columns_board_name', ['board', 'name'])
export class BoardColumn extends BaseEntity {
  @ManyToOne(() => Board, (board) => board.columns, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @ManyToOne(() => TaskStatus, (status) => status.boardColumns, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'status_id' })
  status!: TaskStatus;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ name: 'wip_limit', type: 'int', nullable: true })
  wipLimit!: number | null;

  @OneToMany(() => Task, (task) => task.boardColumn)
  tasks!: Task[];
}
