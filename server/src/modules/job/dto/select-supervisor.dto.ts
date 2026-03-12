import { IsNumber, IsNotEmpty } from 'class-validator';

export class SelectSupervisorDto {
  @IsNumber()
  @IsNotEmpty()
  workerId: number;
}
