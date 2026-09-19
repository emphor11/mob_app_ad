import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // In Phase 3, we default to the Welcome screen of the auth flow.
  // In Phase 7 (Authentication), this will check SecureStore token and route to (tabs)/dashboard or (auth)/welcome.
  return <Redirect href="/(auth)/welcome" />;
}
