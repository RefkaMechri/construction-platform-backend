import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipementAssignmentDto } from './create-equipement-assignment.dto';

export class UpdateEquipementAssignmentDto extends PartialType(
  CreateEquipementAssignmentDto,
) {}
