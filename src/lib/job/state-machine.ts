/**
 * Job 状态机：显式允许转换，替代散落 boolean
 */

import type { JobStatus } from './types';

const ALLOWED: Record<JobStatus, readonly JobStatus[]> = {
  idle: ['preparing', 'idle'],
  preparing: ['running', 'failed', 'idle'],
  running: ['paused', 'completed', 'failed', 'idle'],
  paused: ['running', 'idle', 'preparing'],
  completed: ['idle', 'preparing'],
  failed: ['running', 'idle', 'preparing'],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** 尝试转换；非法时返回 false（不抛错，避免打断 UI） */
export function tryTransition(from: JobStatus, to: JobStatus): boolean {
  return canTransition(from, to);
}
