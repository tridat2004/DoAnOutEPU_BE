import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppErrors, AppException } from '../../common/exceptions/exception';
import { successResponse } from '../../common/response';
import { ActivityAction } from '../activity/constants/activity-action.constant';
import { ActivityTargetType } from '../activity/constants/activity-target.constant';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/entities/task-status.entity';
import { User } from '../users/entities/user.entity';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { ReorderBoardColumnsDto } from './dto/reorder-board-columns.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardColumn } from './entities/board-column.entity';
import { Board } from './entities/board.entity';

const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#64748B' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'Done', color: '#22C55E' },
] as const;

@Injectable()
export class BoardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(BoardColumn)
    private readonly boardColumnRepository: Repository<BoardColumn>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityService: ActivityService,
  ) {}

  async getBoards(projectId: string) {
    await this.ensureProject(projectId);
    const boards = await this.boardRepository.find({
      where: { project: { id: projectId } },
      relations: { columns: { status: true } },
      order: { position: 'ASC', createdAt: 'ASC', columns: { position: 'ASC' } },
    });

    return successResponse({
      message: 'Lay danh sach board thanh cong',
      data: boards.map((board) => this.serializeBoardSummary(board)),
    });
  }

  async getBoard(projectId: string, boardId?: string) {
    const project = await this.ensureProject(projectId);
    const board = await this.boardRepository.findOne({
      where: boardId
        ? { id: boardId, project: { id: projectId } }
        : { project: { id: projectId }, isDefault: true },
      relations: { columns: { status: true }, project: true },
      order: { columns: { position: 'ASC', createdAt: 'ASC' } },
    });
    if (!board) throw AppErrors.task.boardNotFound();

    const tasks = await this.taskRepository.find({
      where: { boardColumn: { board: { id: board.id } } },
      relations: {
        boardColumn: true,
        status: true,
        priority: true,
        assignee: true,
        reporter: true,
        taskType: true,
        parentTask: true,
      },
      order: { position: 'ASC', createdAt: 'ASC' },
    });

    return successResponse({
      message: 'Lay du lieu board thanh cong',
      data: {
        project: { id: project.id, name: project.name, projectKey: project.projectKey },
        board: {
          id: board.id,
          name: board.name,
          position: board.position,
          isDefault: board.isDefault,
        },
        columns: board.columns.map((column) => ({
          id: column.id,
          name: column.name,
          color: column.color,
          position: column.position,
          wipLimit: column.wipLimit,
          status: {
            id: column.status.id,
            code: column.status.code,
            name: column.name,
            color: column.color,
            position: column.position,
          },
          tasks: tasks
            .filter((task) => task.boardColumn?.id === column.id)
            .map((task) => this.serializeTask(task, column)),
        })),
      },
    });
  }

  async createBoard(projectId: string, dto: CreateBoardDto, currentUser: AuthenticatedUser) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const name = dto.name.trim();
    const duplicate = await this.boardRepository
      .createQueryBuilder('board')
      .where('board.project_id = :projectId', { projectId })
      .andWhere('LOWER(board.name) = LOWER(:name)', { name })
      .getOne();
    if (duplicate) throw AppErrors.task.boardAlreadyExists();

    try {
      const board = await this.dataSource.transaction(async (manager) => {
        const boardRepository = manager.getRepository(Board);
        const count = await boardRepository.count({ where: { project: { id: projectId } } });
        const maxPosition = await boardRepository
          .createQueryBuilder('board')
          .select('COALESCE(MAX(board.position), -1)', 'max')
          .where('board.project_id = :projectId', { projectId })
          .getRawOne<{ max: string }>();

        const savedBoard = await boardRepository.save(
          boardRepository.create({
            project,
            name,
            position: Number(maxPosition?.max ?? -1) + 1,
            isDefault: count === 0,
          }),
        );

        for (const [position, definition] of DEFAULT_COLUMNS.entries()) {
          await this.createColumnEntities(manager, savedBoard, {
            name: definition.name,
            color: definition.color,
            position,
            wipLimit: null,
          });
        }

        await this.activityService.log(
          {
            actor,
            project,
            actionType: ActivityAction.BOARD_CREATED,
            targetType: ActivityTargetType.BOARD,
            targetId: savedBoard.id,
            message: `${actor.fullName} da tao board ${savedBoard.name}`,
            metadata: { boardId: savedBoard.id, boardName: savedBoard.name },
          },
          manager,
        );
        return savedBoard;
      });

      return this.getBoard(projectId, board.id);
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.task.boardUpdateFailed();
    }
  }

  async updateBoard(
    projectId: string,
    boardId: string,
    dto: UpdateBoardDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const board = await this.findBoard(projectId, boardId);
    const name = dto.name.trim();
    const duplicate = await this.boardRepository
      .createQueryBuilder('board')
      .where('board.project_id = :projectId', { projectId })
      .andWhere('LOWER(board.name) = LOWER(:name)', { name })
      .andWhere('board.id <> :boardId', { boardId })
      .getOne();
    if (duplicate) throw AppErrors.task.boardAlreadyExists();

    board.name = name;
    await this.boardRepository.save(board);
    await this.activityService.log({
      actor,
      project,
      actionType: ActivityAction.BOARD_UPDATED,
      targetType: ActivityTargetType.BOARD,
      targetId: board.id,
      message: `${actor.fullName} da cap nhat board ${board.name}`,
      metadata: { boardId: board.id, boardName: board.name },
    });
    return this.getBoard(projectId, board.id);
  }

  async deleteBoard(projectId: string, boardId: string, currentUser: AuthenticatedUser) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const board = await this.findBoard(projectId, boardId);
    const boardCount = await this.boardRepository.count({ where: { project: { id: projectId } } });
    if (boardCount <= 1) throw AppErrors.task.boardMustRemain();

    const taskCount = await this.taskRepository
      .createQueryBuilder('task')
      .withDeleted()
      .innerJoin('task.boardColumn', 'column')
      .where('column.board_id = :boardId', { boardId })
      .getCount();
    if (taskCount > 0) throw AppErrors.task.boardNotEmpty();
    const deletedBoardId = board.id;
    const deletedStatusIds = (
      await this.boardColumnRepository.find({
        where: { board: { id: boardId } },
        relations: { status: true },
      })
    ).map((column) => column.status.id);

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(Board, board);
      await this.removeOrphanStatuses(manager, deletedStatusIds);
      if (board.isDefault) {
        const nextBoard = await manager.findOne(Board, {
          where: { project: { id: projectId } },
          order: { position: 'ASC', createdAt: 'ASC' },
        });
        if (nextBoard) {
          nextBoard.isDefault = true;
          await manager.save(Board, nextBoard);
        }
      }
      await this.activityService.log(
        {
          actor,
          project,
          actionType: ActivityAction.BOARD_DELETED,
          targetType: ActivityTargetType.BOARD,
          targetId: deletedBoardId,
          message: `${actor.fullName} da xoa board ${board.name}`,
          metadata: { boardId: deletedBoardId, boardName: board.name },
        },
        manager,
      );
    });

    return successResponse({ message: 'Xoa board thanh cong', data: { id: deletedBoardId } });
  }

  async createColumn(
    projectId: string,
    boardId: string,
    dto: CreateBoardColumnDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const board = await this.findBoard(projectId, boardId);
    await this.ensureColumnNameAvailable(boardId, dto.name.trim());

    try {
      const column = await this.dataSource.transaction(async (manager) => {
        const maxPosition = await manager
          .getRepository(BoardColumn)
          .createQueryBuilder('column')
          .select('COALESCE(MAX(column.position), -1)', 'max')
          .where('column.board_id = :boardId', { boardId })
          .getRawOne<{ max: string }>();
        const saved = await this.createColumnEntities(manager, board, {
          name: dto.name.trim(),
          color: dto.color?.toUpperCase() ?? null,
          position: Number(maxPosition?.max ?? -1) + 1,
          wipLimit: dto.wipLimit ?? null,
        });
        await this.activityService.log(
          {
            actor,
            project,
            actionType: ActivityAction.BOARD_COLUMN_CREATED,
            targetType: ActivityTargetType.BOARD_COLUMN,
            targetId: saved.id,
            message: `${actor.fullName} da tao column ${saved.name}`,
            metadata: { boardId, columnId: saved.id, columnName: saved.name },
          },
          manager,
        );
        return saved;
      });
      return successResponse({
        message: 'Tao column thanh cong',
        data: this.serializeColumn(column),
      });
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppErrors.task.boardUpdateFailed();
    }
  }

  async updateColumn(
    projectId: string,
    boardId: string,
    columnId: string,
    dto: UpdateBoardColumnDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const column = await this.findColumn(projectId, boardId, columnId);
    if (dto.name === undefined && dto.color === undefined && dto.wipLimit === undefined) {
      throw AppErrors.common.validationMessages(['Can it nhat mot truong de cap nhat column']);
    }
    if (dto.name !== undefined && dto.name.trim().toLowerCase() !== column.name.toLowerCase()) {
      await this.ensureColumnNameAvailable(boardId, dto.name.trim());
    }

    if (dto.name !== undefined) column.name = dto.name.trim();
    if (dto.color !== undefined) column.color = dto.color.toUpperCase();
    if (dto.wipLimit !== undefined) column.wipLimit = dto.wipLimit;
    const metadataChanged = dto.name !== undefined || dto.color !== undefined;

    await this.dataSource.transaction(async (manager) => {
      if (metadataChanged) {
        const statusColumnCount = await manager.count(BoardColumn, {
          where: { status: { id: column.status.id } },
        });
        if (statusColumnCount > 1) {
          const isolatedStatus = await manager.save(
            TaskStatus,
            manager.create(TaskStatus, {
              code: `column_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
              name: column.name,
              color: column.color ?? undefined,
              position: column.position,
            }),
          );
          await manager
            .createQueryBuilder()
            .update(Task)
            .set({ status: isolatedStatus })
            .where('board_column_id = :columnId', { columnId: column.id })
            .execute();
          column.status = isolatedStatus;
        } else {
          column.status.name = column.name;
          column.status.color = column.color ?? undefined;
          await manager.save(TaskStatus, column.status);
        }
      }
      await manager.save(BoardColumn, column);
      await this.activityService.log(
        {
          actor,
          project,
          actionType: ActivityAction.BOARD_COLUMN_UPDATED,
          targetType: ActivityTargetType.BOARD_COLUMN,
          targetId: column.id,
          message: `${actor.fullName} da cap nhat column ${column.name}`,
          metadata: { boardId, columnId: column.id, columnName: column.name },
        },
        manager,
      );
    });

    return successResponse({
      message: 'Cap nhat column thanh cong',
      data: this.serializeColumn(column),
    });
  }

  async reorderColumns(
    projectId: string,
    boardId: string,
    dto: ReorderBoardColumnsDto,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const board = await this.findBoard(projectId, boardId);
    const columns = await this.boardColumnRepository.find({
      where: { board: { id: boardId } },
      relations: { status: true },
    });
    const existingIds = new Set(columns.map((column) => column.id));
    if (
      dto.columnIds.length !== columns.length ||
      dto.columnIds.some((id) => !existingIds.has(id))
    ) {
      throw AppErrors.common.validationMessages(['columnIds phai chua day du column cua board']);
    }

    const byId = new Map(columns.map((column) => [column.id, column]));
    dto.columnIds.forEach((id, position) => {
      const column = byId.get(id);
      if (column) column.position = position;
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.save(BoardColumn, columns);
      await this.activityService.log(
        {
          actor,
          project,
          actionType: ActivityAction.BOARD_COLUMN_REORDERED,
          targetType: ActivityTargetType.BOARD,
          targetId: board.id,
          message: `${actor.fullName} da sap xep lai column cua board ${board.name}`,
          metadata: { boardId, columnIds: dto.columnIds },
        },
        manager,
      );
    });

    return this.getBoard(projectId, boardId);
  }

  async deleteColumn(
    projectId: string,
    boardId: string,
    columnId: string,
    currentUser: AuthenticatedUser,
  ) {
    const project = await this.ensureProject(projectId);
    const actor = await this.ensureActor(currentUser.id);
    const column = await this.findColumn(projectId, boardId, columnId);
    const columnCount = await this.boardColumnRepository.count({
      where: { board: { id: boardId } },
    });
    if (columnCount <= 1) throw AppErrors.task.boardColumnMustRemain();
    const taskCount = await this.taskRepository
      .createQueryBuilder('task')
      .withDeleted()
      .where('task.board_column_id = :columnId', { columnId })
      .getCount();
    if (taskCount > 0) throw AppErrors.task.boardColumnNotEmpty();
    const deletedColumnId = column.id;
    const deletedStatusId = column.status.id;

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(BoardColumn, column);
      await this.removeOrphanStatuses(manager, [deletedStatusId]);
      await this.activityService.log(
        {
          actor,
          project,
          actionType: ActivityAction.BOARD_COLUMN_DELETED,
          targetType: ActivityTargetType.BOARD_COLUMN,
          targetId: deletedColumnId,
          message: `${actor.fullName} da xoa column ${column.name}`,
          metadata: { boardId, columnId: deletedColumnId, columnName: column.name },
        },
        manager,
      );
    });

    return successResponse({ message: 'Xoa column thanh cong', data: { id: deletedColumnId } });
  }

  private async createColumnEntities(
    manager: EntityManager,
    board: Board,
    input: { name: string; color: string | null; position: number; wipLimit: number | null },
  ) {
    const status = await manager.save(
      TaskStatus,
      manager.create(TaskStatus, {
        code: `column_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
        name: input.name,
        color: input.color ?? undefined,
        position: input.position,
      }),
    );
    return manager.save(BoardColumn, manager.create(BoardColumn, { board, status, ...input }));
  }

  private async removeOrphanStatuses(manager: EntityManager, statusIds: string[]) {
    for (const statusId of statusIds) {
      const columnCount = await manager.count(BoardColumn, { where: { status: { id: statusId } } });
      const taskCount = await manager
        .getRepository(Task)
        .createQueryBuilder('task')
        .withDeleted()
        .where('task.status_id = :statusId', { statusId })
        .getCount();
      if (columnCount === 0 && taskCount === 0) {
        await manager.delete(TaskStatus, statusId);
      }
    }
  }

  private async ensureProject(projectId: string) {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) throw AppErrors.project.projectNotFound();
    return project;
  }

  private async ensureActor(userId: string) {
    const actor = await this.userRepository.findOne({ where: { id: userId } });
    if (!actor) throw AppErrors.auth.userNotFound();
    return actor;
  }

  private async findBoard(projectId: string, boardId: string) {
    const board = await this.boardRepository.findOne({
      where: { id: boardId, project: { id: projectId } },
      relations: { project: true },
    });
    if (!board) throw AppErrors.task.boardNotFound();
    return board;
  }

  private async findColumn(projectId: string, boardId: string, columnId: string) {
    const column = await this.boardColumnRepository.findOne({
      where: { id: columnId, board: { id: boardId, project: { id: projectId } } },
      relations: { status: true, board: { project: true } },
    });
    if (!column) throw AppErrors.task.boardColumnNotFound();
    return column;
  }

  private async ensureColumnNameAvailable(boardId: string, name: string) {
    const duplicate = await this.boardColumnRepository
      .createQueryBuilder('column')
      .where('column.board_id = :boardId', { boardId })
      .andWhere('LOWER(column.name) = LOWER(:name)', { name })
      .getOne();
    if (duplicate) throw AppErrors.task.boardColumnAlreadyExists();
  }

  private serializeBoardSummary(board: Board) {
    return {
      id: board.id,
      name: board.name,
      position: board.position,
      isDefault: board.isDefault,
      columns: [...(board.columns ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((column) => this.serializeColumn(column)),
    };
  }

  private serializeColumn(column: BoardColumn) {
    return {
      id: column.id,
      name: column.name,
      color: column.color,
      position: column.position,
      wipLimit: column.wipLimit,
      statusId: column.status.id,
    };
  }

  private serializeTask(task: Task, column: BoardColumn) {
    return {
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      position: task.position,
      taskType: task.taskType ?? null,
      status: { ...task.status, name: column.name, color: column.color, position: column.position },
      priority: task.priority ?? null,
      parentTask: task.parentTask ?? null,
      reporter: task.reporter
        ? {
            id: task.reporter.id,
            email: task.reporter.email,
            username: task.reporter.username,
            fullName: task.reporter.fullName,
            avatarUrl: task.reporter.avatarUrl,
            isActive: task.reporter.isActive,
          }
        : null,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            username: task.assignee.username,
            fullName: task.assignee.fullName,
            avatarUrl: task.assignee.avatarUrl,
            isActive: task.assignee.isActive,
          }
        : null,
    };
  }
}
