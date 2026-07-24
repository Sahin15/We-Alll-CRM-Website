import { useId } from 'react';
import { FaCamera, FaUpload } from 'react-icons/fa';
import { MAX_PHOTO_UPLOAD_MB } from '../../utils/constants';

/**
 * Mobile-friendly file picker.
 * Uses a full-area transparent input overlay so iOS/Android show camera + gallery reliably.
 *
 * @param {object} props
 * @param {string} [props.accept]
 * @param {boolean} [props.disabled]
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {boolean} [props.highlight]
 * @param {boolean} [props.photoOnly]
 * @param {(file: File) => void} props.onFileSelect
 */
export default function MobileFilePicker({
  accept,
  disabled = false,
  label = 'Upload photo or file',
  hint = `Camera, gallery, or files · max ${MAX_PHOTO_UPLOAD_MB}MB`,
  highlight = false,
  photoOnly = false,
  onFileSelect,
}) {
  const inputId = useId().replace(/:/g, '');
  const Icon = photoOnly ? FaCamera : FaUpload;
  const resolvedAccept = accept || (photoOnly ? 'image/*' : 'image/*,application/pdf');

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <label
      htmlFor={inputId}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '16px 12px',
        border: `2px dashed ${highlight ? '#F59E0B' : '#E5E7EB'}`,
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        textAlign: 'center',
        minHeight: '76px',
        boxSizing: 'border-box',
        background: highlight ? '#FFFBEB' : '#fff',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon size={18} color={highlight ? '#D97706' : '#10B981'} />
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151', lineHeight: 1.35, padding: '0 6px' }}>
        {label}
      </span>
      {hint ? (
        <span style={{ fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.35, padding: '0 8px' }}>
          {hint}
        </span>
      ) : null}
      <input
        id={inputId}
        type="file"
        accept={resolvedAccept}
        disabled={disabled}
        onChange={handleChange}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      />
    </label>
  );
}
