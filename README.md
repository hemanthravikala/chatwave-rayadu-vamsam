# Rayaduvamsam Chat - Private Family Communication Platform

A secure, private, and simple chat application designed exclusively for family use.

## Features
- **Private & Secure**: Single shared family password (hashed), no databased passwords.
- **Real-time Messaging**: Instant text updates using Supabase.
- **Media Support**: Send unlimited photos and videos via Google Drive (n8n automation).
- **Admin Controls**: "Admin" user can moderate the chat.
- **Responsive**: Beautiful dark-mode UI that works on mobile and desktop.
- **PWA Ready**: Installable on mobile devices (App-like experience).
- **Privacy Focused**: Dedicated Privacy Policy included.

## 🚀 Setup Instructions

### 1. Database (Supabase)
The project connects to a Supabase backend.
- **Table**: `messages`
- **Columns**: `id`, `sender_name`, `content`, `message_type`, `created_at`
- **RLS**: Enabled (Public interaction allowed for this specific private-link setup).

### 2. File Uploads (n8n & Google Drive)
To enable file uploads, you need an n8n workflow.

1.  **Create a new workflow in n8n**.
2.  **Add a Webhook Node**:
    *   Method: `POST`
    *   Authentication: `None` (or Header Auth if you implement it)
    *   Path: `webhook/upload`
3.  **Add a Google Drive Node**:
    *   Action: `Upload`
    *   File Name: `{{$json.body.filename}}`
    *   Binary Data: `file` (from the webhook)
4.  **Add a Google Drive Node (Share/Get Link)**:
    *   Action: `Add Permission` -> `Public` (or specific) usually to get a viewable link or use a specific folder that is public.
    *   *Alternative*: Just get the `webContentLink` or `webViewLink` from the upload step if the folder is public.
    *   **Crucial**: The workflow must return a JSON object: `{ "link": "DIRECT_VIEW_LINK" }`.
5.  **Copy the Webhook URL** (e.g., `https://your-n8n.com/webhook/upload`).
6.  **Update `config.js`**:
    *   Paste the URL into the `N8N_WEBHOOK_URL` variable.

### 3. Security (Password)
Authentication uses a unique **Self-Decryption** mechanism.
- The password stored in the config is an **AES Encrypted String** of the password itself, using the password as the key.
- **Verification Logic**: `Decrypt(StoredString, InputPassword) === InputPassword`
- **Current Defaults**:
  - Unlocked by entering: `family123`
  - Encrypted String: `U2FsdGVkX18K8vJhwV0QS4ZuShlKFB5x/nIyXDzc4m8=`

**To Change the Password:**
1.  Use the `CryptoJS` library (or an online AES encryption tool compatible with it).
2.  Encrypt your new password *using the new password itself as the key/passphrase*.
3.  Update the `FAMILY_PASSWORD_ENCRYPTED` constant in `config.js` with the resulting ciphertext.

### 4. Admin Access
- Login with the Display Name: **Admin**
- This user has the ability to delete any message in the chat.

## Running Locally
Simply open `index.html` in your browser. For better performance (and module support), run a local server:
```bash
npx serve
```
