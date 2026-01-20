# Data Migration: Old Supabase → New Supabase

**Old Project:** `yndcawdtkpqulpzxkwif`
**New Project:** `uprkqfygjhxudhdpqhju`

## Migration Status: ✅ COMPLETED (Jan 19, 2026)

### Data Migrated:
| Table | Count |
|-------|-------|
| templates | 172 |
| workflow_documentation | 171 |
| admin_users | 6 |
| workflow_snapshots | 0 (empty in source) |

### Storage Migrated:
| Bucket | Files |
|--------|-------|
| templates | 33 files |
| template-previews | 15 files |

### Scripts Used:
- `migrate.sh` - Export data from old Supabase
- `import.sh` - Import data to new Supabase
- `import_admin.sh` - Import admin users
- `migrate_storage.sh` - Migrate storage buckets

---

## Step 1: Export Data from OLD Supabase

Go to OLD Supabase → SQL Editor: https://supabase.com/dashboard/project/yndcawdtkpqulpzxkwif/sql/new

Run each query below and **copy the JSON results**.

### 1.1 Export Profiles

```sql
SELECT json_agg(row_to_json(p))
FROM (
  SELECT
    id,
    email,
    full_name,
    is_lifetime,
    is_insiders,
    stripe_customer_id,
    subscription_status,
    subscription_id,
    subscription_end_date,
    usage_count,
    created_at,
    updated_at
  FROM profiles
) p;
```

### 1.2 Export Conversations

```sql
SELECT json_agg(row_to_json(c))
FROM (
  SELECT * FROM conversations
) c;
```

### 1.3 Export Messages

```sql
SELECT json_agg(row_to_json(m))
FROM (
  SELECT * FROM messages
) m;
```

### 1.4 Export Workflow Snapshots

```sql
SELECT json_agg(row_to_json(w))
FROM (
  SELECT * FROM workflow_snapshots
) w;
```

### 1.5 Export Templates

```sql
SELECT json_agg(row_to_json(t))
FROM (
  SELECT * FROM templates
) t;
```

### 1.6 Export Workflow Documentation

```sql
SELECT json_agg(row_to_json(d))
FROM (
  SELECT * FROM workflow_documentation
) d;
```

### 1.7 Export Admin Users

```sql
SELECT json_agg(row_to_json(a))
FROM (
  SELECT * FROM admin_users
) a;
```

---

## Step 2: Import Data to NEW Supabase

Go to NEW Supabase → SQL Editor: https://supabase.com/dashboard/project/uprkqfygjhxudhdpqhju/sql/new

### 2.1 Import Profiles

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.1:

```sql
-- Disable triggers temporarily
ALTER TABLE profiles DISABLE TRIGGER ALL;

INSERT INTO profiles (
  id, email, full_name, is_lifetime, is_insiders,
  stripe_customer_id, subscription_status, subscription_id,
  subscription_end_date, usage_count, created_at, updated_at
)
SELECT
  (j->>'id')::uuid,
  j->>'email',
  j->>'full_name',
  (j->>'is_lifetime')::boolean,
  (j->>'is_insiders')::boolean,
  j->>'stripe_customer_id',
  j->>'subscription_status',
  j->>'subscription_id',
  (j->>'subscription_end_date')::timestamptz,
  (j->>'usage_count')::integer,
  (j->>'created_at')::timestamptz,
  (j->>'updated_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_lifetime = EXCLUDED.is_lifetime,
  is_insiders = EXCLUDED.is_insiders,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  subscription_status = EXCLUDED.subscription_status,
  subscription_id = EXCLUDED.subscription_id,
  subscription_end_date = EXCLUDED.subscription_end_date,
  usage_count = EXCLUDED.usage_count,
  updated_at = EXCLUDED.updated_at;

-- Re-enable triggers
ALTER TABLE profiles ENABLE TRIGGER ALL;
```

### 2.2 Import Conversations

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.2:

```sql
INSERT INTO conversations (id, user_id, title, created_at, updated_at)
SELECT
  (j->>'id')::uuid,
  (j->>'user_id')::uuid,
  j->>'title',
  (j->>'created_at')::timestamptz,
  (j->>'updated_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO NOTHING;
```

