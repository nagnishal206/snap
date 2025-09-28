import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authService } from '../services/authServiceMock';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [isConfirmSecure, setIsConfirmSecure] = useState(true);
  const [focusedField, setFocusedField] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      // Shake animation for errors
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.02, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.98, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.register(
        formData.username,
        formData.email,
        formData.password
      );

      if (result.success) {
        Alert.alert(
          '🎉 Welcome to SnapSecure!',
          'Your account has been created successfully with enterprise-grade security.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Main'),
            },
          ]
        );
      } else {
        Alert.alert('Signup Failed', result.message || 'Please try again');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Network Error',
        'Unable to create account. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, text: '', color: '#666' };
    
    let strength = 0;
    let checks = [];
    
    if (password.length >= 8) { strength++; checks.push('8+ characters'); }
    if (/[a-z]/.test(password)) { strength++; checks.push('lowercase'); }
    if (/[A-Z]/.test(password)) { strength++; checks.push('uppercase'); }
    if (/\d/.test(password)) { strength++; checks.push('numbers'); }
    if (/[!@#$%^&*]/.test(password)) { strength++; checks.push('symbols'); }
    
    const colors = ['#FF4444', '#FF8800', '#FFAA00', '#88CC00', '#44AA00'];
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    return {
      strength: Math.min(strength, 4),
      text: texts[Math.min(strength, 4)],
      color: colors[Math.min(strength, 4)],
      checks
    };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join SnapSecure for enterprise-grade security 🔒
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'username' && styles.inputFocused,
                  errors.username && styles.inputError
                ]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Choose a unique username"
                    placeholderTextColor="#666"
                    value={formData.username}
                    onChangeText={(value) => updateField('username', value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputFocused,
                  errors.email && styles.inputError
                ]}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#666"
                    value={formData.email}
                    onChangeText={(value) => updateField('email', value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputFocused,
                  errors.password && styles.inputError
                ]}>
                  <Text style={styles.inputIcon}>🔐</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Create a strong password"
                    placeholderTextColor="#666"
                    value={formData.password}
                    onChangeText={(value) => updateField('password', value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={isSecure}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setIsSecure(!isSecure)}
                  >
                    <Text style={styles.eyeIcon}>{isSecure ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                
                {/* Password Strength Indicator */}
                {formData.password ? (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBar}>
                      {[0, 1, 2, 3, 4].map((index) => (
                        <View
                          key={index}
                          style={[
                            styles.strengthSegment,
                            index <= passwordStrength.strength && { backgroundColor: passwordStrength.color }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'confirmPassword' && styles.inputFocused,
                  errors.confirmPassword && styles.inputError
                ]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your password"
                    placeholderTextColor="#666"
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateField('confirmPassword', value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={isConfirmSecure}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setIsConfirmSecure(!isConfirmSecure)}
                  >
                    <Text style={styles.eyeIcon}>{isConfirmSecure ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              {/* Security Features Info */}
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>🛡️ Your Security Features:</Text>
                <Text style={styles.securityFeature}>• End-to-end encryption</Text>
                <Text style={styles.securityFeature}>• Blockchain audit trails</Text>
                <Text style={styles.securityFeature}>• Advanced firewall protection</Text>
                <Text style={styles.securityFeature}>• Zero-knowledge architecture</Text>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  isLoading && styles.signupButtonDisabled
                ]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signupButtonText}>Create My Account</Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLinkButton}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  inputFocused: {
    borderColor: '#FF6B6B',
    backgroundColor: '#252525',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeButton: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordStrength: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBar: {
    flexDirection: 'row',
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginRight: 10,
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    backgroundColor: '#333',
    marginRight: 2,
    borderRadius: 1,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
  },
  securityInfo: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#333333',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  securityFeature: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
    lineHeight: 18,
  },
  signupButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signupButtonDisabled: {
    backgroundColor: '#666666',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  loginLinkButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignupScreen;