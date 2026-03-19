export class CreateRatingDto {
  jobId: number;
  ratedId: number;
  score: number;
  comment?: string;
  tags?: string[];
  isAnonymous?: boolean;
}
