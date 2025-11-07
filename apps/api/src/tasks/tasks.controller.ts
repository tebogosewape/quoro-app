/* eslint-disable indent */
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    @ApiResponse({ status: 201, description: 'Task created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() createDto: CreateTaskDto, @Request() req: { user: { userId: string } }) {
        const task = await this.tasksService.create(createDto, req.user.userId);
        return { success: true, data: task };
    }

    @Get()
    @ApiOperation({ summary: 'Get all tasks with optional filtering' })
    @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
    async findAll(
        @Query('clientId') clientId?: string,
        @Query('assignedToUserId') assignedToUserId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        const result = await this.tasksService.findAll({
            clientId,
            assignedToUserId,
            page,
            limit,
        });
        return { success: true, data: result };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get task by ID' })
    @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async findOne(@Param('id') id: string) {
        const task = await this.tasksService.findOne(id);
        return { success: true, data: task };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    @ApiResponse({ status: 200, description: 'Task updated successfully' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateTaskDto) {
        const task = await this.tasksService.update(id, updateDto);
        return { success: true, data: task };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a task' })
    @ApiResponse({ status: 200, description: 'Task deleted successfully' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    async remove(@Param('id') id: string) {
        await this.tasksService.remove(id);
        return { success: true, message: 'Task deleted successfully' };
    }
}
