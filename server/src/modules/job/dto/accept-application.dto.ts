import { IsEnum, IsNotEmpty } from 'class-validator';

export class AcceptApplicationDto {
  @IsEnum(['accepted', 'rejected'])
  @IsNotEmpty()
  action: 'accepted' | 'rejected';
}
