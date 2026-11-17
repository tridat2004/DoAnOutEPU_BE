import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RequireProjectPermissions } from '../auth/decorators/project-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BoardService } from './board.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { ReorderBoardColumnsDto } from './dto/reorder-board-columns.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('projects/:projectId')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @RequireProjectPermissions('task.view')
  @Get('board')
  getDefaultBoard(@Param('projectId') projectId: string) {
    return this.boardService.getBoard(projectId);
  }

  @RequireProjectPermissions('task.view')
  @Get('boards')
  getBoards(@Param('projectId') projectId: string) {
    return this.boardService.getBoards(projectId);
  }

  @RequireProjectPermissions('task.view')
  @Get('boards/:boardId')
  getBoard(@Param('projectId') projectId: string, @Param('boardId') boardId: string) {
    return this.boardService.getBoard(projectId, boardId);
  }

  @RequireProjectPermissions('board.manage')
  @Post('boards')
  createBoard(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.createBoard(projectId, dto, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Patch('boards/:boardId')
  updateBoard(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.updateBoard(projectId, boardId, dto, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Delete('boards/:boardId')
  deleteBoard(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.deleteBoard(projectId, boardId, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Post('boards/:boardId/columns')
  createColumn(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: CreateBoardColumnDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.createColumn(projectId, boardId, dto, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Patch('boards/:boardId/columns/reorder')
  reorderColumns(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Body() dto: ReorderBoardColumnsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.reorderColumns(projectId, boardId, dto, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Patch('boards/:boardId/columns/:columnId')
  updateColumn(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateBoardColumnDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.updateColumn(projectId, boardId, columnId, dto, currentUser);
  }

  @RequireProjectPermissions('board.manage')
  @Delete('boards/:boardId/columns/:columnId')
  deleteColumn(
    @Param('projectId') projectId: string,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.boardService.deleteColumn(projectId, boardId, columnId, currentUser);
  }
}
