import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAnomalieDto } from '../dto/create-anomalie.dto';
import { UpdateAnomalieDto } from '../dto/update-anomalie.dto';

@Injectable()
export class AnomalieRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAnomalieDto) {
    return this.prisma.taskAnomaly.create({
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity ?? 'MEDIUM',
        photoUrls: dto.photoUrls ?? [],
        taskId: dto.taskId,
      },
      include: this.includeTaskContext(),
    });
  }

  findAll() {
    return this.prisma.taskAnomaly.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: this.includeTaskContext(),
    });
  }

  findByTask(taskId: number) {
    return this.prisma.taskAnomaly.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.includeTaskContext(),
    });
  }

  findOne(id: number) {
    return this.prisma.taskAnomaly.findUnique({
      where: {
        id,
      },
      include: this.includeTaskContext(),
    });
  }

  update(id: number, dto: UpdateAnomalieDto) {
    return this.prisma.taskAnomaly.update({
      where: {
        id,
      },
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        status: dto.status,
        photoUrls: dto.photoUrls,
      },
      include: this.includeTaskContext(),
    });
  }

  delete(id: number) {
    return this.prisma.taskAnomaly.delete({
      where: {
        id,
      },
    });
  }

  taskExists(taskId: number) {
    return this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
      },
    });
  }

  private includeTaskContext() {
    return {
      task: {
        select: {
          id: true,
          name: true,
          phase: {
            select: {
              id: true,
              name: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  projectManagerId: true,
                  siteManagerId: true,
                },
              },
            },
          },
        },
      },
    };
  }
}
