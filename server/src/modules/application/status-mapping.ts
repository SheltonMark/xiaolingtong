export const STATUS_DISPLAY_MAP: Record<string, {
  worker: string;
  enterprise: string;
  color: string;
  tone: string;
}> = {
  pending:   { worker: '待审核',   enterprise: '待审核',     color: 'amber',  tone: 'rose' },
  accepted:  { worker: '待出勤',   enterprise: '已录用',     color: 'blue',   tone: 'blue' },
  confirmed: { worker: '待开工',   enterprise: '已确认出勤', color: 'violet', tone: 'violet' },
  working:   { worker: '进行中',   enterprise: '进行中',     color: 'green',  tone: 'green' },
  done:      { worker: '已完成',   enterprise: '已完工',     color: 'gray',   tone: 'slate' },
  rejected:  { worker: '未通过',   enterprise: '已拒绝',     color: 'red',    tone: 'slate' },
  released:  { worker: '已释放',   enterprise: '已释放',     color: 'orange', tone: 'slate' },
  cancelled: { worker: '已取消',   enterprise: '已取消',     color: 'gray',   tone: 'slate' },
};

export function getWorkerStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.worker || status;
}

export function getEnterpriseStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.enterprise || status;
}

export function getEnterpriseStatusTone(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.tone || 'slate';
}

export function getStatusColor(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.color || 'gray';
}
