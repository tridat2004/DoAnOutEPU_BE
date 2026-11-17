import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../projects/entities/project.entity';
import { BoardColumn } from './board-column.entity';

@Entity('boards')
@Unique('uq_boards_project_name', ['project', 'name'])
export class Board extends BaseEntity {
  @ManyToOne(() => Project, (project) => project.boards, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Index()
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @OneToMany(() => BoardColumn, (column) => column.board)
  columns!: BoardColumn[];
}
