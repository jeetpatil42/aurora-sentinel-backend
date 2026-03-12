export interface User {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: 'student' | 'security' | 'admin';
    is_verified: boolean;
    security_approved: boolean;
    created_at: string;
}
export declare function hashPassword(password: string): Promise<string>;
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
export declare function hashOTP(otp: string): Promise<string>;
export declare function compareOTP(otp: string, hash: string): Promise<boolean>;
export declare function generateOTP(): Promise<string>;
export declare function registerUser(email: string, password: string, role?: 'student' | 'security'): Promise<User>;
export declare function verifyOTP(userId: string, otp: string): Promise<boolean>;
export declare function loginUser(email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
}>;
export declare function getUserById(userId: string): Promise<User | null>;
//# sourceMappingURL=auth.d.ts.map