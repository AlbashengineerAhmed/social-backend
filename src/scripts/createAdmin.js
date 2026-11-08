/**
 * @fileoverview Admin Seed & Account Provisioning CLI Script
 * @module scripts/createAdmin
 * @description Creates or promotes an account to Administrator/SuperAdmin with verified email status.
 *
 * Usage:
 *   node src/scripts/createAdmin.js [email] [password] [username] [role]
 *
 * Examples:
 *   npm run create:admin
 *   npm run create:admin admin@example.com MyPass123! "Super Moderator" superAdmin
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

// 1. Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../config/.env.dev') });

// 2. Import database connection and user model
const { default: connectDB } = await import('../DB/connection.js');
const { userModel, roleTypes } = await import('../DB/model/User.model.js');

async function run() {
    try {
        console.log('\n=========================================');
        console.log('🛡️  Antigravity Social - Admin Setup Tool');
        console.log('=========================================\n');

        // Connect to MongoDB
        await connectDB();

        // Parse CLI arguments or use defaults
        const args = process.argv.slice(2);
        const rawEmail = args[0] || process.env.ADMIN_EMAIL || 'admin@social.com';
        const rawPassword = args[1] || process.env.ADMIN_PASSWORD || 'Admin@123456';
        const rawUsername = args[2] || process.env.ADMIN_USERNAME || 'System Admin';
        const rawRole = args[3] || process.env.ADMIN_ROLE || 'superAdmin';

        const email = rawEmail.replace(/^["']|["']$/g, '').trim().toLowerCase();
        const password = rawPassword.replace(/^["']|["']$/g, '');
        const username = rawUsername.replace(/^["']|["']$/g, '').trim();
        const roleArg = rawRole.replace(/^["']|["']$/g, '').trim();

        const nameParts = username.split(/\s+/);
        const firstName = nameParts[0] || 'System';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Admin';

        // Validate role
        const validRoles = Object.values(roleTypes);
        const role = validRoles.includes(roleArg) ? roleArg : roleTypes.superAdmin;

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            console.log(`ℹ️  User with email "${email}" already exists.`);
            console.log(`🔄 Upgrading role to: "${role}" and ensuring account is active...`);

            existingUser.role = role;
            existingUser.confirmEmail = true;
            existingUser.isDeleted = false;
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;

            // Update password if specified as command-line argument
            if (args[1]) {
                existingUser.password = password; // pre-save hook will hash it automatically
            }

            await existingUser.save();

            console.log('\n✅ Account successfully upgraded to Administrator!');
            console.log('-----------------------------------------');
            console.log(`📧 Email:      ${existingUser.email}`);
            console.log(`👤 Username:   ${existingUser.username}`);
            console.log(`👑 Role:       ${existingUser.role}`);
            console.log(`✔️  Status:     Verified & Active`);
            console.log('-----------------------------------------\n');
        } else {
            console.log(`🌱 Creating new ${role} account for "${email}"...`);

            const newUser = new userModel({
                firstName,
                lastName,
                username,
                email,
                password, // pre-save hook in User.model.js hashes plain text
                role,
                confirmEmail: true,
                isDeleted: false
            });

            await newUser.save();

            console.log('\n✅ Admin account created successfully!');
            console.log('-----------------------------------------');
            console.log(`📧 Email:      ${newUser.email}`);
            console.log(`🔑 Password:   ${password}`);
            console.log(`👤 Username:   ${newUser.username}`);
            console.log(`👑 Role:       ${newUser.role}`);
            console.log(`✔️  Status:     Verified & Active`);
            console.log('-----------------------------------------');
            console.log('💡 You can now log in via the web client (/sign-in) and open /admin.\n');
        }

        await mongoose.disconnect();
        console.log('🔌 DB connection closed cleanly.\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error provisioning admin account:', err);
        try {
            await mongoose.disconnect();
        } catch {}
        process.exit(1);
    }
}

run();
