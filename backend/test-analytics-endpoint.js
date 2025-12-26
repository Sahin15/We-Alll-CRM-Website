/**
 * Test Analytics Endpoint Integration
 */

import analyticsEngine from './src/services/analyticsEngine.js';

// Test the analytics engine directly
const testAnalyticsEngine = async () => {
  console.log('🧪 Testing Analytics Engine Integration');
  
  try {
    // Test with empty filters
    console.log('📊 Testing with empty filters...');
    const analytics = await analyticsEngine.calculateComprehensiveAnalytics({});
    
    console.log('✅ Analytics calculated successfully');
    console.log('📈 Overall metrics:', analytics.overall);
    console.log('👥 Client analytics count:', analytics.byClient?.length || 0);
    console.log('📋 Project analytics count:', analytics.byProject?.length || 0);
    console.log('👤 Employee analytics count:', analytics.byEmployee?.length || 0);
    console.log('🏢 Department analytics count:', analytics.byDepartment?.length || 0);
    
    // Test cache functionality
    console.log('\n🗄️ Testing cache functionality...');
    const cacheStats = analyticsEngine.getCacheStats();
    console.log('📊 Cache stats:', cacheStats);
    
    // Test with client filter
    console.log('\n🎯 Testing with client filter...');
    const clientFilteredAnalytics = await analyticsEngine.calculateComprehensiveAnalytics({
      client: 'test-client-id'
    });
    
    console.log('✅ Client-filtered analytics calculated');
    console.log('📈 Filtered overall metrics:', clientFilteredAnalytics.overall);
    
    // Test cache invalidation
    console.log('\n🔄 Testing cache invalidation...');
    analyticsEngine.invalidateCache();
    const newCacheStats = analyticsEngine.getCacheStats();
    console.log('📊 Cache stats after invalidation:', newCacheStats);
    
    console.log('\n✅ All analytics engine tests passed!');
    
  } catch (error) {
    console.error('❌ Analytics engine test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the test
testAnalyticsEngine();