// useToast — success/info/error + signup-success/logout helpers. Backed by ToastProvider.
import { useToastContext } from '@/components/feedback/toastContext';

export function useToast() {
  const { success, info, error, dismiss, signupSuccess, logoutConfirm } = useToastContext();
  return { success, info, error, dismiss, signupSuccess, logoutConfirm };
}
