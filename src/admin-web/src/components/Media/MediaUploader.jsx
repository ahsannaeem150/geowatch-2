import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, Image, Film } from 'lucide-react';

/**
 * MediaUploader — Drag-and-drop file uploader with per-file progress.
 *
 * Props:
 *   - onUpload: (file) => Promise<void> — called for each file
 *   - accept?: string — default: 'image/*,video/*'
 *   - maxFiles?: number — default: 10
 *   - disabled?: boolean
 */
export function MediaUploader({
  onUpload,
  accept = 'image/*,video/*',
  maxFiles = 10,
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      handleFiles(files);
    },
    [maxFiles]
  );

  const handleFileInput = useCallback(
    (e) => {
      const files = Array.from(e.target.files).slice(0, maxFiles);
      handleFiles(files);
      e.target.value = ''; // Reset so same file can be selected again
    },
    [maxFiles]
  );

  const handleFiles = async (files) => {
    if (files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((prev) => ({ ...prev, [file.name]: 'uploading' }));
      try {
        await onUpload(file);
        setProgress((prev) => ({ ...prev, [file.name]: 'done' }));
      } catch (err) {
        setProgress((prev) => ({ ...prev, [file.name]: 'error' }));
      }
    }
    setUploading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={16} className="media-upload-spinner" />;
      case 'done':
        return <CheckCircle size={16} className="media-upload-done" />;
      case 'error':
        return <XCircle size={16} className="media-upload-error" />;
      default:
        return null;
    }
  };

  const isImageFile = (name) => /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(name);
  const isVideoFile = (name) => /\.(mp4|webm|mov|avi|mkv)$/i.test(name);

  const getFileIcon = (name) => {
    if (isVideoFile(name)) return <Film size={14} className="media-file-icon" />;
    return <Image size={14} className="media-file-icon" />;
  };

  return (
    <div className="media-uploader">
      <div
        className={`media-dropzone ${isDragging ? 'dragging' : ''} ${disabled || uploading ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <div className="media-dropzone-icon">
          <Upload size={32} />
        </div>
        <p className="media-dropzone-text">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="media-dropzone-hint">
          Images (JPG, PNG, GIF, WebP) and videos (MP4, WebM) up to 50 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {Object.keys(progress).length > 0 && (
        <div className="media-upload-progress">
          {Object.entries(progress).map(([name, status]) => (
            <div
              key={name}
              className={`media-upload-item ${status}`}
            >
              <span className="media-upload-name">
                {getFileIcon(name)}
                {name}
              </span>
              <span className="media-upload-status">
                {getStatusIcon(status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
