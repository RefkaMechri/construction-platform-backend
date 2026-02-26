export class CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  status: 'ACTIVE' | 'SUSPENDED';
}
