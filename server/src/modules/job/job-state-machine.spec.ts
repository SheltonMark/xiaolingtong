import { JobStateMachine } from './job-state-machine';

describe('JobStateMachine', () => {
  it('should allow pending -> accepted', () => {
    expect(JobStateMachine.canTransition('pending', 'accepted')).toBe(true);
  });

  it('should allow pending -> rejected', () => {
    expect(JobStateMachine.canTransition('pending', 'rejected')).toBe(true);
  });

  it('should not allow pending -> working', () => {
    expect(JobStateMachine.canTransition('pending', 'working')).toBe(false);
  });

  it('should allow accepted -> confirmed', () => {
    expect(JobStateMachine.canTransition('accepted', 'confirmed')).toBe(true);
  });

  it('should not allow done -> any state', () => {
    expect(JobStateMachine.canTransition('done', 'pending')).toBe(false);
    expect(JobStateMachine.canTransition('done', 'working')).toBe(false);
  });

  it('should return next possible states', () => {
    expect(JobStateMachine.getNextState('pending')).toEqual([
      'accepted',
      'rejected',
      'cancelled',
    ]);
    expect(JobStateMachine.getNextState('confirmed')).toEqual([
      'working',
      'released',
      'cancelled',
    ]);
  });
});
