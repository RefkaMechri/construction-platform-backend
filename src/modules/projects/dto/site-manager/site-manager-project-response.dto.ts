import { ProjectStatus, ProjectType } from '@prisma/client';

export class SiteManagerProjectResponseDto {
  id!: number;
  name!: string;
  code!: string;
  client!: string;
  address!: string;
  startDate!: Date;
  endDate!: Date;
  budget!: string;
  description!: string | null;
  status!: ProjectStatus;
  type!: ProjectType;
  siteArea!: number | null;
  builtArea!: number | null;
  floorsCount!: number | null;
  projectManager!: {
    id: number;
    name: string | null;
    email: string;
  };
  tenant!: {
    id: number;
    name: string;
  };
  createdAt!: Date;
  updatedAt!: Date;
}
