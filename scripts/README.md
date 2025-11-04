# Database Scripts

## Backfill Counselor Settings

### Purpose
This script creates default `counselor_settings` entries for existing counselors who don't have settings yet.

### When to Run
Run this script **once** after deploying the counselor settings feature to production. This ensures all existing counselors have the default minimum slots requirement.

### How to Run
```bash
npm run backfill:counselor-settings
```

### What It Does
1. Finds all counselors in the database (role = COUNSELOR, is_deleted = false)
2. Checks which counselors don't have settings
3. Creates default settings (minimum_slots_per_day = 6) for those counselors
4. Prints a summary of what was created

### Example Output
```
Starting backfill of counselor settings...

Found 15 counselors in the database

5 counselors need settings to be created

✅ Created settings for: Dr. John Smith (john@example.com)
✅ Created settings for: Dr. Jane Doe (jane@example.com)
✅ Created settings for: Dr. Bob Wilson (bob@example.com)
✅ Created settings for: Dr. Alice Brown (alice@example.com)
✅ Created settings for: Dr. Charlie Davis (charlie@example.com)

=== Backfill Summary ===
Total counselors: 15
Already had settings: 10
Successfully created: 5
Failed: 0
========================

✅ Backfill completed successfully!

✅ Script finished
```

### Safe to Run Multiple Times
Yes! The script checks which counselors already have settings and only creates settings for those who don't. Running it multiple times won't create duplicates.

### Default Value
All backfilled counselors get `minimum_slots_per_day = 6` (the default value).

You can change this for specific counselors later using the API:
```
PATCH /api/users/counselors/:counselorId/settings
Body: { "minimum_slots_per_day": 10 }
```
