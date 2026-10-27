import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const inputIdentifier = username.trim();
    if (!inputIdentifier || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await register({
          username: inputIdentifier,
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        });
        Alert.alert('Registration Successful', `Welcome to HealthMitra, ${inputIdentifier}!`);
      } else {
        await login(inputIdentifier, password);
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred during authentication';
      setErrorMessage(msg);
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setErrorMessage(null);
    setIsSignUp(!isSignUp);
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset Password', 'A password reset link will be sent to your registered email.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Logo & Header */}
        <View style={styles.headerSection}>
          <Image
            source={require('../assets/logo.png')}
            defaultSource={{ uri: 'https://healthmitra.co.in/assets/img/logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          {isSignUp ? (
            <Text style={styles.subtitle}>Create your HealthMitra account</Text>
          ) : null}
        </View>

        {/* Error Notification Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Login / Register Form */}
        <View style={styles.formContainer}>
          {/* Full Name Input (Sign Up only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name (Optional)</Text>
              <View
                style={[
                  styles.inputWrapper,
                  fullNameFocused && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          {/* Email Input (Sign Up only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. user@healthmitra.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          {/* Username / Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {isSignUp ? 'Username' : 'Username or Email'}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                usernameFocused && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={styles.textInput}
                placeholder={
                  isSignUp
                    ? 'Choose a unique username'
                    : 'Enter your username or email'
                }
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
              ]}
            >
              <TextInput
                style={[styles.textInput, styles.passwordInput]}
                placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Options Row (Remember Me & Forgot Password) */}
          {!isSignUp && (
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Submit Button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle between Sign In / Sign Up */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={handleToggleMode} activeOpacity={0.7}>
            <Text style={styles.toggleLink}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 240,
    height: 70,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: 16,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#38A3E5',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  passwordInput: {
    paddingRight: 8,
  },
  passwordToggle: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38A3E5',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#38A3E5',
    borderColor: '#38A3E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  rememberMeText: {
    fontSize: 13,
    color: '#64748B',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38A3E5',
  },
  actionButton: {
    backgroundColor: '#38A3E5',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38A3E5',
  },
});

