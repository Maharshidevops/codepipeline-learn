// CommentModal (Phase 29) — the two positioned comment slots for one company row.
// Position 1 = Internal Note, Position 2 = External Talking Point. One comment per slot:
// saving over a filled slot is an UPDATE (the editor pre-fills with the existing text to make
// that obvious); saving empty text clears the slot (legacy semantic). Edit/delete are gated to
// the comment's author client-side (the server re-enforces). readOnly mode (Preview tab /
// legacy "comment viewing only") hides every editor control.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal/Modal';
import { commentsService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTimeShort } from '@/lib/datetime';
import type { Comment } from '@/types';
import './comment-modal.css';

const SLOTS: { position: 1 | 2; label: string; hint: string }[] = [
  {
    position: 1,
    label: 'Internal Note',
    hint: 'Visible to your team — research context, fit caveats.',
  },
  {
    position: 2,
    label: 'External Talking Point',
    hint: 'Outreach angle — safe to use with the company.',
  },
];

export interface CommentModalProps {
  resultId: string;
  /** The company row the modal is editing; null keeps the modal closed. */
  companyName: string | null;
  onClose: () => void;
  /** Preview tab / shared-result viewing: comments are visible but not editable. */
  readOnly?: boolean;
}

function CommentSlot({
  resultId,
  companyName,
  position,
  label,
  hint,
  comment,
  readOnly,
}: {
  resultId: string;
  companyName: string;
  position: 1 | 2;
  label: string;
  hint: string;
  comment: Comment | undefined;
  readOnly: boolean;
}) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  // Re-arm the editor whenever the slot's backing comment (or target company) changes.
  useEffect(() => {
    setEditing(false);
    setText(comment?.text ?? '');
  }, [comment?.id, comment?.text, companyName]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['comments', resultId] });

  const save = useMutation({
    mutationFn: (newText: string) =>
      commentsService.save({ resultId, companyName, position, text: newText }),
    onSuccess: () => {
      setEditing(false);
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => commentsService.remove(commentId),
    onSuccess: () => void invalidate(),
  });

  const isAuthor = !!comment && !!currentUser && comment.createdBy === currentUser.id;
  const showEditor = !readOnly && (editing || !comment);
  const busy = save.isPending || remove.isPending;

  return (
    <div className="comment-section">
      <span className="comment-slot-label">
        {label}
        <i className="bi bi-info-circle ms-2 text-secondary" title={hint} />
      </span>

      {comment && !editing && (
        <div className="comment-item">
          <div className="comment-header">
            <span className="comment-author">{comment.createdByName}</span>
            <span className="comment-timestamp">
              {formatDateTimeShort(comment.updatedAt)}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </span>
          </div>
          <div className="comment-text">{comment.text}</div>
          {!readOnly && isAuthor && (
            <div className="comment-actions">
              <button
                type="button"
                className="btn btn-standard btn-sm"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <i className="bi bi-pencil me-1" />
                Edit
              </button>
              <button
                type="button"
                className="btn btn-standard btn-sm"
                disabled={busy}
                onClick={() => remove.mutate(comment.id)}
              >
                <i className="bi bi-trash me-1" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {showEditor && (
        <div className="comment-editor-container">
          <textarea
            className="comment-textarea"
            rows={3}
            placeholder={hint}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="comment-btn-group">
            <button
              type="button"
              className="btn-comment-save"
              disabled={busy || (!comment && !text.trim())}
              onClick={() => save.mutate(text)}
            >
              {comment ? 'Update' : 'Save'}
            </button>
            {comment && (
              <button
                type="button"
                className="btn-comment-cancel"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setText(comment.text);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {readOnly && !comment && <div className="no-comments-message">No comment yet.</div>}
      {(save.isError || remove.isError) && (
        <div className="text-danger mt-2">Failed to save — please try again.</div>
      )}
    </div>
  );
}

export default function CommentModal({
  resultId,
  companyName,
  onClose,
  readOnly = false,
}: CommentModalProps) {
  const open = companyName !== null;

  const { data } = useQuery({
    queryKey: ['comments', resultId, 'company', companyName],
    queryFn: () => commentsService.getForCompany(resultId, companyName as string),
    enabled: open,
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Comments — ${companyName}`} size="md">
      {SLOTS.map(({ position, label, hint }) => (
        <CommentSlot
          key={position}
          resultId={resultId}
          companyName={companyName}
          position={position}
          label={label}
          hint={hint}
          comment={data?.comments.find((c) => c.position === position)}
          readOnly={readOnly}
        />
      ))}
    </Modal>
  );
}
