// useConfirm — returns a confirm(options) => Promise<boolean>. Replaces showConfirm + delete-form confirm.
import { useToastContext } from '@/components/feedback/toastContext';
import type { ConfirmOptions } from '@/components/feedback/ToastProvider';

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return useToastContext().confirm;
}
