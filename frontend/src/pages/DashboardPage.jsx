import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardTitle } from "../components/ui/Card";
import { api } from "../api/axios";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await api.get("/loans/dashboard_stats/");
        setStats(response.data);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Unable to load dashboard statistics right now."
        );
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <ProtectedLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.first_name}!</p>
        </div>

        {loading ? (
          <div className="center-screen">
            <p>Loading dashboard metrics…</p>
          </div>
        ) : error ? (
          <div className="center-screen">
            <p className="form-error">{error}</p>
          </div>
        ) : (
          // Role-based dashboard panels
          <>
              {user?.role === "borrower" ? (
                <DashboardShell main={<BorrowerPanel stats={stats} />} stats={stats} user={user} />
              ) : user?.role === "officer" ? (
                <DashboardShell main={<OfficerPanel stats={stats} />} stats={stats} user={user} />
              ) : user?.role === "admin" ? (
                // Admins should use the dedicated Admin page; link there
                <div className="center-screen">
                  <p>Redirect to admin console for management tools.</p>
                  <a href="/admin">Open admin panel</a>
                </div>
              ) : (
                <DashboardShell main={<DefaultPanel stats={stats} />} stats={stats} user={user} />
              )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}

  function DashboardShell({ main, stats }) {
    const [selected, setSelected] = useState('calendar');
    const [events, setEvents] = useState([]);

    const navItems = [
      { key: 'calendar', title: 'Calendar', subtitle: 'Deadlines', count: stats?.active_loans || 0 },
      { key: 'history', title: 'History', subtitle: 'Payments', count: stats?.paid_loans || 0 },
      { key: 'payments', title: 'Payments', subtitle: 'Make payment', count: 0 },
      { key: 'apply', title: 'Apply', subtitle: 'Request loan', count: 0 },
      { key: 'missing', title: 'Missing', subtitle: 'Overdues', count: stats?.overdue_loans || 0 },
    ];

    useEffect(() => {
      let mounted = true;
      async function loadEvents() {
        try {
          // Try to fetch loans to populate calendar events
          const res = await api.get('/loans/');
          if (!mounted) return;
          const loans = Array.isArray(res.data) ? res.data : res.data.results || [];
          const ev = loans
            .filter(l => l.maturity_date)
            .slice(0, 12)
            .map(l => ({ id: l.id, date: l.maturity_date, title: `Loan #${l.id}`, subtitle: l.status, remaining: l.remaining_balance }));
          setEvents(ev);
        } catch (e) {
          setEvents([]);
        }
      }
      loadEvents();
      return () => { mounted = false; };
    }, [stats]);

    return (
      <div className="dashboard-grid">
        <div className="dashboard-main">{React.cloneElement(main, { activeNav: selected, onNavChange: setSelected, events })}</div>
        <aside className="dashboard-side">
          <div className="side-nav">
            <h4>Navigation</h4>
            {navItems.map((item) => (
              <div key={item.key} className={`side-nav-item ${selected === item.key ? 'active' : ''}`} onClick={() => setSelected(item.key)} style={{ cursor: 'pointer' }}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="side-nav-sub">{item.subtitle}</div>
                </div>
                <div className="side-nav-count">{item.count}</div>
              </div>
            ))}
          </div>

          <div className="side-calendar">
            <h4>Calendar</h4>
            {events.length ? (
              <div className="calendar-list">
                {events.map(ev => (
                  <div key={ev.id} className="calendar-item">
                    <div className="calendar-date">{ev.date}</div>
                    <div className="calendar-info">
                      <div className="calendar-title">{ev.title}</div>
                      <div className="calendar-sub">{ev.subtitle} · {ev.remaining ? `₱${Number(ev.remaining).toLocaleString()}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="calendar-placeholder">No deadlines found.</div>
            )}
          </div>
        </aside>
      </div>
    );
  }

function BorrowerPanel({ stats, activeNav, onNavChange, events }) {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loanToPay, setLoanToPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('wallet');
  const [receipt, setReceipt] = useState(null);
  const [applicationReceipt, setApplicationReceipt] = useState(null);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState('micro');
  const [principal, setPrincipal] = useState('');

  const loanTypes = [
    { id: 'micro', label: 'Microloan (Short term)', interest_rate: 6, payment_term: 'monthly' },
    { id: 'business', label: 'Business loan (Medium)', interest_rate: 9, payment_term: 'monthly' },
    { id: 'agri', label: 'Agriculture (Seasonal)', interest_rate: 5, payment_term: 'biweekly' },
  ];

  useEffect(() => {
    let mounted = true;
    async function loadLoans() {
      setLoadingLoans(true);
      try {
        const res = await api.get('/loans/?borrower_email=' + encodeURIComponent(user?.email || ''));
        // If endpoint doesn't support borrower_email, fallback to /loans/
        if (mounted) setLoans(res.data);
      } catch (e) {
        try {
          const res = await api.get('/loans/');
          if (mounted) setLoans(res.data.filter(l => l.borrower_name && l.borrower_name.toLowerCase().includes((user?.first_name || '').toLowerCase())));
        } catch (err) {
          console.error('load loans failed', err);
        }
      } finally {
        if (mounted) setLoadingLoans(false);
      }
    }
    if (user) loadLoans();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!activeNav) return;
    if (activeNav === 'apply') {
      setShowApply(true);
      setLoanTab('apply');
    } else if (activeNav === 'payments') {
      setShowApply(false);
      setLoanTab('overview');
      if (loans.length) setLoanToPay(loans[0]);
    } else if (activeNav === 'history' || activeNav === 'calendar') {
      setShowApply(false);
      setLoanTab('schedule');
    }
  }, [activeNav]);

  const handlePay = async () => {
    if (!loanToPay || !payAmount) return alert('Select loan and enter amount');
    const numericAmount = Number(payAmount);
    const remaining = Number(loanToPay.remaining_balance || 0);
    if (numericAmount > remaining) {
      const ok = window.confirm('Entered amount exceeds remaining balance. Proceed and create overpayment?');
      if (!ok) return;
    }
    try {
      const payload = {
        loan: loanToPay.id,
        amount_paid: payAmount,
        payment_date: new Date().toISOString().slice(0,10),
        notes: `Paid via ${payMethod}`,
      };
      const res = await api.post('/payments/', payload);
      setReceipt(res.data);
      // Refresh loans
      const r2 = await api.get('/loans/?borrower_email=' + encodeURIComponent(user?.email || ''));
      setLoans(r2.data);
      setPayAmount('');
      alert('Payment recorded — receipt shown below');
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || 'Payment failed';
      alert(msg);
    }
  };

  const handleApply = async () => {
    if (!principal) return alert('Enter requested amount');
    setApplying(true);
    try {
      const type = loanTypes.find(t => t.id === selectedLoanType) || loanTypes[0];
      const start = new Date().toISOString().slice(0,10);
      // simple 30-day maturity for demo
      const maturity = new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);
      const payload = {
        borrower_email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        principal_amount: principal,
        interest_rate: type.interest_rate,
        payment_term: type.payment_term,
        start_date: start,
        maturity_date: maturity,
        notes: `Applied via web: ${type.label}`,
      };
      const res = await api.post('/loans/apply/', payload);
      setApplicationReceipt(res.data);
      alert('Application submitted');
      setShowApply(false);
      // refresh loans
      const r2 = await api.get('/loans/?borrower_email=' + encodeURIComponent(user?.email || ''));
      setLoans(r2.data);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || 'Apply failed';
      alert(msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div className="stats-grid">
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Outstanding balance</p>
              <h3 className="stat-value">{stats ? `₱${Number((stats.total_disbursed || 0) - (stats.total_collected || 0)).toLocaleString()}` : '—'}</h3>
            </div>
          </CardBody>
        </Card>
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <p className="stat-label">Active loans</p>
              <h3 className="stat-value">{stats?.active_loans ?? '—'}</h3>
            </div>
          </CardBody>
        </Card>
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <p className="stat-label">Paid loans</p>
              <h3 className="stat-value">{stats?.paid_loans ?? '—'}</h3>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="dashboard-grid">
        <div>
          <Card className="dashboard-card">
            <CardTitle>Repayment schedule</CardTitle>
            <CardBody>
              {loadingLoans ? (
                <p>Loading loans…</p>
              ) : loans.length ? (
                loans.map((loan) => (
                  <div key={loan.id} className="activity-item">
                    <div className="activity-content">
                      <p className="activity-title">Loan #{loan.id} · {loan.status}</p>
                      <p className="activity-time">Remaining {loan.remaining_balance ? `₱${Number(loan.remaining_balance).toLocaleString()}` : '—'} · Due {loan.maturity_date}</p>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:8}}>
                      <button className="btn-primary" onClick={() => setLoanToPay(loan)}>Pay</button>
                      <button className="btn-ghost" onClick={() => { setShowApply(true); }}>Request new loan</button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No loans found. Apply for a loan below.</p>
              )}
            </CardBody>
          </Card>

          <Card className="dashboard-card">
            <CardTitle>Make a payment</CardTitle>
            <CardBody>
              <div className="quick-stats">
                <label>Loan</label>
                <select value={loanToPay?.id || ''} onChange={(e) => setLoanToPay(loans.find(l=>String(l.id)===e.target.value)||null)}>
                  <option value="">Select loan</option>
                  {loans.map(l => <option key={l.id} value={l.id}>{`#${l.id} · ${l.status} · ₱${Number(l.remaining_balance||0).toLocaleString()}`}</option>)}
                </select>

                <label>Amount</label>
                <input value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} placeholder="0.00" />

                <label>Payment method</label>
                <select value={payMethod} onChange={(e)=>setPayMethod(e.target.value)}>
                  <option value="wallet">Wallet (internal)</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank transfer</option>
                </select>

                <div style={{display:'flex', gap:8}}>
                  <button className="btn-primary" onClick={handlePay}>Submit payment</button>
                  <button className="btn-ghost" onClick={()=>{ setReceipt(null); setPayAmount(''); setLoanToPay(null); }}>Reset</button>
                </div>
              </div>
            </CardBody>
          </Card>

          {receipt && (
            <Card className="dashboard-card">
              <CardTitle>Payment receipt</CardTitle>
              <CardBody>
                <p>Payment ID: {receipt.id}</p>
                <p>Loan: #{receipt.loan}</p>
                <p>Amount: ₱{Number(receipt.amount_paid).toLocaleString()}</p>
                <p>Date: {receipt.payment_date}</p>
                <p>Remaining balance: ₱{Number(receipt.remaining_balance).toLocaleString()}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <Card className="dashboard-card">
            <CardTitle>Apply for a loan</CardTitle>
            <CardBody>
              {showApply ? (
                <div className="quick-stats">
                  <label>Loan type</label>
                  <select value={selectedLoanType} onChange={(e)=>setSelectedLoanType(e.target.value)}>
                    {loanTypes.map(t=> <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <label>Requested amount</label>
                  <input value={principal} onChange={(e)=>setPrincipal(e.target.value)} placeholder="0.00" />
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn-primary" onClick={handleApply} disabled={applying}>{applying ? 'Submitting...' : 'Submit application'}</button>
                    <button className="btn-ghost" onClick={()=>setShowApply(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>Choose a loan product and request funds. Applications are reviewed by officers.</p>
                  <button className="btn-primary" onClick={()=>setShowApply(true)}>Request loan</button>
                </div>
              )}
            </CardBody>
          </Card>

          {applicationReceipt && (
            <Card className="dashboard-card">
              <CardTitle>Application receipt</CardTitle>
              <CardBody>
                <p>Loan id: {applicationReceipt.id}</p>
                <p>Requested: ₱{Number(applicationReceipt.principal_amount).toLocaleString()}</p>
                <p>Status: {applicationReceipt.status || 'submitted'}</p>
                <p>Applied: {applicationReceipt.start_date}</p>
              </CardBody>
            </Card>
          )}

          <Card className="dashboard-card">
            <CardTitle>Help & support</CardTitle>
            <CardBody>
              <p>If you need assistance with payments, contact support.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function OfficerPanel({ stats }) {
  return (
    <>
      <div className="stats-grid">
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <p className="stat-label">Active loans</p>
              <h3 className="stat-value">{stats?.active_loans ?? '—'}</h3>
            </div>
          </CardBody>
        </Card>
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <p className="stat-label">Overdue</p>
              <h3 className="stat-value">{stats?.overdue_loans ?? '—'}</h3>
            </div>
          </CardBody>
        </Card>
        <Card className="stat-card">
          <CardBody className="stat-card-body">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <p className="stat-label">Disbursed</p>
              <h3 className="stat-value">{stats ? `₱${Number(stats.total_disbursed || 0).toLocaleString()}` : '—'}</h3>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-card">
          <CardTitle className="pipeline-title">Loan review pipeline</CardTitle>
          <CardBody className="pipeline-body">
            <p>Pending applications and approvals will appear here for review.</p>
          </CardBody>
        </Card>

        <Card className="dashboard-card">
          <CardTitle>Quick actions</CardTitle>
          <CardBody>
            <p>Approve borrowers, follow up on overdue accounts, and review documents.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function DefaultPanel({ stats }) {
  return (
    <>
      <div className="stats-grid">
        {STATS.map((stat, index) => {
          const value =
            stats && index === 0
              ? stats.total_loans
              : stats && index === 1
              ? `₱${Number(stats.total_disbursed || 0).toLocaleString()}`
              : stats && index === 2
              ? stats.paid_loans
              : stats && index === 3
              ? stats.active_loans
              : stat.value;

          return (
            <Card key={stat.id} className="stat-card">
              <CardBody className="stat-card-body">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <p className="stat-label">{stat.label}</p>
                  <h3 className="stat-value">{value}</h3>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-card">
          <CardTitle>Recent Activity</CardTitle>
          <CardBody>
            <div className="activity-list">
              {ACTIVITIES.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p className="activity-title">{activity.title}</p>
                    <p className="activity-time">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="dashboard-card">
          <CardTitle>Quick Stats</CardTitle>
          <CardBody>
            <div className="quick-stats">
              {QUICK_STATS.map((s) => (
                <div key={s.id} className="quick-stat">
                  <span className="quick-stat-label">{s.label}</span>
                  <span className="quick-stat-value">{s.value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

const STATS = [
  { id: 1, icon: "📊", label: "Total Loans", value: "12" },
  { id: 2, icon: "💵", label: "Active Balance", value: "₱50,000" },
  { id: 3, icon: "✓", label: "Paid Loans", value: "5" },
  { id: 4, icon: "⏰", label: "Overdue", value: "0" },
];

const ACTIVITIES = [
  { id: 1, icon: "✓", title: "Payment received", time: "2 hours ago" },
  { id: 2, icon: "📝", title: "Loan application submitted", time: "1 day ago" },
  { id: 3, icon: "✓", title: "Loan approved", time: "3 days ago" },
  { id: 4, icon: "💰", title: "Payment due in 5 days", time: "1 week ago" },
];

const QUICK_STATS = [
  { id: 1, label: "Interest Rate", value: "8.5%" },
  { id: 2, label: "Total Paid", value: "₱25,500" },
  { id: 3, label: "Remaining", value: "₱24,500" },
];
