import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserPageDto } from './dto/user-page.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<UserPageDto> {
    const [users, total] = await this.userService.list(query.page, query.limit);
    return {
      items: users.map((user) => UserResponseDto.fromEntity(user)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
