// Supabase Configuration
// Replace with your actual project URL and Anon Key
const SUPABASE_URL = 'https://ritdffhcgjspbqglfgeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpdGRmZmhjZ2pzcGJxZ2xmZ2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTc5MDQsImV4cCI6MjA4MjQ5MzkwNH0.pnaeRf5kYo_iwIlcoIqmhePe-ijmi-Ls70CpUp8uHPs';

// n8n Webhook Configuration
// Replace this with your actual n8n webhook URL for drive uploads
// The webhook should accept POST requests with 'file' form-data
// And return JSON: { "link": "https://drive.google.com/uc?id=..." }
const N8N_WEBHOOK_URL = 'https://openbookai285.app.n8n.cloud/webhook/upload-media';

// Family Access Configuration
// Self-encrypted password string (AES).
// The correct password acts as the key to decrypt this string back to the password itself.
const FAMILY_PASSWORD_ENCRYPTED = 'U2FsdGVkX185zwOxhbSCDqq/rlWIDEF6vVJ94aRvot9cmJA643d2vAGPG/arfqOF';

// Admin Configuration
// The display name that grants admin privileges (delete any message)
const ADMIN_USERNAME = 'Admin';

export { SUPABASE_URL, SUPABASE_ANON_KEY, N8N_WEBHOOK_URL, FAMILY_PASSWORD_ENCRYPTED, ADMIN_USERNAME };
