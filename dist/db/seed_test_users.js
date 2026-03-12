"use strict";
/**
 * Seed test users for development
 * Creates student@test.com and security@test.com
 * These users bypass email verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTestUsers = seedTestUsers;
const supabaseAdmin_1 = require("./supabaseAdmin");
const auth_1 = require("../services/auth");
async function seedTestUsers() {
    console.log('🌱 Seeding test users...');
    const testUsers = [
        {
            email: 'student@test.com',
            password: 'Test123!',
            role: 'student',
            name: 'Student',
            security_approved: true,
        },
        {
            email: 'security@test.com',
            password: 'Test123!',
            role: 'security',
            name: 'Security',
            security_approved: true,
        },
    ];
    for (const userData of testUsers) {
        try {
            // Check if user already exists
            const { data: existingUser } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userData.email)
                .maybeSingle();
            if (existingUser) {
                console.log(`✅ User ${userData.email} already exists, skipping...`);
                continue;
            }
            // Hash password
            const passwordHash = await (0, auth_1.hashPassword)(userData.password);
            // Create user in local database
            const { data: user, error } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .insert({
                email: userData.email,
                password_hash: passwordHash,
                name: userData.name,
                role: userData.role,
                is_verified: true, // Bypass email verification for test users
                security_approved: userData.security_approved,
            })
                .select()
                .single();
            if (error) {
                console.error(`❌ Failed to create ${userData.email}:`, error.message);
            }
            else {
                console.log(`✅ Created test user: ${userData.email} (${userData.role})`);
            }
        }
        catch (error) {
            console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
    }
    console.log('✨ Test user seeding complete!');
}
// Run if called directly
if (require.main === module) {
    seedTestUsers()
        .then(() => {
        console.log('Done!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=seed_test_users.js.map