// Mock auth service for frontend demo
// In production, this would make API calls to a backend server

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

export class AuthServiceMock {
  private static instance: AuthServiceMock;

  private constructor() {}

  static getInstance(): AuthServiceMock {
    if (!AuthServiceMock.instance) {
      AuthServiceMock.instance = new AuthServiceMock();
    }
    return AuthServiceMock.instance;
  }

  // Mock user registration
  async register(
    username: string,
    email: string,
    password: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Basic validation
    if (!username || !email || !password) {
      return { success: false, message: 'All fields are required' };
    }

    if (password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters' };
    }

    // Simulate successful registration
    const mockUser = {
      id: Math.floor(Math.random() * 10000),
      username,
      email,
      displayName: username,
      securityScore: 100,
    };

    return {
      success: true,
      user: mockUser,
      token: 'mock-jwt-token-' + Date.now(),
      message: 'Registration successful'
    };
  }

  // Mock user login
  async login(
    username: string,
    password: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Basic validation
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }

    // Mock authentication logic
    if (username === 'demo' && password === 'password123') {
      const mockUser = {
        id: 1,
        username: 'demo',
        email: 'demo@snapsecure.com',
        displayName: 'Demo User',
        securityScore: 95,
      };

      return {
        success: true,
        user: mockUser,
        token: 'mock-jwt-token-' + Date.now(),
        message: 'Login successful'
      };
    }

    // Simulate failed login
    return { success: false, message: 'Invalid username or password' };
  }

  // Mock logout
  async logout(): Promise<void> {
    // Simulate logout delay
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('User logged out (mock)');
  }

  // Mock authentication check
  async isAuthenticated(): Promise<boolean> {
    // For demo purposes, always return false initially
    return false;
  }

  // Mock get current user
  async getCurrentUser(): Promise<any | null> {
    // Return null for demo
    return null;
  }

  // Mock permission request
  async requestPermission(
    permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY',
    reason: string
  ): Promise<{ granted: boolean; message: string }> {
    // Simulate permission check delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      granted: true,
      message: `${permissionType} permission granted (mock)`
    };
  }

  // Mock permission revocation
  async revokePermission(permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY'): Promise<void> {
    console.log(`${permissionType} permission revoked (mock)`);
  }

  // Mock get user permissions
  async getUserPermissions(): Promise<any[]> {
    return [
      { permissionType: 'CAMERA', isGranted: false },
      { permissionType: 'MICROPHONE', isGranted: false },
      { permissionType: 'GALLERY', isGranted: false },
    ];
  }
}

export const authService = AuthServiceMock.getInstance();