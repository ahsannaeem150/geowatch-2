// Google sign-in + session persistence for public users.
// Flow: GoogleSignin.signIn() → idToken → POST /auth/public/google →
// JWT in Keychain, user JSON in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api, clearSession, storeSession } from './api';
import { GOOGLE_WEB_CLIENT_ID, STORAGE_KEYS } from '../constants';

export function configureGoogleSignIn() {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
}

function cancelledError() {
  const err = new Error('Sign-in cancelled');
  err.code = statusCodes.SIGN_IN_CANCELLED;
  err.isCancellation = true;
  return err;
}

// User dismissed the Google sheet (v16 resolves { type: 'cancelled' }; older
// paths throw with code SIGN_IN_CANCELLED) — a non-error the UI should swallow.
export function isSignInCancellation(err) {
  return (
    !!err &&
    (err.isCancellation === true || err.code === statusCodes.SIGN_IN_CANCELLED)
  );
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!response || response.type !== 'success') {
    throw cancelledError();
  }

  // v16: idToken lives on response.data; fall back to getTokens() (and to the
  // pre-v16 shape where the user object itself was resolved).
  let idToken = response.data?.idToken ?? response.idToken ?? null;
  if (!idToken) {
    try {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens?.idToken ?? null;
    } catch {
      // fall through to the NO_ID_TOKEN error below
    }
  }
  if (!idToken) {
    const err = new Error(
      'Google did not return an ID token — check the OAuth web client ID.',
    );
    err.code = 'NO_ID_TOKEN';
    throw err;
  }

  const data = await api.post('/auth/public/google', { idToken });
  await storeSession(data.token, data.user);
  return data.user;
}

export async function fetchMe() {
  const data = await api.get('/auth/public/me');
  const user = data?.user ?? data;
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
}

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort — local session is wiped regardless
  }
  await clearSession();
}
