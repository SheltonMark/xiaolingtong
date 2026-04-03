export class JobStateMachine {
  // 定义合法的状态转移
  private static readonly TRANSITIONS = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['working', 'released', 'cancelled', 'done'],
    working: ['done', 'cancelled'],
    done: [],
    rejected: [],
    released: [],
    cancelled: [],
  };

  static canTransition(from: string, to: string): boolean {
    return this.TRANSITIONS[from]?.includes(to) ?? false;
  }

  static getNextState(current: string): string[] {
    return this.TRANSITIONS[current] ?? [];
  }
}
