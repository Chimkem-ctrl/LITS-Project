import "./Button.css";

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  loading = false,
  icon: Icon,
  fullWidth = false,
  className = "",
  ...props
}) {
  const classes = `btn btn-${variant} btn-${size} ${
    fullWidth ? "btn-full-width" : ""
  } ${className}`.trim();

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {Icon && <Icon className="btn-icon" />}
      {children}
    </button>
  );
}
