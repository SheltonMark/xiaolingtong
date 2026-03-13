import {
  STATUS_DISPLAY_MAP,
  getWorkerStatusDisplay,
  getEnterpriseStatusDisplay,
  getStatusColor
} from './status-mapping';

describe('Status Mapping', () => {
  describe('STATUS_DISPLAY_MAP constant', () => {
    it('should have all 8 status entries', () => {
      const statuses = Object.keys(STATUS_DISPLAY_MAP);
      expect(statuses).toHaveLength(8);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('accepted');
      expect(statuses).toContain('confirmed');
      expect(statuses).toContain('working');
      expect(statuses).toContain('done');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('released');
      expect(statuses).toContain('cancelled');
    });

    it('should have correct structure for each status', () => {
      Object.values(STATUS_DISPLAY_MAP).forEach(mapping => {
        expect(mapping).toHaveProperty('worker');
        expect(mapping).toHaveProperty('enterprise');
        expect(mapping).toHaveProperty('color');
        expect(typeof mapping.worker).toBe('string');
        expect(typeof mapping.enterprise).toBe('string');
        expect(typeof mapping.color).toBe('string');
      });
    });
  });

  describe('getWorkerStatusDisplay', () => {
    it('should return "待确认" for pending status', () => {
      expect(getWorkerStatusDisplay('pending')).toBe('待确认');
    });

    it('should return "待确认" for accepted status', () => {
      expect(getWorkerStatusDisplay('accepted')).toBe('待确认');
    });

    it('should return "已入选" for confirmed status', () => {
      expect(getWorkerStatusDisplay('confirmed')).toBe('已入选');
    });

    it('should return "进行中" for working status', () => {
      expect(getWorkerStatusDisplay('working')).toBe('进行中');
    });

    it('should return "已完成" for done status', () => {
      expect(getWorkerStatusDisplay('done')).toBe('已完成');
    });

    it('should return "已拒绝" for rejected status', () => {
      expect(getWorkerStatusDisplay('rejected')).toBe('已拒绝');
    });

    it('should return "已释放" for released status', () => {
      expect(getWorkerStatusDisplay('released')).toBe('已释放');
    });

    it('should return original status for unknown status', () => {
      expect(getWorkerStatusDisplay('unknown')).toBe('unknown');
    });
  });

  describe('getEnterpriseStatusDisplay', () => {
    it('should return "待审核" for pending status', () => {
      expect(getEnterpriseStatusDisplay('pending')).toBe('待审核');
    });

    it('should return "已接受" for accepted status', () => {
      expect(getEnterpriseStatusDisplay('accepted')).toBe('已接受');
    });

    it('should return "已确认" for confirmed status', () => {
      expect(getEnterpriseStatusDisplay('confirmed')).toBe('已确认');
    });

    it('should return "进行中" for working status', () => {
      expect(getEnterpriseStatusDisplay('working')).toBe('进行中');
    });

    it('should return "已完成" for done status', () => {
      expect(getEnterpriseStatusDisplay('done')).toBe('已完成');
    });

    it('should return "已拒绝" for rejected status', () => {
      expect(getEnterpriseStatusDisplay('rejected')).toBe('已拒绝');
    });

    it('should return "已释放" for released status', () => {
      expect(getEnterpriseStatusDisplay('released')).toBe('已释放');
    });

    it('should return original status for unknown status', () => {
      expect(getEnterpriseStatusDisplay('unknown')).toBe('unknown');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for all statuses', () => {
      expect(getStatusColor('pending')).toBe('amber');
      expect(getStatusColor('accepted')).toBe('green');
      expect(getStatusColor('confirmed')).toBe('green');
      expect(getStatusColor('working')).toBe('blue');
      expect(getStatusColor('done')).toBe('gray');
      expect(getStatusColor('rejected')).toBe('red');
      expect(getStatusColor('released')).toBe('orange');
      expect(getStatusColor('cancelled')).toBe('gray');
    });

    it('should return "gray" as default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('gray');
    });
  });
});
