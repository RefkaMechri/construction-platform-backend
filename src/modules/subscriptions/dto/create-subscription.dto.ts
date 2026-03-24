import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  period?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @IsString()
  @IsNotEmpty()
  usersLimit: string;

  @IsString()
  @IsNotEmpty()
  projectsLimit: string;

  @IsString()
  @IsNotEmpty()
  storageLimit: string;

  @IsString()
  @IsNotEmpty()
  supportType: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];
}
