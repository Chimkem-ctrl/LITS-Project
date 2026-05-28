import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ActivateAccountScreen from '../screens/ActivateAccountScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LoanRequestScreen from '../screens/LoanRequestScreen';
import LoansScreen from '../screens/LoansScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ChatScreen from '../screens/ChatScreen';
import { COLORS } from '../styles/theme';
import { TouchableOpacity, Text, StyleSheet, Alert, Platform } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: [Linking.createURL('/'), 'litsmobile://'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ActivateAccount: 'activate/:uid/:token',
    },
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: '700', color: COLORS.textPrimary },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: COLORS.bg },
  headerShadowVisible: false,
  headerBorderBottomWidth: 0,
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'borrower';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          title: isBorrower ? 'Home' : 'Dashboard',
          tabBarLabel: isBorrower ? 'Home' : 'Dashboard',
        }}
      />
      <Tab.Screen
        name="LoansTab"
        component={LoansScreen}
        options={{ title: 'Loans', tabBarLabel: 'Loans' }}
      />
      <Tab.Screen
        name="RequestsTab"
        component={RequestsScreen}
        options={{ title: 'Requests', tabBarLabel: 'Requests' }}
      />
      {isBorrower ? (
        <Tab.Screen
          name="InvoicesTab"
          component={InvoicesScreen}
          options={{ title: 'Invoices', tabBarLabel: 'Invoices' }}
        />
      ) : null}
      {isBorrower ? (
        <Tab.Screen
          name="CalendarTab"
          component={CalendarScreen}
          options={{ title: 'Calendar', tabBarLabel: 'Calendar' }}
        />
      ) : null}
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{ title: 'AI Chat', tabBarLabel: 'AI Chat' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { user, logout } = useAuth();
  const isBorrower = user?.role === 'borrower';
  const title = isBorrower
    ? `Hi, ${user?.first_name || 'Borrower'} 👋`
    : `Admin Panel`;

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      await logout();
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={() => ({
          title,
          headerRight: () => (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign out</Text>
            </TouchableOpacity>
          ),
          ...(isBorrower ? {} : {}),
        })}
      />
      <Stack.Screen name="LoanRequest" component={LoanRequestScreen} options={{ title: 'New Loan Request' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Loan Calendar' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer linking={linking} key={user ? 'app-nav' : 'auth-nav'}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: { color: COLORS.textSecondary, fontSize: 13 },
});
