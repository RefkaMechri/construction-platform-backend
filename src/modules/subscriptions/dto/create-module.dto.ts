import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isBaseModule?: boolean;

  @IsBoolean()
  @IsOptional()
  starterEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  professionalEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  enterpriseEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  features: string[];
}
