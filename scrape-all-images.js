// Script para ejecutar el scraper en todos los productos
// Procesa en batches para evitar timeouts

const BATCH_SIZE = 50; // Productos por batch
const DELAY_BETWEEN_BATCHES = 5000; // 5 segundos entre batches

async function scrapeAllImages() {
  console.log('🚀 Starting image scraping for all products...\n');
  console.log(`Configuration:`);
  console.log(`  - Batch size: ${BATCH_SIZE} products`);
  console.log(`  - Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`  - API endpoint: http://localhost:3000/api/scrape-images\n`);
  console.log('='.repeat(80) + '\n');

  let totalProcessed = 0;
  let totalFound = 0;
  let totalMissing = 0;
  let batchNumber = 1;
  let hasMoreProducts = true;

  while (hasMoreProducts) {
    try {
      console.log(`📦 Batch ${batchNumber}: Processing up to ${BATCH_SIZE} products...`);

      const response = await fetch(`http://localhost:3000/api/scrape-images?limit=${BATCH_SIZE}`);

      if (!response.ok) {
        console.error(`❌ Error: HTTP ${response.status}`);
        break;
      }

      const data = await response.json();

      console.log(`   ✅ Processed: ${data.processed}`);
      console.log(`   ✅ Found: ${data.imagesFound}`);
      console.log(`   ⚠️  Missing: ${data.imagesMissing}`);

      totalProcessed += data.processed;
      totalFound += data.imagesFound;
      totalMissing += data.imagesMissing;

      // Si procesó menos que el límite, significa que no hay más productos sin imagen
      if (data.processed < BATCH_SIZE) {
        console.log(`\n✅ No more products without images!\n`);
        hasMoreProducts = false;
      } else {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        batchNumber++;
      }

    } catch (error) {
      console.error(`❌ Error in batch ${batchNumber}:`, error.message);
      break;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total batches executed: ${batchNumber}`);
  console.log(`Total products processed: ${totalProcessed}`);
  console.log(`Total images found: ${totalFound} (${totalFound > 0 ? Math.round((totalFound / totalProcessed) * 100) : 0}%)`);
  console.log(`Total images missing: ${totalMissing} (${totalMissing > 0 ? Math.round((totalMissing / totalProcessed) * 100) : 0}%)`);
  console.log('='.repeat(80));
  console.log('\n✨ Done!\n');
}

// Ejecutar
scrapeAllImages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
