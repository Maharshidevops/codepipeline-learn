// Custom AI column fill on a stored target/strategic list (Replit parity).
import { http } from '../http';
import { endpoints } from '../endpoints';

export interface CustomColumnStartResult {
  success?: boolean;
  label?: string;
  alreadyRunning?: boolean;
}

export interface CustomColumnStatus {
  found: boolean;
  label?: string;
  total?: number;
  done?: number;
  skipped?: number;
  failed?: number;
  running?: boolean;
  error?: string;
}

export interface CustomColumnService {
  start(input: {
    resultId: string;
    label: string;
    question: string;
  }): Promise<CustomColumnStartResult>;
  getStatus(resultId: string): Promise<CustomColumnStatus>;
}

export const customColumnService: CustomColumnService = {
  start: ({ resultId, label, question }) =>
    http<CustomColumnStartResult>(endpoints.customColumn.start, {
      method: 'POST',
      body: JSON.stringify({ resultId, label, question }),
    }),
  getStatus: (resultId) => http<CustomColumnStatus>(endpoints.customColumn.status(resultId)),
};
