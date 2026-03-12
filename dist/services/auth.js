"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.hashOTP = hashOTP;
exports.compareOTP = compareOTP;
exports.generateOTP = generateOTP;
exports.registerUser = registerUser;
exports.verifyOTP = verifyOTP;
exports.loginUser = loginUser;
exports.getUserById = getUserById;
const bcrypt_1 = __importDefault(require("bcrypt"));
const supabaseAdmin_1 = require("../db/supabaseAdmin");
const client_1 = require("../db/client");
const email_1 = require("./email");
const jwt_1 = require("../utils/jwt");
const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
async function comparePassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
async function hashOTP(otp) {
    return bcrypt_1.default.hash(otp, SALT_ROUNDS);
}
async function compareOTP(otp, hash) {
    return bcrypt_1.default.compare(otp, hash);
}
async function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function registerUser(email, password, role = 'student') {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
    if (existingUser) {
        throw new Error('User with this email already exists');
    }
    // Hash password
    const passwordHash = await hashPassword(password);
    // Create user
    const { data: user, error } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: email.split('@')[0],
        role,
        is_verified: false,
        security_approved: role !== 'security',
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }
    // Generate and send OTP
    const otp = await generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    await supabaseAdmin_1.supabaseAdmin
        .from('otp_codes')
        .insert({
        user_id: user.id,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
    });
    // Send OTP email
    await (0, email_1.sendOTPEmail)(email, otp);
    return user;
}
async function verifyOTP(userId, otp) {
    // Get valid OTP codes for user
    const { data: otpCodes } = await supabaseAdmin_1.supabaseAdmin
        .from('otp_codes')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
    if (!otpCodes || otpCodes.length === 0) {
        return false;
    }
    // Check if any OTP matches
    for (const otpCode of otpCodes) {
        const match = await compareOTP(otp, otpCode.otp_hash);
        if (match) {
            // Mark user as verified
            await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .update({ is_verified: true })
                .eq('id', userId);
            // Delete used OTP codes
            await supabaseAdmin_1.supabaseAdmin
                .from('otp_codes')
                .delete()
                .eq('user_id', userId);
            return true;
        }
    }
    return false;
}
async function loginUser(email, password) {
    // Try to get user from users table first (legacy users)
    const { data: user, error } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (user && !error) {
        // User exists in users table - verify password
        const passwordMatch = await comparePassword(password, user.password_hash);
        if (!passwordMatch) {
            throw new Error('Invalid email or password');
        }
        // Check if verified (verification is now handled by Supabase Auth, but we keep this for legacy users)
        if (!user.is_verified) {
            throw new Error('Please verify your email before logging in');
        }
        // Generate tokens
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        return {
            user,
            accessToken,
            refreshToken,
        };
    }
    // User doesn't exist in users table - might be a Supabase Auth user
    // Try to verify password with Supabase Auth
    const { data: authData, error: authError } = await client_1.supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
    });
    if (authError || !authData?.user) {
        throw new Error('Invalid email or password');
    }
    // User exists in Supabase Auth - get role from metadata
    const role = authData.user.user_metadata?.role || 'student';
    const name = authData.user.user_metadata?.name || email.split('@')[0];
    // Create user in users table (sync from Supabase Auth)
    const placeholderHash = await hashPassword('placeholder-' + Date.now());
    const { data: newUser, error: createError } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .insert({
        email: email.toLowerCase(),
        password_hash: placeholderHash, // Placeholder - password verified via Supabase Auth
        name,
        role,
        is_verified: true, // Verified via Supabase Auth
        security_approved: role !== 'security',
    })
        .select()
        .single();
    if (createError || !newUser) {
        throw new Error('Failed to sync user account');
    }
    // Generate tokens
    const payload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
    };
    const accessToken = (0, jwt_1.generateAccessToken)(payload);
    const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
    return {
        user: newUser,
        accessToken,
        refreshToken,
    };
}
async function getUserById(userId) {
    const { data, error } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
//# sourceMappingURL=auth.js.map