/**
 * Test Enhanced Export Service
 */

import exportService from './src/services/exportService.js';
import fs from 'fs';
import path from 'path';

// Mock work entries for testing
const generateMockWorkEntries = (count = 10) => {
  const statuses = ['completed', 'in-progress', 'overdue', 'scheduled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const workTypes = ['task', 'meeting', 'review', 'project-work'];
  
  return Array.from({ length: count }, (_, i) => ({
    _id: `entry_${i}`,
    title: `Work Entry ${i + 1}`,
    assignedTo: { name: `User ${i + 1}` },
    client: { name: `Client ${(i % 3) + 1}` },
    project: { name: `Project ${(i % 2) + 1}` },
    department: { name: `Department ${(i % 2) + 1}` },
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    workType: workTypes[i % workTypes.length],
    startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    timeTracking: {
      estimatedHours: Math.floor(Math.random() * 8) + 1,
      actualHours: Math.floor(Math.random() * 10) + 1
    },
    progress: Math.floor(Math.random() * 101),
    isOverdue: Math.random() > 0.7,
    daysUntilDue: Math.floor(Math.random() * 30) - 15
  }));
};

const testExportService = async () => {
  console.log('🧪 Testing Enhanced Export Service');
  
  try {
    // Test 1: CSV Export
    console.log('\n📊 Testing CSV Export...');
    const mockEntries = generateMockWorkEntries(5);
    const csvData = await exportService.generateEnhancedCSV(mockEntries, [], true);
    
    console.log('✅ CSV export generated successfully');
    console.log(`📄 CSV size: ${csvData.length} bytes`);
    console.log('📝 CSV preview (first 200 chars):');
    console.log(csvData.toString().substring(0, 200) + '...');
    
    // Test 2: Excel Export
    console.log('\n📊 Testing Excel Export...');
    const excelData = await exportService.generateEnhancedExcel(mockEntries, [], true, { client: 'test' });
    
    console.log('✅ Excel export generated successfully');
    console.log(`📄 Excel size: ${excelData.length} bytes`);
    
    // Test 3: PDF Export
    console.log('\n📊 Testing PDF Export...');
    const pdfData = await exportService.generateEnhancedPDF(mockEntries, [], true, { client: 'test' });
    
    console.log('✅ PDF export generated successfully');
    console.log(`📄 PDF size: ${pdfData.length} bytes`);
    
    // Test 4: Job Creation and Processing
    console.log('\n🔄 Testing Job Queue...');
    const jobId = await exportService.createExportJob({
      format: 'csv',
      workEntries: mockEntries,
      columns: [],
      includeAnalytics: true,
      filters: { test: true }
    });
    
    console.log(`✅ Job created with ID: ${jobId}`);
    
    // Wait a bit for job processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobStatus = exportService.getJobStatus(jobId);
    console.log(`📊 Job status: ${jobStatus?.status} (${jobStatus?.progress}%)`);
    
    // Test 5: Job Management
    console.log('\n📋 Testing Job Management...');
    const allJobs = exportService.getAllJobs();
    console.log(`📊 Total jobs: ${allJobs.length}`);
    
    allJobs.forEach(job => {
      console.log(`  - Job ${job.id}: ${job.status} (${job.progress}%)`);
    });
    
    // Test 6: File Operations
    console.log('\n📁 Testing File Operations...');
    
    // Save test files
    const testDir = path.join(process.cwd(), 'test-exports');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(testDir, 'test-export.csv'), csvData);
    fs.writeFileSync(path.join(testDir, 'test-export.xlsx'), excelData);
    fs.writeFileSync(path.join(testDir, 'test-export.pdf'), pdfData);
    
    console.log('✅ Test files saved successfully');
    console.log(`📁 Files saved to: ${testDir}`);
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 All export service tests passed!');
    
  } catch (error) {
    console.error('❌ Export service test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the test
testExportService();