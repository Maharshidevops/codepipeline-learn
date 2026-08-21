// Row outreach draft modal — preview template, edit subject/body, confirm Reply-To,
// then send via Amazon SMTP (From = Quralyst SES identity).
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import { resultsService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { normalizeApiError } from '@/lib/normalizeApiError';
import './email-draft-modal.css';

export interface EmailDraftTarget {
  companyName: string;
  recipientEmail: string;
}

export interface EmailDraftModalProps {
  resultId: string;
  target: EmailDraftTarget | null;
  onClose: () => void;
}

export default function EmailDraftModal({ resultId, target, onClose }: EmailDraftModalProps) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const open = !!target;

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [warning, setWarning] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setConfirmed(false);
    setSubject('');
    setBody('');
    setFromEmail('');
    setReplyToEmail(currentUser?.email ?? '');
    setWarning('');

    const companyName = target.companyName;
    const recipientEmail = target.recipientEmail;

    void resultsService
      .sendRowEmail(resultId, {
        companyName,
        recipientEmail,
        previewOnly: true,
      })
      .then((data) => {
        if (cancelled) return;
        setSubject(data.subject ?? '');
        setBody(data.bodyPlain ?? '');
        setFromEmail(data.fromEmail || '');
        setReplyToEmail(data.replyToEmail || data.senderEmail || currentUser?.email || '');
        setWarning(data.warning ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(normalizeApiError(err) || 'Failed to prepare email draft.');
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview fetch once per open target
  }, [target?.companyName, target?.recipientEmail, resultId, currentUser?.email]);

  const sendEmail = async () => {
    if (!target || !replyToEmail || !confirmed) return;
    setSending(true);
    try {
      const data = await resultsService.sendRowEmail(resultId, {
        companyName: target.companyName,
        recipientEmail: target.recipientEmail,
        customSubject: subject,
        customBodyPlain: body,
        confirmSenderEmail: replyToEmail,
      });
      if (data.mode === 'smtp_direct' || data.sent) {
        toast.success(data.message || 'Email sent.');
        onClose();
      } else {
        toast.error('Unexpected send response. Please try again.');
      }
    } catch (err: unknown) {
      toast.error(normalizeApiError(err) || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Review Email Draft" size="lg">
      {loading ? (
        <p className="text-muted mb-0">Preparing draft…</p>
      ) : (
        <>
          <div className="alert alert-info email-draft-warning" role="alert">
            {warning ||
              `This email is sent by Quralyst. Replies go to ${replyToEmail || 'your work email'}.`}
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold mb-1" htmlFor="email-draft-from">
              From
            </label>
            <input
              id="email-draft-from"
              type="text"
              className="form-control"
              value={fromEmail ? `Quralyst <${fromEmail}>` : 'Quralyst (configured sender)'}
              readOnly
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold mb-1" htmlFor="email-draft-reply-to">
              Reply-To (your work email)
            </label>
            <input
              id="email-draft-reply-to"
              type="text"
              className="form-control"
              value={replyToEmail}
              readOnly
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold mb-1" htmlFor="email-draft-to">
              To
            </label>
            <input
              id="email-draft-to"
              type="text"
              className="form-control"
              value={target?.recipientEmail ?? ''}
              readOnly
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold mb-1" htmlFor="email-draft-subject">
              Subject
            </label>
            <input
              id="email-draft-subject"
              type="text"
              className="form-control"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold mb-1" htmlFor="email-draft-body">
              Message
            </label>
            <textarea
              id="email-draft-body"
              className="form-control email-draft-body"
              rows={12}
              maxLength={20000}
              spellCheck
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="form-text text-muted small mt-1">
              Sent via Amazon SMTP. When the recipient replies, it goes to your Reply-To address.
            </div>
          </div>

          <div className="form-check mb-3">
            <input
              id="email-draft-confirm"
              className="form-check-input"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="email-draft-confirm">
              I confirm replies should go to <strong>{replyToEmail || 'my work email'}</strong>.
            </label>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-standard"
              onClick={() => void sendEmail()}
              disabled={!confirmed || sending || !replyToEmail}
            >
              {sending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
