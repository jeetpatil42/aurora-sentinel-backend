"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = exports.createLocalUser = exports.verify = exports.register = void 0;
const express_validator_1 = require("express-validator");
const auth_1 = require("../services/auth");
const jwt_1 = require("../utils/jwt");
const supabaseAdmin_1 = require("../db/supabaseAdmin");
const client_1 = require("../db/client");
exports.register = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
    (0, express_validator_1.body)('role').optional().isIn(['student', 'security']),
    async (req, res) => {
        res.status(400).json({ error: 'Sign up is handled by Supabase. Please use the frontend registration form.' });
    },
];
exports.verify = [
    (0, express_validator_1.body)('userId').notEmpty(),
    (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }),
    async (req, res) => {
        res.json({ message: 'Email verification is now handled by Supabase.' });
    },
];
exports.createLocalUser = [
    (0, express_validator_1.body)('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 120 }).withMessage('Name must be between 1 and 120 characters')
        .trim(),
    (0, express_validator_1.body)('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    (0, express_validator_1.body)('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['student', 'security']).withMessage('Role must be either "student" or "security"'),
    async (req, res) => {
        try {
            console.log('CREATE LOCAL USER REQUEST:', {
                hasEmail: !!req.body.email,
                hasPassword: !!req.body.password,
                hasRole: !!req.body.role,
                roleValue: req.body.role,
            });
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                const errorMessages = errors.array().map(err => {
                    const field = 'param' in err ? err.param : 'unknown';
                    return `${field}: ${err.msg}`;
                }).join(', ');
                console.log('CREATE LOCAL USER VALIDATION ERROR:', errorMessages, errors.array());
                res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array(),
                    details: errorMessages,
                });
                return;
            }
            const { email, password, role, name } = req.body;
            if (!email || typeof email !== 'string') {
                console.log('CREATE LOCAL USER ERROR: Invalid email', { email, type: typeof email });
                res.status(400).json({ message: 'Email is required and must be a string' });
                return;
            }
            if (!password || typeof password !== 'string') {
                console.log('CREATE LOCAL USER ERROR: Invalid password', { hasPassword: !!password, type: typeof password });
                res.status(400).json({ message: 'Password is required and must be a string' });
                return;
            }
            if (!role || typeof role !== 'string') {
                console.log('CREATE LOCAL USER ERROR: Invalid role', { role, type: typeof role });
                res.status(400).json({ message: 'Role is required and must be a string' });
                return;
            }
            if (!name || typeof name !== 'string' || !name.trim()) {
                console.log('CREATE LOCAL USER ERROR: Invalid name', { hasName: !!name, type: typeof name });
                res.status(400).json({ message: 'Name is required and must be a string' });
                return;
            }
            if (role !== 'student' && role !== 'security') {
                console.log('CREATE LOCAL USER ERROR: Invalid role value', { role });
                res.status(400).json({ message: "Role must be either 'student' or 'security'" });
                return;
            }
            const normalizedEmail = email.toLowerCase().trim();
            const normalizedName = String(name).trim();
            const passwordString = String(password);
            console.log('CREATE LOCAL USER: Processing', {
                email: normalizedEmail,
                role,
                passwordLength: passwordString.length,
            });
            const { data: existingUser, error: checkError } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', normalizedEmail)
                .maybeSingle();
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('CREATE LOCAL USER ERROR: Database check failed', checkError);
                res.status(500).json({ message: 'Failed to check if user exists' });
                return;
            }
            if (existingUser) {
                console.log('CREATE LOCAL USER ERROR: User already exists', normalizedEmail);
                res.status(409).json({ message: 'User already exists in local database' });
                return;
            }
            console.log('CREATE LOCAL USER: Hashing password...');
            const passwordHash = await (0, auth_1.hashPassword)(passwordString);
            if (!passwordHash || typeof passwordHash !== 'string') {
                console.error('CREATE LOCAL USER ERROR: Password hash failed or invalid', {
                    hasHash: !!passwordHash,
                    hashType: typeof passwordHash,
                });
                res.status(500).json({ message: 'Failed to hash password' });
                return;
            }
            const { data: user, error: insertError } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .insert({
                email: normalizedEmail,
                password_hash: passwordHash,
                name: normalizedName,
                role: role,
                is_verified: false,
                security_approved: role !== 'security',
            })
                .select()
                .single();
            if (insertError) {
                console.error('CREATE LOCAL USER ERROR: Database insert failed', insertError);
                res.status(500).json({
                    message: 'Failed to create local user',
                    error: insertError.message,
                });
                return;
            }
            if (!user) {
                console.error('CREATE LOCAL USER ERROR: User not returned after insert');
                res.status(500).json({ message: 'Failed to create local user' });
                return;
            }
            console.log('CREATE LOCAL USER SUCCESS:', {
                id: user.id,
                email: user.email,
                role: user.role,
            });
            res.status(201).json({
                message: 'Local user created successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    security_approved: user.security_approved,
                },
            });
        }
        catch (error) {
            console.error('CREATE LOCAL USER ERROR: Unexpected error', error);
            res.status(500).json({
                message: 'Failed to create local user',
                error: error.message || 'Internal server error',
            });
        }
    },
];
exports.login = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
    async (req, res) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: 'Validation failed', errors: errors.array() });
                return;
            }
            const { email, password } = req.body;
            const normalizedEmail = email.toLowerCase().trim();
            const isProduction = process.env.NODE_ENV === 'production';
            const demoAdminBootstrapEnabled = process.env.ENABLE_DEMO_ADMIN_BOOTSTRAP === 'true' ||
                (!isProduction && process.env.ENABLE_DEMO_ADMIN_BOOTSTRAP !== 'false');
            if (demoAdminBootstrapEnabled && normalizedEmail === 'admin@test.com') {
                try {
                    const { data: usersList } = await supabaseAdmin_1.supabaseAdmin.auth.admin.listUsers();
                    const authUser = usersList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
                    if (!authUser) {
                        await supabaseAdmin_1.supabaseAdmin.auth.admin.createUser({
                            email: normalizedEmail,
                            password: 'admin123',
                            email_confirm: true,
                            user_metadata: {
                                role: 'admin',
                                name: 'Admin',
                            },
                        });
                    }
                    else {
                        await supabaseAdmin_1.supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            password: 'admin123',
                            user_metadata: {
                                role: 'admin',
                                name: 'Admin',
                            },
                        });
                    }
                }
                catch (bootstrapError) {
                    console.warn('ADMIN BOOTSTRAP WARNING:', bootstrapError?.message || bootstrapError);
                }
                const passwordHash = await (0, auth_1.hashPassword)('admin123');
                const { data: existingAdmin } = await supabaseAdmin_1.supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('email', normalizedEmail)
                    .maybeSingle();
                if (existingAdmin?.id) {
                    await supabaseAdmin_1.supabaseAdmin
                        .from('users')
                        .update({
                        password_hash: passwordHash,
                        role: 'admin',
                        name: 'Admin',
                        is_verified: true,
                        security_approved: true,
                    })
                        .eq('id', existingAdmin.id);
                }
                else {
                    await supabaseAdmin_1.supabaseAdmin
                        .from('users')
                        .insert({
                        email: normalizedEmail,
                        password_hash: passwordHash,
                        role: 'admin',
                        name: 'Admin',
                        is_verified: true,
                        security_approved: true,
                    });
                }
            }
            console.log('LOGIN ATTEMPT: Starting login for', normalizedEmail);
            const { data: authData, error: authError } = await client_1.supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });
            if (authError || !authData?.user) {
                const authMessage = authError?.message || 'Invalid email or password';
                const isUnverified = /confirm|verified|email/i.test(authMessage);
                res.status(isUnverified ? 400 : 401).json({
                    message: isUnverified ? 'Email not verified yet. Please check your inbox.' : 'Invalid email or password',
                });
                return;
            }
            const authUser = authData.user;
            const metadataRole = (authUser.user_metadata?.role || 'student');
            const metadataName = authUser.user_metadata?.name || normalizedEmail.split('@')[0];
            const { data: localUser, error: dbError } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();
            if (dbError && dbError.code !== 'PGRST116') {
                console.log('LOGIN FAILURE: Database lookup error');
                res.status(500).json({ message: 'Server error retrieving user data' });
                return;
            }
            let finalUser = localUser;
            if (!finalUser) {
                const placeholderHash = await (0, auth_1.hashPassword)(`supabase-login-${Date.now()}`);
                const { data: insertedUser, error: insertError } = await supabaseAdmin_1.supabaseAdmin
                    .from('users')
                    .insert({
                    email: normalizedEmail,
                    password_hash: placeholderHash,
                    name: metadataName,
                    role: metadataRole,
                    is_verified: !!authUser.email_confirmed_at,
                    security_approved: metadataRole !== 'security',
                })
                    .select()
                    .single();
                if (insertError || !insertedUser) {
                    console.log('LOGIN FAILURE: Could not create local user');
                    res.status(500).json({ message: 'Failed to sync user account' });
                    return;
                }
                finalUser = insertedUser;
            }
            else {
                const nextVerifiedState = !!authUser.email_confirmed_at;
                const nextName = finalUser.name || metadataName;
                const shouldUpdateLocalUser = finalUser.is_verified !== nextVerifiedState ||
                    finalUser.name !== nextName;
                if (shouldUpdateLocalUser) {
                    const { data: updatedUser } = await supabaseAdmin_1.supabaseAdmin
                        .from('users')
                        .update({
                        is_verified: nextVerifiedState,
                        name: nextName,
                    })
                        .eq('id', finalUser.id)
                        .select()
                        .single();
                    finalUser = updatedUser || finalUser;
                }
            }
            if (finalUser.role === 'security' && !finalUser.security_approved) {
                res.status(403).json({
                    message: 'Security account pending admin approval',
                });
                return;
            }
            const payload = {
                userId: finalUser.id,
                email: finalUser.email,
                role: finalUser.role,
            };
            const accessToken = (0, jwt_1.generateAccessToken)(payload);
            const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.json({
                user: {
                    id: finalUser.id,
                    email: finalUser.email,
                    name: finalUser.name,
                    role: finalUser.role,
                    security_approved: finalUser.security_approved,
                },
                accessToken,
            });
        }
        catch (error) {
            console.log('LOGIN FAILURE: Unexpected error -', error.message || error);
            res.status(500).json({ message: 'Login failed' });
        }
    },
];
const me = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const user = await (0, auth_1.getUserById)(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                is_verified: user.is_verified,
                security_approved: user.security_approved,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.me = me;
//# sourceMappingURL=auth.controller.js.map