import "./Input.css";

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  ...props
}) {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" />}
        <input className={`input ${error ? "input-error" : ""}`} {...props} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Textarea({ label, error, helperText, ...props }) {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <textarea
        className={`textarea ${error ? "input-error" : ""}`}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Select({ label, error, helperText, options, ...props }) {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <select
        className={`select ${error ? "input-error" : ""}`}
        {...props}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Checkbox({ label, error, ...props }) {
  return (
    <div className="checkbox-group">
      <label className="checkbox-label">
        <input type="checkbox" className="checkbox" {...props} />
        <span>{label}</span>
      </label>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
