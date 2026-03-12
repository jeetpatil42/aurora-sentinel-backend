"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || '';
const isDevelopment = process.env.NODE_ENV !== 'production';
if (!supabaseUrl || !supabaseServiceKey) {
    if (isDevelopment) {
        console.error('❌ ERROR: Supabase credentials are missing or empty.');
        console.error('Please configure the following in backend/.env:');
        console.error('  SUPABASE_URL=<your-project-url>');
        console.error('  SUPABASE_SERVICE_ROLE=<your-service-role-key>');
        throw new Error('Supabase credentials are required. Please check your .env file.');
    }
    else {
        console.error('Missing Supabase configuration. Please check your .env file.');
        process.exit(1);
    }
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
//# sourceMappingURL=supabaseAdmin.js.map