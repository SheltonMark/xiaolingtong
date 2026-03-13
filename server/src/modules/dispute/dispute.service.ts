import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../entities/dispute.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { CreateDisputeDto, ResolveDisputeDto } from './dispute.dto';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Create a new dispute
   */
  async createDispute(
    complainantId: number,
    dto: CreateDisputeDto,
  ): Promise<Dispute> {
    // Validate job exists
    const job = await this.jobRepo.findOne({
      where: { id: dto.jobId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // Validate respondent exists
    const respondent = await this.userRepo.findOne({
      where: { id: dto.respondentId },
    });

    if (!respondent) {
      throw new BadRequestException('Respondent not found');
    }

    // Validate complainant is not disputing themselves
    if (complainantId === dto.respondentId) {
      throw new BadRequestException('Cannot dispute yourself');
    }

    // Create dispute
    const dispute = this.disputeRepo.create({
      jobId: dto.jobId,
      complainantId,
      respondentId: dto.respondentId,
      type: dto.type,
      description: dto.description,
      evidence: dto.evidence || [],
      status: 'open',
    });

    return this.disputeRepo.save(dispute);
  }

  /**
   * Get all disputes with pagination
   */
  async getDisputes(page: number = 1, pageSize: number = 10): Promise<Dispute[]> {
    const skip = (page - 1) * pageSize;

    return this.disputeRepo.find({
      skip,
      take: pageSize,
      order: {
        createdAt: 'DESC',
      },
      relations: ['job', 'complainant', 'respondent'],
    });
  }

  /**
   * Get dispute by ID
   */
  async getDisputeById(disputeId: number): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
      relations: ['job', 'complainant', 'respondent'],
    });

    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    return dispute;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: number,
    dto: ResolveDisputeDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    // Check if dispute is already resolved
    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      throw new BadRequestException('Dispute is already resolved or closed');
    }

    // Validate compensation amount if provided
    if (
      dto.compensationAmount !== undefined &&
      dto.compensationAmount < 0
    ) {
      throw new BadRequestException('Compensation amount cannot be negative');
    }

    // Update dispute
    dispute.status = 'resolved';
    dispute.resolution = dto.resolution;
    dispute.resolutionNotes = dto.resolutionNotes;
    dispute.compensationAmount = dto.compensationAmount || null;

    return this.disputeRepo.save(dispute);
  }

  /**
   * Get disputes by user (as complainant or respondent)
   */
  async getDisputesByUser(
    userId: number,
    role: 'complainant' | 'respondent',
  ): Promise<Dispute[]> {
    const where =
      role === 'complainant'
        ? { complainantId: userId }
        : { respondentId: userId };

    return this.disputeRepo.find({
      where,
      order: {
        createdAt: 'DESC',
      },
      relations: ['job', 'complainant', 'respondent'],
    });
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  }> {
    const disputes = await this.disputeRepo.find();

    return {
      total: disputes.length,
      open: disputes.filter(d => d.status === 'open').length,
      in_progress: disputes.filter(d => d.status === 'in_progress').length,
      resolved: disputes.filter(d => d.status === 'resolved').length,
      closed: disputes.filter(d => d.status === 'closed').length,
    };
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(
    disputeId: number,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
  ): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    dispute.status = status;
    return this.disputeRepo.save(dispute);
  }
}
