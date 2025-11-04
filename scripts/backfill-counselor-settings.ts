import prisma from '../src/app/utils/prisma';
import { Role } from '@prisma/client';

/**
 * Backfill script to create counselor_settings for existing counselors
 * This script finds all counselors who don't have settings and creates default settings for them
 */
async function backfillCounselorSettings() {
  try {
    console.log('Starting backfill of counselor settings...\n');

    // Find all counselors
    const counselors = await prisma.user.findMany({
      where: {
        role: Role.COUNSELOR,
        is_deleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        counselor_settings: true,
      },
    });

    console.log(`Found ${counselors.length} counselors in the database\n`);

    // Filter counselors who don't have settings
    const counselorsWithoutSettings = counselors.filter(
      (counselor) => !counselor.counselor_settings,
    );

    console.log(
      `${counselorsWithoutSettings.length} counselors need settings to be created\n`,
    );

    if (counselorsWithoutSettings.length === 0) {
      console.log('✅ All counselors already have settings. Nothing to do.');
      return;
    }

    // Create settings for counselors who don't have them
    let successCount = 0;
    let failCount = 0;

    for (const counselor of counselorsWithoutSettings) {
      try {
        await prisma.counselorSettings.create({
          data: {
            counselor_id: counselor.id,
            minimum_slots_per_day: 6, // Default value
          },
        });

        console.log(
          `✅ Created settings for: ${counselor.name} (${counselor.email})`,
        );
        successCount++;
      } catch (error) {
        console.error(
          `❌ Failed to create settings for: ${counselor.name} (${counselor.email})`,
          error,
        );
        failCount++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total counselors: ${counselors.length}`);
    console.log(
      `Already had settings: ${counselors.length - counselorsWithoutSettings.length}`,
    );
    console.log(`Successfully created: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('========================\n');

    if (failCount === 0) {
      console.log('✅ Backfill completed successfully!');
    } else {
      console.log('⚠️  Backfill completed with some errors. Check logs above.');
    }
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillCounselorSettings()
  .then(() => {
    console.log('\n✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
