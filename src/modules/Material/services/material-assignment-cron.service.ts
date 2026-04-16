import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MaterialAssignmentCronService {
  private readonly logger = new Logger(MaterialAssignmentCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handleReservedMaterials() {
    const now = new Date();

    const assignments = await this.prisma.materialAssignment.findMany({
      where: {
        status: 'RESERVED',
        startDate: {
          lte: now,
        },
      },
    });

    if (assignments.length === 0) {
      return;
    }

    for (const assignment of assignments) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const material = await tx.material.findUnique({
            where: { id: assignment.materialId },
          });

          if (!material) {
            throw new Error(
              `Material ${assignment.materialId} not found for assignment ${assignment.id}`,
            );
          }

          if (material.quantity < assignment.quantity) {
            await tx.materialAssignment.update({
              where: { id: assignment.id },
              data: {
                status: 'WAITING_STOCK',
              },
            });

            return;
          }

          await tx.material.update({
            where: { id: assignment.materialId },
            data: {
              quantity: {
                decrement: assignment.quantity,
              },
              reservedQuantity: {
                decrement: assignment.quantity,
              },
            },
          });

          await tx.materialAssignment.update({
            where: { id: assignment.id },
            data: {
              status: 'CONSUMED',
            },
          });
        });

        this.logger.log(
          `Material assignment ${assignment.id} consumed successfully.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process material assignment ${assignment.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
