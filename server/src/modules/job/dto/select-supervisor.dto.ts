import { IsNumber, IsNotEmpty, IsPositive } from 'class-validator';

/**
 * 选择主管的请求 DTO
 */
export class SelectSupervisorDto {
  /**
   * 工人 ID
   */
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  workerId: number;
}
