// FileUpload — controlled file list. Renders a native file input + the #file-list markup from
// research-forms.css (📎 via .file-item-content:before, .file-item-name, .file-remove-btn).
// `listId` lets multiple instances coexist (CSS targets #file-list).
import { useRef } from 'react';
import './form-components.css';

export interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  listId?: string;
  inputId?: string;
}

export default function FileUpload({
  files,
  onChange,
  accept,
  multiple = false,
  listId = 'file-list',
  inputId = 'file-upload',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    onChange(multiple ? [...files, ...picked] : picked);
    // Allow re-selecting the same file after removal.
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="upload-section">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="form-control"
        accept={accept}
        multiple={multiple}
        onChange={handleSelect}
      />
      {files.length > 0 && (
        <ul id={listId} className="file-upload-list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`}>
              <span className="file-item-content">
                <span className="file-item-name">{file.name}</span>
              </span>
              <button
                type="button"
                className="file-remove-btn"
                aria-label={`Remove ${file.name}`}
                onClick={() => remove(i)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
