import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnomalieDto } from '../dto/create-anomalie.dto';
import { UpdateAnomalieDto } from '../dto/update-anomalie.dto';
import { AnomalieRepository } from '../repositories/anomalie.repository';
import { TaskAnomalyStatus } from '../types/anomalie.types';

@Injectable()
export class AnomalieService {
  constructor(private readonly anomalieRepository: AnomalieRepository) {}

  async create(dto: CreateAnomalieDto) {
    const task = await this.anomalieRepository.taskExists(dto.taskId);

    if (!task) {
      throw new NotFoundException('Tâche introuvable.');
    }

    return this.anomalieRepository.create({
      ...dto,
      photoUrls: dto.photoUrls ?? [],
    });
  }

  findAll() {
    return this.anomalieRepository.findAll();
  }

  findByTask(taskId: number) {
    return this.anomalieRepository.findByTask(taskId);
  }

  async findOne(id: number) {
    const anomalie = await this.anomalieRepository.findOne(id);

    if (!anomalie) {
      throw new NotFoundException('Anomalie introuvable.');
    }

    return anomalie;
  }

  async update(id: number, dto: UpdateAnomalieDto) {
    await this.findOne(id);
    return this.anomalieRepository.update(id, dto);
  }

  async delete(id: number) {
    await this.findOne(id);
    return this.anomalieRepository.delete(id);
  }

  async resolve(id: number) {
    await this.findOne(id);

    return this.anomalieRepository.update(id, {
      status: TaskAnomalyStatus.RESOLVED,
    });
  }

  async reopen(id: number) {
    await this.findOne(id);

    return this.anomalieRepository.update(id, {
      status: TaskAnomalyStatus.OPEN,
    });
  }
}
