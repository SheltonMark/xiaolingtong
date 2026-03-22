import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRatingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  ratedId?: number;

  // Backward compatibility for the old Mini Program payload.
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  enterpriseId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;

  // Backward compatibility for the old Mini Program payload.
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }) => Array.isArray(value) ? value.map((item) => String(item)) : [])
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  isAnonymous?: boolean;
}
