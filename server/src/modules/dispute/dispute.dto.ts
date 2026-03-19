export class CreateDisputeDto {
  jobId: number;
  respondentId: number;
  type: 'payment' | 'quality' | 'behavior' | 'other';
  description: string;
  evidence?: string[];
}

export class ResolveDisputeDto {
  resolution: 'complainant_win' | 'respondent_win' | 'settlement';
  resolutionNotes: string;
  compensationAmount?: number;
}
