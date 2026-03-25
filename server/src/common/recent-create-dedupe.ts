import { MoreThan, Repository } from 'typeorm';

export const SHORT_SUBMIT_WINDOW_MS = 10 * 1000;

export async function findRecentDuplicate<Entity extends { createdAt?: Date }>(
  repo: Repository<Entity>,
  where: Record<string, any>,
  windowMs = SHORT_SUBMIT_WINDOW_MS,
): Promise<Entity | null> {
  return repo.findOne({
    where: {
      ...where,
      createdAt: MoreThan(new Date(Date.now() - windowMs)),
    } as any,
    order: { createdAt: 'DESC' } as any,
  });
}
