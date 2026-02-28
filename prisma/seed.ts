import { PrismaClient, Role, Gender } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { promisify } from 'util';

const prisma = new PrismaClient();

// Helper function to parse dates from the CSV
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  try {
    // Handle formats like "27-Jan-1991" or "31-Mar-2023 12:52 PM"
    const datePart = dateStr.split(' ')[0]; // Get just the date part
    const parts = datePart.split('-');

    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) {
      return null;
    }

    return new Date(year, month, day);
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return null;
  }
}

// Helper function to generate a unique email for clients without one
function generateUniqueEmail(firstName: string, lastName: string, index: number): string {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client';
  const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  return `${cleanFirst}.${cleanLast}.${index}@placeholder.local`;
}

// Helper function to generate a placeholder phone
function generatePlaceholderPhone(index: number): string {
  return `0400${String(index).padStart(6, '0')}`;
}

async function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }))
      .on('data', (record) => {
        records.push(record);
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function main() {
  console.log('🌱 Starting seed...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Super Admin';

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
  }

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Create/get admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      counselor_settings: {
        create: {
          approved_by_admin: true,
          minimum_slots_per_day: 6,
        },
      },
    },
  });

  console.log('✅ Super Admin created/found:', admin.email);
  console.log('📋 Admin ID (counselor_id):', admin.id);

  // Read and import clients from CSV
  try {
    const csvFilePath = './client_data.csv';
    console.log('\n📖 Reading CSV file:', csvFilePath);

    const records = await readCSV(csvFilePath);
    console.log(`📊 Found ${records.length} records in CSV`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Skip if first_name and last_name are both empty
      if (!record.first_name?.trim() && !record.last_name?.trim()) {
        console.log(`⏭️  Skipping row ${i + 2}: Missing first and last name`);
        skipCount++;
        continue;
      }

      try {
        // Parse date of birth
        const dateOfBirth = parseDate(record.date_of_birth);

        // Skip if no valid date of birth (required field)
        if (!dateOfBirth) {
          console.log(`⏭️  Skipping row ${i + 2} (${record.first_name} ${record.last_name}): Missing or invalid date of birth`);
          skipCount++;
          continue;
        }

        // Handle email - use placeholder if empty
        let email = record.email?.trim();
        if (!email) {
          email = generateUniqueEmail(record.first_name || '', record.last_name || '', i);
          console.log(`⚠️  Row ${i + 2}: Generated placeholder email: ${email}`);
        }

        // Handle phone - use placeholder if empty
        let phone = record.phone?.trim();
        if (!phone) {
          phone = generatePlaceholderPhone(i);
          console.log(`⚠️  Row ${i + 2}: Generated placeholder phone: ${phone}`);
        }

        // Create client
        const client = await prisma.client.create({
          data: {
            first_name: record.first_name?.trim() || 'Unknown',
            last_name: record.last_name?.trim() || 'Unknown',
            email: email,
            phone: phone,
            date_of_birth: dateOfBirth,
            gender: Gender.OTHER, // Default gender since not in CSV
            is_verified: false,
            created_at: parseDate(record.created_at) || new Date(),
          },
        });

        // Create counselor-client relationship
        await prisma.counselorClient.create({
          data: {
            counselor_id: admin.id,
            client_id: client.id,
          },
        });

        successCount++;
        if ((successCount + skipCount + errorCount) % 50 === 0) {
          console.log(`📈 Progress: ${successCount + skipCount + errorCount}/${records.length} processed...`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error processing row ${i + 2} (${record.first_name} ${record.last_name}):`, error.message);
      }
    }

    console.log('\n✅ Client import completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Successfully imported: ${successCount} clients`);
    console.log(`   ⏭️  Skipped: ${skipCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📝 All clients assigned to counselor: ${admin.email}`);

  } catch (error) {
    console.error('❌ Failed to import clients from CSV:', error);
    throw error;
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log(`Super Admin - Email: ${adminEmail}, Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
