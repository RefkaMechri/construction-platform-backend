import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialAssignmentDto } from './create-material-assignment.dto';

export class UpdateMaterialAssignmentDto extends PartialType(
  CreateMaterialAssignmentDto,
) {}
