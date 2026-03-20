require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase URL or Service Role Key is missing. Please check your .env file.');
}

// We use the Service Role Key here because the backend needs to bypass RLS to sync user roles/data if needed
// Or at the very least, be able to interact with the auth admin API.
const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

module.exports = { supabase };
