import "./Loader.css";

export function Loader({ size = "md", variant = "spinner" }) {
  if (variant === "skeleton") {
    return (
      <div className={`skeleton skeleton-${size}`}>
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" style={{ width: "80%" }} />
      </div>
    );
  }

  return <div className={`loader loader-${size}`} />;
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-content">
        <div className="loader loader-lg" />
        <p>Loading...</p>
      </div>
    </div>
  );
}
