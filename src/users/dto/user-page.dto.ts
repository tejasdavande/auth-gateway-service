import { UserResponseDto } from './user-response.dto';

export class UserPageDto {
  items: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
}
