import prisma from '../src/app/utils/prisma';

/**
 * Populate script to create counselor_client relationships from existing appointments
 * This script finds all unique counselor-client pairs from appointments and creates join table records
 */
async function populateCounselorClients() {
  try {
    console.log('Starting population of counselor_client join table...\n');

    // Find all unique counselor-client pairs from appointments
    // Only include appointments that are not PENDING (confirmed relationships)
    const appointments = await prisma.appointment.findMany({
      where: {
        status: {
          not: 'PENDING',
        },
      },
      select: {
        counselor_id: true,
        client_id: true,
      },
      distinct: ['counselor_id', 'client_id'],
    });

    console.log(
      `Found ${appointments.length} unique counselor-client relationships from appointments\n`,
    );

    if (appointments.length === 0) {
      console.log('✅ No relationships to populate. Database is empty.');
      return;
    }

    // Check how many already exist
    const existingRelationships = await prisma.counselorClient.count();
    console.log(
      `${existingRelationships} relationships already exist in counselor_clients table\n`,
    );

    // Create counselor_client records
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const appointment of appointments) {
      try {
        // Try to create the record (will skip if already exists due to unique constraint)
        await prisma.counselorClient.create({
          data: {
            counselor_id: appointment.counselor_id,
            client_id: appointment.client_id,
          },
        });

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ Created ${successCount} relationships...`);
        }
      } catch (error: any) {
        // If it's a unique constraint error, skip it (already exists)
        if (error.code === 'P2002') {
          skipCount++;
        } else {
          console.error(
            `❌ Failed to create relationship for counselor: ${appointment.counselor_id}, client: ${appointment.client_id}`,
            error,
          );
          failCount++;
        }
      }
    }

    console.log('\n=== Population Summary ===');
    console.log(`Total unique relationships found: ${appointments.length}`);
    console.log(`Successfully created: ${successCount}`);
    console.log(`Already existed (skipped): ${skipCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('==========================\n');

    // Verify final count
    const finalCount = await prisma.counselorClient.count();
    console.log(`Total counselor_client records in database: ${finalCount}\n`);

    if (failCount === 0) {
      console.log('✅ Population completed successfully!');
    } else {
      console.log('⚠️  Population completed with some errors. Check logs above.');
    }
  } catch (error) {
    console.error('❌ Fatal error during population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateCounselorClients()
  .then(() => {
    console.log('\n✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
