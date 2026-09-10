import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useAuth } from '../../context/AuthContext';

// CommonStatusCodes.DEVELOPER_ERROR — the native module rejects with this
// numeric code; statusCodes.DEVELOPER_ERROR is not exported by v16.
const DEVELOPER_ERROR_CODE = '10';

function isDeveloperError(err) {
  return (
    !!err &&
    (err.code === statusCodes.DEVELOPER_ERROR ||
      err.code === DEVELOPER_ERROR_CODE ||
      /DEVELOPER_ERROR/.test(err.message ?? ''))
  );
}

// Multicolor Google "G" — ported from the prototype (index.html sign-in card).
function GoogleLogo({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 34.9 44 30 44 24c0-1.3-.1-2.7-.4-3.9z"
      />
    </Svg>
  );
}

// Sign-in sheet body — mirrors the prototype's .signin-card (no header row;
// SheetContainer skips its head via the hideHeader overlay prop).
export default function SignInModal() {
  const { theme } = useTheme();
  const { closeOverlay, showToast } = useOverlay();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signIn();
      if (user) {
        closeOverlay('signIn');
        showToast(`Signed in as ${user.full_name || user.email}`);
      }
      // null → cancelled: clear error, no message, sheet stays open
    } catch (err) {
      if (isDeveloperError(err)) {
        setError(
          'Google sign-in not configured yet — add the OAuth web client ID.',
        );
      } else {
        setError(err?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.logo,
          {
            backgroundColor: theme.accent,
            borderColor: theme.accentLight,
            shadowColor: theme.accentLight,
          },
        ]}>
        <Text style={[styles.logoText, { fontFamily: theme.fontMono }]}>
          24
        </Text>
      </View>
      <Text
        style={[
          styles.title,
          { color: theme.textPrimary, fontFamily: theme.fontHead },
        ]}>
        Sign in to IntelMap24
      </Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Save incidents and zones to your bookmarks,{'\n'}synced across your
        devices.
      </Text>
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : null}
      <Pressable
        onPress={handleSignIn}
        disabled={loading}
        style={({ pressed }) => [
          styles.googleBtn,
          (pressed || loading) && styles.googleBtnPressed,
        ]}>
        {loading ? (
          <ActivityIndicator color="#1f2937" />
        ) : (
          <>
            <GoogleLogo />
            <Text style={[styles.googleText, { fontFamily: theme.fontHead }]}>
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={() => closeOverlay('signIn')}
        disabled={loading}
        style={styles.laterBtn}>
        <Text
          style={[
            styles.laterText,
            { color: theme.textMuted, fontFamily: theme.fontHead },
          ]}>
          Skip for now
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 28,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 7,
  },
  sub: {
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 22,
  },
  error: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  googleBtn: {
    width: '100%',
    height: 46,
    borderRadius: 11,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  laterBtn: {
    width: '100%',
    height: 42,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 13,
  },
});
