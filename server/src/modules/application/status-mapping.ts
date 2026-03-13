export const STATUS_DISPLAY_MAP = {
  pending: { worker: '待确认', enterprise: '待审核', color: 'amber' },
  accepted: { worker: '待确认', enterprise: '已接受', color: 'green' },
  confirmed: { worker: '已入选', enterprise: '已确认', color: 'green' },
  working: { worker: '进行中', enterprise: '进行中', color: 'blue' },
  done: { worker: '已完成', enterprise: '已完成', color: 'gray' },
  rejected: { worker: '已拒绝', enterprise: '已拒绝', color: 'red' },
  released: { worker: '已释放', enterprise: '已释放', color: 'orange' },
  cancelled: { worker: '已取消', enterprise: '已取消', color: 'gray' },
};

export function getWorkerStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.worker || status;
}

export function getEnterpriseStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.enterprise || status;
}

export function getStatusColor(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.color || 'gray';
}