### 2.3 Import Messages

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.3:

```sql
INSERT INTO messages (id, conversation_id, user_id, role, content, metadata, created_at)
SELECT
  (j->>'id')::uuid,
  (j->>'conversation_id')::uuid,
  (j->>'user_id')::uuid,
  j->>'role',
  j->>'content',
  (j->>'metadata')::jsonb,
  (j->>'created_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO NOTHING;
```

### 2.4 Import Workflow Snapshots

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.4:

```sql
INSERT INTO workflow_snapshots (id, user_id, n8n_workflow_id, workflow_json, created_at)
SELECT
  (j->>'id')::uuid,
  (j->>'user_id')::uuid,
  j->>'n8n_workflow_id',
  (j->>'workflow_json')::jsonb,
  (j->>'created_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO NOTHING;
```

### 2.5 Import Templates

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.5:

```sql
INSERT INTO templates (
  id, name, description, category, subcategory, tags,
  workflow_json, node_count, is_premium, is_featured,
  preview_image_url, download_count, created_at, updated_at
)
SELECT
  (j->>'id')::uuid,
  j->>'name',
  j->>'description',
  j->>'category',
  j->>'subcategory',
  CASE WHEN j->>'tags' IS NOT NULL THEN ARRAY(SELECT json_array_elements_text((j->>'tags')::json)) ELSE NULL END,
  (j->>'workflow_json')::jsonb,
  (j->>'node_count')::integer,
  (j->>'is_premium')::boolean,
  (j->>'is_featured')::boolean,
  j->>'preview_image_url',
  (j->>'download_count')::integer,
  (j->>'created_at')::timestamptz,
  (j->>'updated_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  tags = EXCLUDED.tags,
  workflow_json = EXCLUDED.workflow_json,
  node_count = EXCLUDED.node_count,
  is_premium = EXCLUDED.is_premium,
  is_featured = EXCLUDED.is_featured,
  preview_image_url = EXCLUDED.preview_image_url,
  download_count = EXCLUDED.download_count,
  updated_at = EXCLUDED.updated_at;
```

### 2.6 Import Workflow Documentation

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.6:

```sql
INSERT INTO workflow_documentation (id, template_id, content, generated_at, updated_at)
SELECT
  (j->>'id')::uuid,
  (j->>'template_id')::uuid,
  j->>'content',
  (j->>'generated_at')::timestamptz,
  (j->>'updated_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = EXCLUDED.updated_at;
```

### 2.7 Import Admin Users

Replace `YOUR_JSON_DATA_HERE` with the JSON from Step 1.7:

```sql
INSERT INTO admin_users (id, auth_user_id, email, role, name, created_at)
SELECT
  (j->>'id')::uuid,
  (j->>'auth_user_id')::uuid,
  j->>'email',
  j->>'role',
  j->>'name',
  (j->>'created_at')::timestamptz
FROM json_array_elements('YOUR_JSON_DATA_HERE'::json) AS j
ON CONFLICT (id) DO NOTHING;
```

---

## Step 3: Migrate Auth Users

**IMPORTANT:** User authentication data (passwords, etc.) is stored in `auth.users` which is managed by Supabase Auth. You have two options:

### Option A: Users re-register (Recommended for small user base)
- Existing users will need to sign up again or use "Forgot Password"
- Their profiles will be linked when they use the same email

### Option B: Contact Supabase Support
- For large migrations, Supabase can help migrate auth.users between projects
- Contact them via support ticket

---

## Step 4: Migrate Storage Buckets

For storage files (template JSON files, preview images):

1. Go to OLD Supabase → Storage
2. Download all files from each bucket
3. Go to NEW Supabase → Storage
4. Create the same buckets (`templates`, `template-previews`)
5. Upload the files

---

## Verification

After migration, run these queries in the NEW Supabase to verify:

```sql
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'workflow_snapshots', COUNT(*) FROM workflow_snapshots
UNION ALL
SELECT 'templates', COUNT(*) FROM templates
UNION ALL
SELECT 'workflow_documentation', COUNT(*) FROM workflow_documentation
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users;
```

Compare counts with the old database to ensure all data was migrated.
