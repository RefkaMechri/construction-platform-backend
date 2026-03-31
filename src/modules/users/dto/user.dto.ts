import { Role, UserStatus } from '../types/enums';

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  phone: string | null;
  tenantId: number | null;
  createdAt: string;
}
