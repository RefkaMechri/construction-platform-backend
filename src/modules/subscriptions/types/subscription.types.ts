export type SubscriptionIcon = 'box' | 'crown';

export type SubscriptionResponse = {
  id: number;
  name: string;
  price: number;
  period: string;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  icon: SubscriptionIcon | string;
  isPopular: boolean;
  limits: {
    users: string;
    projects: string;
    storage: string;
    support: string;
  };
  features: string[];
  createdAt: Date;
  updatedAt: Date;
};
