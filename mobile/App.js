import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import axios, { setAuthHeader, setBaseURL } from './src/api/axios';
import FeatureCard from './src/components/FeatureCard';

const FEATURES = [
  { id: 1, icon: '💰', title: 'Loan Management', description: 'Track loans with clean status updates and simple controls.' },
  { id: 2, icon: '📊', title: 'Analytics', description: 'Monitor payments and borrower performance in one view.' },
  { id: 3, icon: '👥', title: 'Borrower Profiles', description: 'Keep borrower details clear and easy to access.' },
  { id: 4, icon: '🔒', title: 'Secure Access', description: 'Role control with secure authentication flows.' },
];

const SUMMARY_METRICS = [
  { id: 1, label: 'Active', value: '0', note: 'loans' },
  { id: 2, label: 'Disbursed', value: '₱0', note: 'principal' },
  { id: 3, label: 'Collected', value: '₱0', note: 'to date' },
];

const DEFAULT_PROFILE = {
  name: 'LITS User',
  email: 'user@lits.app',
  role: 'Loan Officer',
  status: 'Active',
  phone: '+63 912 345 6789',
  totalDisbursed: '₱124,000',
  borrowers: '12 active',
  memberSince: 'January 2024',
};

const formatDate = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildRepaymentHistory = (payments) => {
  if (!payments || payments.length === 0) return [];
  const historyMap = payments.reduce((acc, payment) => {
    const date = new Date(payment.payment_date);
    if (Number.isNaN(date.getTime())) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleString('en-PH', { month: 'short', year: 'numeric' });
    if (!acc[key]) acc[key] = { month: monthLabel, amount: 0 };
    acc[key].amount += Number(payment.amount_paid);
    return acc;
  }, {});

  const sorted = Object.keys(historyMap)
    .sort()
    .map((key) => ({ key, ...historyMap[key] }))
    .slice(-5);

  const maxAmount = Math.max(...sorted.map((item) => item.amount), 1);
  return sorted.map((item) => ({
    ...item,
    percent: Math.max(18, Math.round((item.amount / maxAmount) * 100)),
  }));
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value;
  }
  return `₱${number.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
};

const borrowerStages = ['Applied', 'Under Review', 'Approved', 'Disbursed'];

const getBorrowerStage = (activeLoans, paidLoans, overdueLoans) => {
  if (activeLoans.length > 0) return 3;
  if (paidLoans.length > 0) return 2;
  if (overdueLoans.length > 0) return 2;
  return 1;
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('calendar');
  const [activeLoans, setActiveLoans] = useState([]);
  const [paidLoans, setPaidLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [repaymentHistory, setRepaymentHistory] = useState([]);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanTerm, setLoanTerm] = useState('monthly');
  const [loanTab, setLoanTab] = useState('overview');
  const [signingUp, setSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const handleLoanApplication = () => {
    if (!loanAmount || !loanPurpose) {
      Alert.alert('Missing details', 'Please enter loan amount and purpose before applying.');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const start = new Date().toISOString().slice(0,10);
        const maturity = new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);
        await axios.post('/api/v1/loans/apply/', {
          borrower_email: profile?.email,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          principal_amount: loanAmount,
          interest_rate: 8,
          payment_term: loanTerm,
          start_date: start,
          maturity_date: maturity,
          notes: loanPurpose,
        });
        Alert.alert('Request submitted', 'Your loan application was sent for review.');
        setLoanAmount('');
        setLoanPurpose('');
        setLoanTerm('monthly');
        setLoanTab('overview');
        await loadProfileAndDashboard();
      } catch (e) {
        console.log('loan apply error', e);
        const msg = e.response?.data?.detail || e.message || 'Unable to apply for loan.';
        Alert.alert('Application failed', msg);
      } finally {
        setLoading(false);
      }
    })();
  };
  const [overrideHost, setOverrideHost] = useState('');

  const loadProfileAndDashboard = async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes, activeLoansRes, paidLoansRes, overdueLoansRes, paymentsRes] = await Promise.all([
        axios.get('/api/v1/users/me/'),
        axios.get('/api/v1/loans/dashboard_stats/'),
        axios.get('/api/v1/loans/?status=active'),
        axios.get('/api/v1/loans/?status=paid'),
        axios.get('/api/v1/loans/?status=overdue'),
        axios.get('/api/v1/payments/'),
      ]);
      setProfile(profileRes.data);
      setDashboardData(statsRes.data);
      setActiveLoans(activeLoansRes.data);
      setPaidLoans(paidLoansRes.data);
      setOverdueLoans(overdueLoansRes.data);
      setPayments(paymentsRes.data);
      setRepaymentHistory(buildRepaymentHistory(paymentsRes.data));
    } catch (e) {
      console.log('loadProfileAndDashboard error', e);
      const message = e.response?.data?.detail || e.message || 'Unable to fetch dashboard data.';
      const networkHint = !e.response ? '\nHint: verify backend is running and the app can reach the host (emulator vs device).' : '';
      Alert.alert('Error', message + networkHint);
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    if (!accessToken) {
      Alert.alert('Not signed in', 'Please sign in to load dashboard data.');
      return;
    }
    await loadProfileAndDashboard();
  };

  const callApi = async () => {
    if (!accessToken) {
      Alert.alert('Sign in required', 'Please sign in before pinging the backend.');
      return;
    }
    try {
      await axios.get('/api/v1/loans/dashboard_stats/');
      Alert.alert('Backend OK', 'Dashboard API is reachable.');
    } catch (e) {
      console.log('callApi error', e);
      const message = e.response?.data?.detail || e.message || 'Unable to reach backend.';
      const networkHint = !e.response ? '\nHint: check base URL in mobile/src/api/axios.js and your device network.' : '';
      Alert.alert('Error', message + networkHint);
    }
  };

  const handleMakePayment = async () => {
    if (!paymentLoanId || !paymentAmount) {
      Alert.alert('Missing details', 'Select a loan and enter an amount.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        loan: paymentLoanId,
        amount_paid: paymentAmount,
        payment_date: new Date().toISOString().slice(0,10),
        notes: `Paid via ${paymentMethod}`,
      };
      const res = await axios.post('/api/v1/payments/', payload);
      setPaymentReceipt(res.data);
      await loadProfileAndDashboard();
      Alert.alert('Payment recorded', 'Your payment was recorded and a receipt is available below.');
      setPaymentAmount('');
      setPaymentLoanId(null);
    } catch (e) {
      console.log('payment error', e);
      const msg = e.response?.data?.detail || e.message || 'Payment failed.';
      Alert.alert('Payment failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBaseURL = () => {
    if (!overrideHost) {
      Alert.alert('Missing host', 'Enter a full URL like http://192.168.1.42:8000');
      return;
    }
    try {
      setBaseURL(overrideHost);
      Alert.alert('Base URL set', `Requests will use: ${overrideHost}`);
    } catch (e) {
      console.log('setBaseURL error', e);
      Alert.alert('Error', 'Unable to set base URL.');
    }
  };

  const debugRequest = async () => {
    try {
      const res = await axios.get('/api/v1/');
      Alert.alert('Debug OK', JSON.stringify(res.data).slice(0, 300));
    } catch (e) {
      console.log('debugRequest error', e);
      const details = {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        config: { baseURL: axios.defaults.baseURL },
      };
      Alert.alert('Debug error', JSON.stringify(details, null, 2).slice(0, 800));
    }
  };

  const handleSignup = async () => {
    if (signingUp) {
      return; // Prevent duplicate submissions
    }

    if (!name || !email || !password) {
      Alert.alert('Missing details', 'Please fill in all fields to continue.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters long.');
      return;
    }

    if (/^\d+$/.test(password)) {
      Alert.alert('Invalid password', 'Password cannot be only numbers.');
      return;
    }

    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 1) {
      Alert.alert('Invalid name', 'Please enter at least a first name.');
      return;
    }

    const first_name = nameParts[0];
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

    // Check if password is too similar to name or email
    const passwordLower = password.toLowerCase();
    const emailLower = email.toLowerCase();
    const nameLower = name.toLowerCase();
    const firstNameLower = first_name.toLowerCase();
    const lastNameLower = last_name.toLowerCase();

    if (
      passwordLower.includes(emailLower.split('@')[0]) ||
      emailLower.split('@')[0].includes(passwordLower) ||
      passwordLower.includes(firstNameLower) ||
      firstNameLower.includes(passwordLower) ||
      passwordLower.includes(lastNameLower) ||
      lastNameLower.includes(passwordLower)
    ) {
      Alert.alert(
        'Password too similar',
        'Your password is too similar to your name or email. Please choose a different password with a mix of letters and numbers.'
      );
      return;
    }

    setSigningUp(true);

    try {
      await axios.post('/api/v1/auth/users/', {
        email,
        first_name,
        last_name,
        password,
        re_password: password,
      });

      // Clear form first
      setName('');
      setEmail('');
      setPassword('');
      setSigningUp(false);

      // Then navigate and show success
      Alert.alert(
        'Account created',
        'Your account was created successfully. Please sign in with your email and password.',
        [{ text: 'OK', onPress: () => setScreen('login') }]
      );
    } catch (e) {
      setSigningUp(false);
      console.log('signup error', e);
      const backendError = e.response?.data;

      let message = '';
      if (backendError?.password) {
        if (Array.isArray(backendError.password)) {
          message = backendError.password[0];
        } else {
          message = backendError.password;
        }
      } else if (backendError?.email) {
        message = Array.isArray(backendError.email) ? backendError.email[0] : backendError.email;
      } else if (backendError?.last_name) {
        message = Array.isArray(backendError.last_name) ? backendError.last_name[0] : backendError.last_name;
      } else if (backendError?.first_name) {
        message = Array.isArray(backendError.first_name) ? backendError.first_name[0] : backendError.first_name;
      } else if (backendError?.detail) {
        message = backendError.detail;
      } else if (backendError?.non_field_errors) {
        message = Array.isArray(backendError.non_field_errors) ? backendError.non_field_errors[0] : backendError.non_field_errors;
      } else if (backendError) {
        message = JSON.stringify(backendError);
      } else {
        message = e.message;
      }

      const networkHint = !e.response ? '\nHint: backend unreachable — check server and base URL.' : '';
      Alert.alert('Signup failed', message + networkHint);
    }
  };

  const handleSignin = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Please enter email and password.');
      return;
    }

    try {
      const response = await axios.post('/api/v1/auth/jwt/create/', {
        email,
        password,
      });

      const token = response.data.access;
      setAccessToken(token);
      setAuthHeader(token);
      await loadProfileAndDashboard();
      setScreen('dashboard');
      setEmail('');
      setPassword('');
      Alert.alert('Signed in', `Welcome back, ${email}! Your dashboard is ready.`);
    } catch (e) {
      console.log('signin error', e);
      const message = e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || e.message || 'Unable to sign in.';
      const networkHint = !e.response ? '\nHint: Network error — ensure the backend host is reachable from the device/emulator.' : '';
      Alert.alert('Signin failed', message + networkHint);
    }
  };

  const renderHome = () => (
    <>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Loan tracking</Text>
        </View>
        <Text style={styles.wordmark}>LITS</Text>
        <Text style={styles.subtitle}>Calm finance management for smarter lending decisions.</Text>
        <View style={styles.btnCol}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('login')}>
            <Text style={styles.btnPrimaryText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('signup')}>
            <Text style={styles.btnGhostText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <Text style={styles.sectionLabel}>Core features</Text>
      {FEATURES.map((f) => (
        <FeatureCard key={f.id} icon={f.icon} title={f.title} description={f.description} />
      ))}

      {/* Backend ping */}
      <View style={styles.pingCard}>
        <Text style={styles.pingTitle}>Backend health</Text>
        <Text style={styles.pingDesc}>Confirm your API is reachable after signing in.</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={callApi}>
          <Text style={styles.btnPrimaryText}>Check backend</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#7a8b76', marginBottom: 6 }}>Override backend URL (optional)</Text>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="http://192.168.1.42:8000"
            placeholderTextColor="#304030"
            value={overrideHost}
            onChangeText={setOverrideHost}
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSetBaseURL}>
              <Text style={styles.btnPrimaryText}>Set base URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnGhost, { flex: 1 }]} onPress={debugRequest}>
              <Text style={styles.btnGhostText}>Debug network</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );

  const renderAuthForm = (type) => (
    <>
      <TouchableOpacity style={styles.backRow} onPress={() => setScreen('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          {type === 'signup' ? 'Create account' : 'Welcome back'}
        </Text>
        <Text style={styles.formSub}>
          {type === 'signup' ? 'Start managing loans today.' : 'Sign in to your LITS account.'}
        </Text>

        {type === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Smith"
              placeholderTextColor="#304030"
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#304030"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#304030"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {type === 'signup' && (
            <Text style={styles.helperText}>
              Use at least 8 characters and avoid passwords that are too similar to your name or email.
            </Text>
          )}
        </View>

        {type === 'login' && (
          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btnPrimary, { marginTop: 4, opacity: signingUp && type === 'signup' ? 0.5 : 1 }]}
          onPress={type === 'signup' ? handleSignup : handleSignin}
          disabled={signingUp && type === 'signup'}
        >
          <Text style={styles.btnPrimaryText}>
            {type === 'signup' && signingUp ? 'Creating account...' : (type === 'signup' ? 'Sign up' : 'Sign in')}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {type === 'signup' ? 'Already have an account? ' : 'No account? '}
          </Text>
          <TouchableOpacity onPress={() => setScreen(type === 'signup' ? 'login' : 'signup')}>
            <Text style={styles.switchLink}>
              {type === 'signup' ? 'Sign in' : 'Sign up'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderDashboard = () => {
    const displayName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile?.email || 'LITS User';

    const summaryMetrics = [
      {
        id: 1,
        label: 'Active',
        value: dashboardData?.active_loans?.toString() || '--',
        note: 'loans',
      },
      {
        id: 2,
        label: 'Disbursed',
        value: dashboardData ? formatCurrency(dashboardData.total_disbursed) : '--',
        note: 'principal',
      },
      {
        id: 3,
        label: 'Collected',
        value: dashboardData ? formatCurrency(dashboardData.total_collected) : '--',
        note: 'to date',
      },
    ];

    const deadlineItems = activeLoans
      .slice()
      .sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date))
      .slice(0, 5);

    const historyItems = payments
      .slice()
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .slice(0, 5);

    const missingItems = overdueLoans.slice(0, 5);

    const navItems = [
      {
        key: 'calendar',
        title: 'Calendar',
        subtitle: 'Deadlines',
        count: activeLoans.length,
      },
      {
        key: 'history',
        title: 'History',
        subtitle: 'Payments',
        count: payments.length,
      },
      {
        key: 'missing',
        title: 'Missing',
        subtitle: 'Overdues',
        count: overdueLoans.length,
      },
    ];

    return (
      <>
        <View style={styles.dashboardTopRow}>
          <View>
            <Text style={styles.dashboardGreeting}>Hello, {displayName} 👋</Text>
            <Text style={styles.dashboardLabel}>Loan performance snapshot</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => setScreen('profile')}>
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dashboardAmount}>{dashboardData ? formatCurrency(dashboardData.total_disbursed) : 'Loading...'}</Text>
        <Text style={styles.dashboardSmall}>Total principal disbursed</Text>

        <View style={styles.metricRow}>
          {summaryMetrics.map((metric, index) => (
            <View key={metric.id} style={[styles.metricCard, index < summaryMetrics.length - 1 && styles.metricCardMargin]}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricNote}>{metric.note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.collectionCard}>
          <View style={styles.collectionHeader}>
            <Text style={styles.collectionTitle}>Loan repayment history</Text>
            <Text style={styles.collectionNote}>Based on payments stored in the backend.</Text>
          </View>
          <View style={styles.collectionGraph}>
            {repaymentHistory.map((point, index) => (
              <View
                key={point.key}
                style={[
                  styles.collectionGraphBar,
                  {
                    left: `${index * 20 + 8}%`,
                    height: `${point.percent}%`,
                  },
                ]}
              />
            ))}
            {repaymentHistory.length > 0 && (
              <View style={[styles.collectionDot, { left: `${(repaymentHistory.length - 1) * 20 + 8}%` }]} />
            )}
          </View>
          <View style={styles.collectionFooter}>
            <Text style={styles.collectionAmount}>{dashboardData ? formatCurrency(dashboardData.total_collected) : '--'}</Text>
            <Text style={styles.collectionStatus}>{repaymentHistory.length ? `${repaymentHistory[repaymentHistory.length - 1].month} trend` : 'No payments yet'}</Text>
          </View>
        </View>

        <View style={styles.dashboardLayout}>
          <View style={styles.dashboardMain}>
            <View style={styles.tabRow}>
              {['calendar', 'history', 'missing'].map((tab) => {
                const label = tab === 'calendar' ? 'Calendar' : tab === 'history' ? 'History' : 'Missing';
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, dashboardTab === tab && styles.tabButtonActive]}
                    onPress={() => setDashboardTab(tab)}
                  >
                    <Text style={[styles.tabButtonText, dashboardTab === tab && styles.tabButtonTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.tabContentCard}>
              {dashboardTab === 'calendar' && (
                <>
                  <Text style={styles.cardSectionTitle}>Upcoming deadlines</Text>
                  {deadlineItems.length ? deadlineItems.map((item) => (
                    <View key={item.id} style={styles.deadlineItem}>
                      <View style={styles.deadlineDate}>
                        <Text style={styles.deadlineDateText}>{formatDate(item.maturity_date)}</Text>
                      </View>
                      <View style={styles.deadlineInfo}>
                        <Text style={styles.deadlineName}>{item.borrower_name}</Text>
                        <Text style={styles.deadlineSub}>{formatCurrency(item.remaining_balance)} · {item.status}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.cardText}>No upcoming deadlines found.</Text>}
                </>
              )}
              {dashboardTab === 'history' && (
                <>
                  <Text style={styles.cardSectionTitle}>Payment history</Text>
                  {historyItems.length ? historyItems.map((item) => (
                    <View key={item.id} style={styles.historyItem}>
                      <View>
                        <Text style={styles.historyName}>{item.loan_borrower_name || `Loan #${item.loan}`}</Text>
                        <Text style={styles.historySub}>{formatDate(item.payment_date)} · {formatCurrency(item.amount_paid)}</Text>
                      </View>
                      <Text style={styles.historyStatus}>Recorded</Text>
                    </View>
                  )) : <Text style={styles.cardText}>No payment records available.</Text>}
                </>
              )}
              {dashboardTab === 'missing' && (
                <>
                  <Text style={styles.cardSectionTitle}>Overdue loans</Text>
                  {missingItems.length ? missingItems.map((item) => (
                    <View key={item.id} style={styles.missingItem}>
                      <View>
                        <Text style={styles.historyName}>{item.borrower_name}</Text>
                        <Text style={styles.historySub}>{formatDate(item.maturity_date)} · {formatCurrency(item.remaining_balance)}</Text>
                      </View>
                      <Text style={styles.missingStatus}>Overdue</Text>
                    </View>
                  )) : <Text style={styles.cardText}>No overdue loans at the moment.</Text>}
                </>
              )}
            </View>
          </View>

          <View style={styles.dashboardNav}>
            <Text style={styles.navTitle}>Navigation</Text>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, dashboardTab === item.key && styles.navItemActive]}
                onPress={() => setDashboardTab(item.key)}
              >
                <Text style={[styles.navLabel, dashboardTab === item.key && styles.navLabelActive]}>{item.title}</Text>
                <Text style={styles.navCount}>{item.count}</Text>
                <Text style={styles.navSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.pingCard}>
          <Text style={styles.pingTitle}>Ready to continue</Text>
          <Text style={styles.pingDesc}>Refresh your dashboard or sign out to return to the landing page.</Text>
          <View style={styles.dashboardActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={refreshDashboard}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => {
              setScreen('home');
              setProfile(null);
              setDashboardData(null);
              setAccessToken(null);
              setAuthHeader(null);
            }}>
              <Text style={styles.btnGhostText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  const renderBorrowerDashboard = () => {
    const displayName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile?.email || 'Borrower';

    const stageIndex = getBorrowerStage(activeLoans, paidLoans, overdueLoans);
    const outstandingValue = dashboardData
      ? Number(dashboardData.total_disbursed || 0) - Number(dashboardData.total_collected || 0)
      : 0;
    const outstandingBalance = formatCurrency(outstandingValue);

    const nextLoan = activeLoans
      .slice()
      .sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date))[0];
    const nextDueAmount = nextLoan ? formatCurrency(nextLoan.remaining_balance) : '--';
    const nextDueDate = nextLoan ? formatDate(nextLoan.maturity_date) : '--';

    return (
      <>
        <View style={styles.dashboardTopRow}>
          <View>
            <Text style={styles.dashboardGreeting}>Hello, {displayName} 👋</Text>
            <Text style={styles.dashboardLabel}>Your loan status and repayment details</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => setScreen('profile')}>
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.borrowerSummaryRow}>
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryPanelLabel}>Outstanding balance</Text>
            <Text style={styles.summaryPanelValue}>{outstandingBalance}</Text>
          </View>
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryPanelLabel}>Next payment</Text>
            <Text style={styles.summaryPanelValue}>{nextDueAmount}</Text>
            <Text style={styles.summaryPanelNote}>{nextDueDate}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Loan status tracker</Text>
          <View style={styles.trackerRow}>
            {borrowerStages.map((stage, index) => (
              <View key={stage} style={styles.trackerItem}>
                <View style={[styles.trackerStep, index <= stageIndex && styles.trackerStepActive]}>
                  <Text style={[styles.trackerStepText, index <= stageIndex && styles.trackerStepTextActive]}>{index + 1}</Text>
                </View>
                <Text style={styles.trackerLabel}>{stage}</Text>
                {index < borrowerStages.length - 1 && <View style={[styles.trackerLine, index < stageIndex && styles.trackerLineActive]} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tabRow}>
          {['overview', 'schedule', 'apply'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, loanTab === tab && styles.tabButtonActive]}
              onPress={() => setLoanTab(tab)}
            >
              <Text style={[styles.tabButtonText, loanTab === tab && styles.tabButtonTextActive]}>
                {tab === 'overview' ? 'Overview' : tab === 'schedule' ? 'Schedule' : 'Apply'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContentCard}>
          {loanTab === 'overview' && (
            <>
              <Text style={styles.cardSectionTitle}>Upcoming payment snapshot</Text>
              <Text style={styles.cardText}>
                You have {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'}. View due dates, payment amounts, and support options below.
              </Text>
              <View style={styles.infoCard}>
                <Text style={styles.cardSectionTitle}>Latest activity</Text>
                <Text style={styles.cardText}>{payments.length ? `Recent payment of ${formatCurrency(payments[0].amount_paid)} on ${formatDate(payments[0].payment_date)}.` : 'No recent payments recorded.'}</Text>
              </View>
              <View style={[styles.infoCard, { marginTop: 12 }] }>
                <Text style={styles.cardSectionTitle}>Quick payment</Text>
                <Text style={styles.cardText}>Make a payment toward an active loan.</Text>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Select loan</Text>
                  <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                    {activeLoans.length ? activeLoans.map(l => (
                      <TouchableOpacity key={l.id} onPress={() => setPaymentLoanId(l.id)} style={{ paddingVertical: 6 }}>
                        <Text style={{ color: paymentLoanId === l.id ? '#48b464' : '#c0d0bc' }}>{`Loan #${l.id} · ${formatCurrency(l.remaining_balance)}`}</Text>
                      </TouchableOpacity>
                    )) : <Text style={styles.cardText}>No active loans</Text>}
                  </View>

                  <Text style={styles.inputLabel}>Amount</Text>
                  <TextInput style={styles.input} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" placeholder="0.00" />
                  <Text style={styles.inputLabel}>Method</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {['wallet','gcash','bank'].map(m => (
                      <TouchableOpacity key={m} onPress={() => setPaymentMethod(m)} style={[styles.btnGhost, { paddingVertical: 8, paddingHorizontal: 12, marginRight: 6, borderRadius: 8, borderColor: paymentMethod===m ? '#48b464' : 'rgba(255,255,255,0.06)'}]}>
                        <Text style={{ color: paymentMethod===m ? '#48b464' : '#c0d0bc' }}>{m.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleMakePayment}>
                    <Text style={styles.btnPrimaryText}>Submit payment</Text>
                  </TouchableOpacity>
                </View>
                {paymentReceipt && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.cardSectionTitle}>Receipt</Text>
                    <Text style={styles.cardText}>ID: {paymentReceipt.id} • Loan #{paymentReceipt.loan}</Text>
                    <Text style={styles.cardText}>Amount: {formatCurrency(paymentReceipt.amount_paid)}</Text>
                    <Text style={styles.cardText}>Remaining: {formatCurrency(paymentReceipt.remaining_balance)}</Text>
                  </View>
                )}
              </View>
            </>
          )}
          {loanTab === 'schedule' && (
            <>
              <Text style={styles.cardSectionTitle}>Repayment schedule</Text>
              {payments.length ? payments.slice(0, 5).map((payment) => (
                <View key={payment.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyName}>{payment.loan_borrower_name || `Loan #${payment.loan}`}</Text>
                    <Text style={styles.historySub}>{formatDate(payment.payment_date)} · {formatCurrency(payment.amount_paid)}</Text>
                  </View>
                  <Text style={styles.historyStatus}>{payment.remaining_balance ? `Balance ${formatCurrency(payment.remaining_balance)}` : 'Paid'}</Text>
                </View>
              )) : <Text style={styles.cardText}>No repayment schedule is available yet.</Text>}
            </>
          )}
          {loanTab === 'apply' && (
            <>
              <Text style={styles.cardSectionTitle}>Apply for a new loan</Text>
              <View style={styles.loanFormField}>
                <Text style={styles.inputLabel}>Requested amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₱0"
                  placeholderTextColor="#304030"
                  keyboardType="numeric"
                  value={loanAmount}
                  onChangeText={setLoanAmount}
                />
              </View>
              <View style={styles.loanFormField}>
                <Text style={styles.inputLabel}>Purpose</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Business, education, etc."
                  placeholderTextColor="#304030"
                  value={loanPurpose}
                  onChangeText={setLoanPurpose}
                />
              </View>
              <View style={styles.loanFormField}>
                <Text style={styles.inputLabel}>Repayment term</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Monthly"
                  placeholderTextColor="#304030"
                  value={loanTerm}
                  onChangeText={setLoanTerm}
                />
              </View>
              <Text style={styles.helperText}>Upload your ID and income documents after submitting your request.</Text>
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={handleLoanApplication}>
                <Text style={styles.btnPrimaryText}>Submit application</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.pingCard}>
          <Text style={styles.pingTitle}>Need help?</Text>
          <Text style={styles.pingDesc}>Reach out to support for due date questions, payment help, or loan restructuring.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert('Support', 'Open the help center or chat support from the next release.') }>
            <Text style={styles.btnPrimaryText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

    const renderOfficerDashboard = () => {
      const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : profile?.email || 'Officer';
      const activeCount = activeLoans.length;
      const overdueCount = overdueLoans.length;
      const recentPayments = payments.slice(0, 3);
      const loanSnapshot = activeLoans.slice(0, 4);

      return (
        <>
          <View style={styles.dashboardTopRow}>
            <View>
              <Text style={styles.dashboardGreeting}>Hello, {displayName}</Text>
              <Text style={styles.dashboardLabel}>Lending officer console</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => setScreen('profile')}>
              <Text style={styles.profileButtonText}>👤</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active loans</Text>
              <Text style={styles.metricValue}>{activeCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Overdue</Text>
              <Text style={styles.metricValue}>{overdueCount}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Disbursed</Text>
              <Text style={styles.metricValue}>{dashboardData ? formatCurrency(dashboardData.total_disbursed) : '--'}</Text>
            </View>
          </View>

          <View style={styles.collectionCard}>
            <View style={styles.collectionHeader}>
              <Text style={styles.collectionTitle}>Loan review pipeline</Text>
              <Text style={styles.collectionNote}>Monitor approvals and borrower progress.</Text>
            </View>
            {loanSnapshot.length ? loanSnapshot.map((loan) => (
              <View key={loan.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyName}>{loan.borrower_name || `Loan #${loan.id}`}</Text>
                  <Text style={styles.historySub}>{formatCurrency(loan.remaining_balance)} · {loan.status}</Text>
                </View>
                <Text style={styles.historyStatus}>{formatDate(loan.maturity_date)}</Text>
              </View>
            )) : <Text style={styles.cardText}>No active loans in your queue.</Text>}
          </View>

          <View style={styles.dashboardLayout}>
            <View style={styles.dashboardMain}>
              <View style={styles.recentCard}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Recent payments</Text>
                </View>
                {recentPayments.length ? recentPayments.map((payment) => (
                  <View key={payment.id} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyName}>{payment.loan_borrower_name || `Loan #${payment.loan}`}</Text>
                      <Text style={styles.historySub}>{formatDate(payment.payment_date)} · {formatCurrency(payment.amount_paid)}</Text>
                    </View>
                    <Text style={styles.historyStatus}>Recorded</Text>
                  </View>
                )) : <Text style={styles.cardText}>No recent payment activity.</Text>}
              </View>
              <View style={styles.recentCard}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Alerts</Text>
                </View>
                <Text style={styles.cardText}>Review overdue loans and borrower requests from the queue.</Text>
              </View>
            </View>
            <View style={styles.dashboardNav}>
              <Text style={styles.navTitle}>Quick actions</Text>
              <View style={styles.navItem}>
                <Text style={styles.navLabel}>Approve borrowers</Text>
                <Text style={styles.navSubtitle}>Check pending loan requests.</Text>
              </View>
              <View style={styles.navItem}>
                <Text style={styles.navLabel}>Portfolio checks</Text>
                <Text style={styles.navSubtitle}>Review risk and overdue patterns.</Text>
              </View>
              <View style={styles.navItem}>
                <Text style={styles.navLabel}>Borrower outreach</Text>
                <Text style={styles.navSubtitle}>Follow up on documents and payments.</Text>
              </View>
            </View>
          </View>
        </>
      );
    };

  const renderAdminDashboard = () => {
    const displayName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile?.email || 'Admin';
    const totalOutstanding = dashboardData
      ? Number(dashboardData.total_disbursed || 0) - Number(dashboardData.total_collected || 0)
      : 0;
    const collectionRate = dashboardData && dashboardData.total_disbursed
      ? `${Math.round((Number(dashboardData.total_collected || 0) / Number(dashboardData.total_disbursed)) * 100)}%`
      : '--';

    return (
      <>
        <View style={styles.dashboardTopRow}>
          <View>
            <Text style={styles.dashboardGreeting}>Hello, {displayName}</Text>
            <Text style={styles.dashboardLabel}>Platform command center</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => setScreen('profile')}>
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Disbursed</Text>
            <Text style={styles.metricValue}>{dashboardData ? formatCurrency(dashboardData.total_disbursed) : '--'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Collected</Text>
            <Text style={styles.metricValue}>{dashboardData ? formatCurrency(dashboardData.total_collected) : '--'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Outstanding</Text>
            <Text style={styles.metricValue}>{formatCurrency(totalOutstanding)}</Text>
          </View>
        </View>

        <View style={styles.collectionCard}>
          <Text style={styles.collectionTitle}>Platform health</Text>
          <Text style={styles.collectionNote}>Portfolio at Risk and collection momentum.</Text>
          <View style={[styles.infoRow, { marginTop: 16 }]}> 
            <Text style={styles.metricLabel}>PAR</Text>
            <Text style={styles.metricValue}>{overdueLoans.length ? `${Math.round((overdueLoans.length / Math.max(activeLoans.length + overdueLoans.length, 1)) * 100)}%` : '0%'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.metricLabel}>Collection</Text>
            <Text style={styles.metricValue}>{collectionRate}</Text>
          </View>
        </View>

        <View style={styles.dashboardLayout}>
          <View style={styles.dashboardMain}>
            <View style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>User directory</Text>
                <Text style={styles.recentLink}>View all</Text>
              </View>
              <Text style={styles.cardText}>Manage borrowers, officers, and admins from the web console.</Text>
            </View>
            <View style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Audit trail</Text>
              </View>
              <Text style={styles.cardText}>Track approvals, user changes, and system events in one secure timeline.</Text>
            </View>
          </View>
          <View style={styles.dashboardNav}>
            <Text style={styles.navTitle}>Admin actions</Text>
            <View style={styles.navItem}>
              <Text style={styles.navLabel}>Product builder</Text>
              <Text style={styles.navSubtitle}>Configure loan products and fees.</Text>
            </View>
            <View style={styles.navItem}>
              <Text style={styles.navLabel}>RBAC control</Text>
              <Text style={styles.navSubtitle}>Manage roles, permissions, and access.</Text>
            </View>
            <View style={styles.navItem}>
              <Text style={styles.navLabel}>Payment settings</Text>
              <Text style={styles.navSubtitle}>Update gateway integration and triggers.</Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderProfile = () => {
    const fullName = profile?.first_name ? `${profile.first_name} ${profile.last_name}`.trim() : profile?.email || 'LITS User';
    const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

    return (
      <>
        <TouchableOpacity style={styles.backRow} onPress={() => setScreen('dashboard')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.profileHeaderCard}>
          <View style={styles.profileAvatarCircle}>
            <Text style={styles.avatarText}>{fullName.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'LU'}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{profile?.email || 'user@lits.app'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{statusLabel}</Text>
            </View>
            <View style={styles.profileBadgeSecondary}>
              <Text style={styles.profileBadgeText}>{profile?.role || 'Loan Officer'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || 'user@lits.app'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Disbursed</Text>
            <Text style={styles.infoValue}>{dashboardData ? formatCurrency(dashboardData.total_disbursed) : '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total borrowers</Text>
            <Text style={styles.infoValue}>{dashboardData?.total_borrowers?.toString() || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{profile?.date_joined ? profile.date_joined.split('T')[0] : '—'}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.btnPrimary, styles.signOutButton]} onPress={() => {
          setScreen('home');
          setProfile(null);
          setDashboardData(null);
          setAccessToken(null);
          setAuthHeader(null);
        }}>
          <Text style={styles.btnPrimaryText}>Sign out</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {screen === 'home' && renderHome()}
        {screen === 'signup' && renderAuthForm('signup')}
        {screen === 'login' && renderAuthForm('login')}
        {screen === 'dashboard' && (
          profile?.role === 'borrower'
            ? renderBorrowerDashboard()
            : profile?.role === 'officer'
            ? renderOfficerDashboard()
            : profile?.role === 'admin'
            ? renderAdminDashboard()
            : renderDashboard()
        )}
        {screen === 'profile' && renderProfile()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#080e0b',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero
  hero: {
    marginBottom: 28,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(72, 180, 100, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(72, 180, 100, 0.25)',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#48b464',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#48b464',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  wordmark: {
    fontSize: 52,
    fontWeight: '800',
    color: '#f0f5ec',
    letterSpacing: -2,
    lineHeight: 52,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#4e6050',
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 260,
  },
  btnCol: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#48b464',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnGhost: {
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnGhostText: {
    color: '#c0d0bc',
    fontSize: 15,
    fontWeight: '500',
  },

  // Features
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3a4e3a',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Ping card
  pingCard: {
    marginTop: 8,
    backgroundColor: '#0f1a14',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 18,
  },
  pingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e0eadc',
    marginBottom: 4,
  },
  pingDesc: {
    fontSize: 13,
    color: '#4e6050',
    marginBottom: 16,
    lineHeight: 20,
  },
  dashboardCard: {
    backgroundColor: '#0f1a14',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f5ec',
    marginBottom: 8,
  },
  cardText: {
    color: '#8b9a84',
    fontSize: 14,
    lineHeight: 20,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  dashboardGreeting: {
    color: '#f0f5ec',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dashboardLabel: {
    color: '#7a8b76',
    fontSize: 12,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  dashboardAmount: {
    color: '#f0f5ec',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
    marginBottom: 4,
  },
  dashboardSmall: {
    color: '#7a8b76',
    fontSize: 13,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0e1b14',
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metricCardMargin: {
    marginRight: 10,
  },
  metricLabel: {
    color: '#7a8b76',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginBottom: 10,
  },
  metricValue: {
    color: '#f0f5ec',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricNote: {
    color: '#7a8b76',
    fontSize: 11,
  },
  collectionCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  summaryPanel: {
    flex: 1,
    backgroundColor: '#0e1b14',
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryPanelLabel: {
    color: '#7a8b76',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryPanelValue: {
    color: '#f0f5ec',
    fontSize: 22,
    fontWeight: '700',
  },
  summaryPanelNote: {
    color: '#7a8b76',
    fontSize: 12,
    marginTop: 6,
  },
  borrowerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  trackerItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  trackerStep: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  trackerStepActive: {
    borderColor: '#48b464',
    backgroundColor: '#48b464',
  },
  trackerStepText: {
    color: '#c0d0bc',
    fontWeight: '700',
  },
  trackerStepTextActive: {
    color: '#0f1a14',
  },
  trackerLabel: {
    color: '#7a8b76',
    fontSize: 11,
    textAlign: 'center',
  },
  trackerLine: {
    position: 'absolute',
    top: 17,
    right: -50,
    left: '50%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: -1,
  },
  trackerLineActive: {
    backgroundColor: '#48b464',
  },
  loanFormField: {
    marginBottom: 14,
  },
  collectionTitle: {
    color: '#f0f5ec',
    fontSize: 15,
    fontWeight: '700',
  },
  collectionNote: {
    color: '#7a8b76',
    fontSize: 12,
  },
  collectionGraph: {
    height: 120,
    backgroundColor: 'rgba(72, 180, 100, 0.08)',
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  collectionGraphLine: {
    height: 4,
    width: '70%',
    backgroundColor: '#48b464',
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  collectionGraphBar: {
    position: 'absolute',
    bottom: 16,
    width: 12,
    borderRadius: 999,
    backgroundColor: '#48b464',
  },
  collectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#48b464',
    position: 'absolute',
    bottom: 20,
  },
  collectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionAmount: {
    color: '#f0f5ec',
    fontSize: 18,
    fontWeight: '700',
  },
  collectionStatus: {
    color: '#7a8b76',
    fontSize: 12,
  },
  recentCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recentTitle: {
    color: '#f0f5ec',
    fontSize: 15,
    fontWeight: '700',
  },
  recentLink: {
    color: '#48b464',
    fontSize: 12,
  },
  loanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  loanIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanIconText: {
    color: '#f0f5ec',
    fontWeight: '700',
  },
  loanContent: {
    flex: 1,
  },
  loanName: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '700',
  },
  loanDue: {
    color: '#7a8b76',
    fontSize: 12,
    marginTop: 2,
  },
  loanStatus: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  loanStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  statusOnTrack: {
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
  },
  statusOverdue: {
    backgroundColor: 'rgba(220, 72, 72, 0.18)',
  },
  dashboardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 18,
    gap: 10,
  },
  dashboardLayout: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dashboardMain: {
    flex: 2,
    minWidth: 0,
  },
  dashboardNav: {
    width: 140,
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navTitle: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  navItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navItemActive: {
    borderColor: '#48b464',
    backgroundColor: 'rgba(72, 180, 100, 0.16)',
  },
  navLabel: {
    color: '#c0d0bc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  navLabelActive: {
    color: '#f0f5ec',
  },
  navCount: {
    color: '#f0f5ec',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  navSubtitle: {
    color: '#7a8b76',
    fontSize: 11,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
    borderColor: '#48b464',
  },
  tabButtonText: {
    color: '#c0d0bc',
    fontSize: 12,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#f0f5ec',
  },
  tabContentCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  cardSectionTitle: {
    color: '#f0f5ec',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deadlineDate: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(72, 180, 100, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deadlineDateText: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '700',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineName: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '700',
  },
  deadlineSub: {
    color: '#7a8b76',
    fontSize: 12,
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  historyName: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '700',
  },
  historySub: {
    color: '#7a8b76',
    fontSize: 12,
    marginTop: 4,
  },
  historyStatus: {
    color: '#48b464',
    fontSize: 12,
    fontWeight: '700',
  },
  missingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  missingStatus: {
    color: '#e35b5b',
    fontSize: 12,
    fontWeight: '700',
  },
  profileHeaderCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    alignItems: 'center',
  },
  profileAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#f0f5ec',
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    color: '#f0f5ec',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#7a8b76',
    fontSize: 13,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profileBadge: {
    backgroundColor: 'rgba(72, 180, 100, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileBadgeSecondary: {
    backgroundColor: 'rgba(72, 180, 100, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileBadgeText: {
    color: '#f0f5ec',
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#0f1a14',
    borderRadius: 20,
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoLabel: {
    color: '#7a8b76',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  infoValue: {
    color: '#f0f5ec',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 4,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  profileCol: {
    flex: 1,
    backgroundColor: 'rgba(36, 121, 69, 0.08)',
    borderRadius: 16,
    padding: 14,
  },
  profileLabel: {
    color: '#7a8b76',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.08,
  },
  profileValue: {
    color: '#f0f5ec',
    fontSize: 16,
    fontWeight: '600',
  },

  // Auth form
  backRow: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    color: '#4e6050',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#0f1a14',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 22,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f5ec',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: '#4e6050',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3a4e3a',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  helperText: {
    color: '#7a8b76',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#0a130d',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#e0eadc',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -6,
  },
  forgotText: {
    fontSize: 13,
    color: '#48b464',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  switchText: {
    fontSize: 13,
    color: '#3a4e3a',
  },
  switchLink: {
    fontSize: 13,
    color: '#48b464',
    fontWeight: '600',
  },
});