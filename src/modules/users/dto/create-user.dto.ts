import { Role } from '../types/enums';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  tenantId?: number;
  status?: string;
}
