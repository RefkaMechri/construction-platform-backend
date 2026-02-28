export class CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  address?: string;
  slug?: string;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  status?: 'ACTIVE' | 'SUSPENDED';
}
