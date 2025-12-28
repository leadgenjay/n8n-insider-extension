# Admin Upgrade Process

This document describes how administrators can upgrade user accounts to Pro (unlimited) status using the Supabase dashboard.

## Prerequisites

- Access to the Supabase dashboard for this project
- User's email address

## Steps to Upgrade a User to Pro

### 1. Open Supabase Dashboard

Go to your Supabase project dashboard:
https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Navigate to Table Editor

1. Click **Table Editor** in the left sidebar
2. Select the **profiles** table

### 3. Find the User

Option A - Using the search/filter:
1. Click the filter icon
2. Set filter: `email` `equals` `user@example.com`
3. Click Apply

Option B - Using SQL Editor:
1. Go to **SQL Editor** in the left sidebar
2. Run:
   ```sql
   SELECT * FROM profiles WHERE email = 'user@example.com';
   ```

### 4. Update the User's Profile

**Via Table Editor:**
1. Click on the user's row to edit
2. Set `is_lifetime` to `true`
3. Click Save

**Via SQL Editor:**
```sql
UPDATE profiles
SET is_lifetime = true, updated_at = now()
WHERE email = 'user@example.com';
```

### 5. Verify the Update

```sql
SELECT id, email, is_lifetime, updated_at
FROM profiles
WHERE email = 'user@example.com';
```

## What Pro Status Provides

When `is_lifetime = true`:
- **Unlimited daily requests** (free users limited to 50/day)
- **Pro badge** displayed in the extension header
- Access to all features without restrictions

## Audit Trail

All changes to `is_lifetime` and `stripe_customer_id` fields are automatically logged in the `profile_audit_log` table. This helps track when and how user upgrades occurred.

To view audit logs for a user:
```sql
SELECT * FROM profile_audit_log
WHERE profile_id = (SELECT id FROM profiles WHERE email = 'user@example.com')
ORDER BY changed_at DESC;
```

## Bulk Upgrades

To upgrade multiple users at once:

```sql
UPDATE profiles
SET is_lifetime = true, updated_at = now()
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
);
```

## Revoking Pro Status

If needed, you can downgrade a user:

```sql
UPDATE profiles
SET is_lifetime = false, updated_at = now()
WHERE email = 'user@example.com';
```

## Security Notes

- Only database admins with Supabase access can modify `is_lifetime`
- The RLS policy prevents users from modifying their own `is_lifetime` status
- All changes are logged in `profile_audit_log`
