import { Role } from '../../common/role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  role: Role;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.role = user.role;
    return dto;
  }
}
