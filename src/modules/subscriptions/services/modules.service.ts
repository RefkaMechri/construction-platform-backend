import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { ModulesRepository } from '../repositories/modules.repository';

@Injectable()
export class ModulesService {
  constructor(private readonly modulesRepository: ModulesRepository) {}

  private toResponse(module: any) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      id: module.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      name: module.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      description: module.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      icon: module.icon,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      category: module.category,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      isBaseModule: module.isBaseModule,
      availability: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        starter: module.starterEnabled,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        professional: module.professionalEnabled,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        enterprise: module.enterpriseEnabled,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      features: module.features ?? [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdAt: module.createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      updatedAt: module.updatedAt,
    };
  }

  async findAll() {
    const modules = await this.modulesRepository.findAll();
    return modules.map((item) => this.toResponse(item));
  }

  async findOne(id: number) {
    const module = await this.modulesRepository.findById(id);

    if (!module) {
      throw new NotFoundException('Module introuvable');
    }

    return this.toResponse(module);
  }

  async create(payload: CreateModuleDto) {
    const existing = await this.modulesRepository.findByName(payload.name);

    if (existing) {
      throw new ConflictException('Un module avec ce nom existe déjà');
    }

    const created = await this.modulesRepository.create(payload);
    return this.toResponse(created);
  }

  async update(id: number, payload: UpdateModuleDto) {
    const existing = await this.modulesRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Module introuvable');
    }

    if (payload.name && payload.name !== existing.name) {
      const duplicate = await this.modulesRepository.findByName(payload.name);
      if (duplicate) {
        throw new ConflictException('Un module avec ce nom existe déjà');
      }
    }

    const updated = await this.modulesRepository.update(id, payload);
    return this.toResponse(updated);
  }

  async remove(id: number) {
    const existing = await this.modulesRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Module introuvable');
    }

    await this.modulesRepository.delete(id);

    return {
      message: 'Module supprimé avec succès',
    };
  }
}
