import { Role } from '../types/enums';

export interface UpdateUserDto {
  name?: string;
  role?: Role;
  phone?: string;
  tenantId?: number;
  status?: string;
}
