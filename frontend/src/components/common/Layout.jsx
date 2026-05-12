import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import "./Layout.css";

export function ProtectedLayout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Navbar />
        <main className="layout-content">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthLayout({ children }) {
  return <div className="auth-layout">{children}</div>;
}
