/**
 * Property-Based Test: Export Data Fidelity
 * **Feature: admin-work-management-enhancement, Property 7: Export Data Fidelity**
 * For any export request, the generated file should contain exactly the data 
 * visible in the filtered view with proper formatting
 */

import exportService from './src/services/exportService.js';

// Simple test runner for property-based testing
const runPropertyTest = (testFn, iterations = 100) => {
  for (let i = 0; i < iterations; i++) {
    try {
      testFn();
    } catch (error) {
      console.error(`Property test failed on iteration ${i + 1}: ${error.message}`);
      return false;
    }
  }
  return true;
};

// Generate random work entry
const generateWorkEntry = (id) => {
  const statuses = ['completed', 'in-progress', 'overdue', 'scheduled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const workTypes = ['task', 'meeting', 'review', 'project-work'];
  
  const startDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const dueDate = new Date(startDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
  
  return {
    _id: `entry_${id}`,
    title: `Work Entry ${id}`,
    assignedTo: { 
      name: `User ${Math.floor(Math.random() * 10) + 1}`,
      email: `user${id}@example.com`
    },
    client: { 
      name: `Client ${Math.floor(Math.random() * 5) + 1}`,
      company: `Company ${Math.floor(Math.random() * 5) + 1}`
    },
    project: { 
      name: `Project ${Math.floor(Math.random() * 3) + 1}`,
      status: 'active'
    },
    department: { 
      name: `Department ${Math.floor(Math.random() * 3) + 1}`
    },
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    workType: workTypes[Math.floor(Math.random() * workTypes.length)],
    startDate,
    dueDate,
    endDate: new Date(dueDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    timeTracking: {
      estimatedHours: Math.floor(Math.random() * 8) + 1,
      actualHours: Math.floor(Math.random() * 10) + 1
    },
    progress: Math.floor(Math.random() * 101),
    isOverdue: Math.random() > 0.7,
    daysUntilDue: Math.floor(Math.random() * 30) - 15,
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  };
};

/**
 * Test CSV export data fidelity
 */
const testCSVExportFidelity = async () => {
  // Generate random work entries
  const entryCount = Math.floor(Math.random() * 20) + 5; // 5-25 entries
  const workEntries = Array.from({ length: entryCount }, (_, i) => generateWorkEntry(i));
  
  // Test with different column configurations
  const testColumns = [
    [], // Default columns
    ['title', 'assignedTo.name', 'status'], // Minimal columns
    ['title', 'assignedTo.name', 'client.name', 'project.name', 'status', 'priority', 'startDate', 'dueDate'] // Custom columns
  ];
  
  for (const columns of testColumns) {
    // Generate CSV export
    const csvData = await exportService.generateEnhancedCSV(workEntries, columns, true);
    const csvContent = csvData.toString();
    
    // Verify CSV structure
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Should have header + data rows + analytics (if included)
    const expectedMinLines = 1 + workEntries.length; // Header + data rows
    if (lines.length < expectedMinLines) {
      throw new Error(`CSV should have at least ${expectedMinLines} lines, got ${lines.length}`);
    }
    
    // Verify header row exists
    const headerLine = lines[0];
    if (!headerLine || headerLine.trim() === '') {
      throw new Error('CSV header row is missing or empty');
    }
    
    // Verify data rows count
    const dataLines = lines.slice(1).filter(line => !line.includes('ANALYTICS SUMMARY'));
    const analyticsStartIndex = lines.findIndex(line => line.includes('ANALYTICS SUMMARY'));
    const actualDataLines = analyticsStartIndex > 0 ? analyticsStartIndex - 1 : dataLines.length;
    
    if (actualDataLines !== workEntries.length) {
      throw new Error(`Expected ${workEntries.length} data rows, got ${actualDataLines}`);
    }
    
    // Verify each work entry is represented
    const headerColumns = headerLine.split(',').map(col => col.replace(/"/g, '').trim());
    
    for (let i = 0; i < workEntries.length; i++) {
      const entry = workEntries[i];
      const dataLine = lines[i + 1]; // +1 for header
      
      if (!dataLine || dataLine.trim() === '') {
        throw new Error(`Data row ${i + 1} is missing or empty`);
      }
      
      const dataValues = dataLine.split(',').map(val => val.replace(/"/g, '').trim());
      
      // Verify row has correct number of columns
      if (dataValues.length !== headerColumns.length) {
        throw new Error(`Row ${i + 1} has ${dataValues.length} columns, expected ${headerColumns.length}`);
      }
      
      // Verify key data is present (title should always be included)
      const titleColumnIndex = headerColumns.findIndex(col => 
        col.toLowerCase().includes('title') || col.toLowerCase().includes('work title')
      );
      
      if (titleColumnIndex >= 0) {
        const titleValue = dataValues[titleColumnIndex];
        if (!titleValue || titleValue === '') {
          throw new Error(`Row ${i + 1} missing title value`);
        }
        
        // Title should match the original entry
        if (!titleValue.includes(entry.title) && !entry.title.includes(titleValue)) {
          throw new Error(`Row ${i + 1} title mismatch: expected "${entry.title}", got "${titleValue}"`);
        }
      }
    }
    
    // Verify analytics section if included
    if (csvContent.includes('ANALYTICS SUMMARY')) {
      const analyticsSection = csvContent.substring(csvContent.indexOf('ANALYTICS SUMMARY'));
      
      // Should contain key metrics
      const requiredMetrics = ['Total Work Entries', 'Completed Work', 'Completion Rate'];
      for (const metric of requiredMetrics) {
        if (!analyticsSection.includes(metric)) {
          throw new Error(`Analytics section missing required metric: ${metric}`);
        }
      }
      
      // Verify total work entries matches actual count
      const totalWorkMatch = analyticsSection.match(/Total Work Entries,(\d+)/);
      if (totalWorkMatch) {
        const reportedTotal = parseInt(totalWorkMatch[1]);
        if (reportedTotal !== workEntries.length) {
          throw new Error(`Analytics reports ${reportedTotal} entries, actual count is ${workEntries.length}`);
        }
      }
    }
  }
  
  return true;
};

/**
 * Test Excel export data fidelity
 */
const testExcelExportFidelity = async () => {
  // Generate random work entries
  const entryCount = Math.floor(Math.random() * 15) + 3; // 3-18 entries
  const workEntries = Array.from({ length: entryCount }, (_, i) => generateWorkEntry(i));
  
  const filters = {
    client: 'test-client',
    status: 'in-progress',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  };
  
  // Generate Excel export
  const excelData = await exportService.generateEnhancedExcel(workEntries, [], true, filters);
  const excelContent = excelData.toString();
  
  // Verify Excel metadata is included
  if (!excelContent.includes('Excel Export Generated:')) {
    throw new Error('Excel export missing generation timestamp');
  }
  
  if (!excelContent.includes('Filters Applied:')) {
    throw new Error('Excel export missing filter information');
  }
  
  if (!excelContent.includes(`Total Records: ${workEntries.length}`)) {
    throw new Error('Excel export missing or incorrect record count');
  }
  
  // Verify filter information is preserved
  const filterString = JSON.stringify(filters);
  if (!excelContent.includes(filterString)) {
    throw new Error('Excel export missing applied filter details');
  }
  
  // Verify data section exists (should contain CSV data)
  const lines = excelContent.split('\n');
  const dataStartIndex = lines.findIndex(line => !line.startsWith('#'));
  
  if (dataStartIndex === -1) {
    throw new Error('Excel export missing data section');
  }
  
  const dataLines = lines.slice(dataStartIndex).filter(line => line.trim());
  
  // Should have header + data rows
  if (dataLines.length < workEntries.length + 1) {
    throw new Error(`Excel data section should have at least ${workEntries.length + 1} lines`);
  }
  
  return true;
};

/**
 * Test PDF export data fidelity
 */
const testPDFExportFidelity = async () => {
  // Generate random work entries
  const entryCount = Math.floor(Math.random() * 10) + 2; // 2-12 entries
  const workEntries = Array.from({ length: entryCount }, (_, i) => generateWorkEntry(i));
  
  const filters = {
    department: 'Engineering',
    priority: 'high'
  };
  
  // Generate PDF export
  const pdfData = await exportService.generateEnhancedPDF(workEntries, [], true, filters);
  
  // Verify PDF data is generated
  if (!pdfData || pdfData.length === 0) {
    throw new Error('PDF export generated empty data');
  }
  
  // Verify PDF header (should start with PDF magic number)
  const pdfHeader = pdfData.toString('ascii', 0, 8);
  if (!pdfHeader.startsWith('%PDF-')) {
    throw new Error('Generated data is not a valid PDF file');
  }
  
  // Verify PDF size is reasonable (should be at least 1KB for any real content)
  if (pdfData.length < 1024) {
    throw new Error(`PDF file too small: ${pdfData.length} bytes`);
  }
  
  // For more entries, PDF should be larger
  if (workEntries.length > 5 && pdfData.length < 2048) {
    throw new Error(`PDF file too small for ${workEntries.length} entries: ${pdfData.length} bytes`);
  }
  
  return true;
};

/**
 * Test export consistency across formats
 */
const testExportConsistency = async () => {
  // Generate consistent test data
  const workEntries = Array.from({ length: 5 }, (_, i) => generateWorkEntry(i));
  const columns = ['title', 'assignedTo.name', 'status', 'priority'];
  
  // Generate exports in all formats
  const csvData = await exportService.generateEnhancedCSV(workEntries, columns, false);
  const excelData = await exportService.generateEnhancedExcel(workEntries, columns, false, {});
  const pdfData = await exportService.generateEnhancedPDF(workEntries, columns, false, {});
  
  // Verify all formats generated data
  if (!csvData || csvData.length === 0) {
    throw new Error('CSV export failed to generate data');
  }
  
  if (!excelData || excelData.length === 0) {
    throw new Error('Excel export failed to generate data');
  }
  
  if (!pdfData || pdfData.length === 0) {
    throw new Error('PDF export failed to generate data');
  }
  
  // Verify CSV and Excel contain same core data (Excel includes CSV data)
  const csvContent = csvData.toString();
  const excelContent = excelData.toString();
  
  const csvLines = csvContent.split('\n').filter(line => line.trim());
  const excelDataLines = excelContent.split('\n').filter(line => !line.startsWith('#') && line.trim());
  
  // Excel should contain the same number of data lines as CSV
  if (csvLines.length !== excelDataLines.length) {
    throw new Error(`CSV has ${csvLines.length} lines, Excel has ${excelDataLines.length} data lines`);
  }
  
  // Verify each work entry appears in both CSV and Excel
  for (const entry of workEntries) {
    const titleInCSV = csvContent.includes(entry.title);
    const titleInExcel = excelContent.includes(entry.title);
    
    if (!titleInCSV) {
      throw new Error(`Work entry "${entry.title}" missing from CSV export`);
    }
    
    if (!titleInExcel) {
      throw new Error(`Work entry "${entry.title}" missing from Excel export`);
    }
  }
  
  return true;
};

/**
 * Main property test: Export Data Fidelity
 */
const testExportDataFidelity = async () => {
  // Test CSV fidelity
  await testCSVExportFidelity();
  
  // Test Excel fidelity
  await testExcelExportFidelity();
  
  // Test PDF fidelity
  await testPDFExportFidelity();
  
  // Test consistency across formats
  await testExportConsistency();
  
  return true;
};

// Run the property-based test
const runExportFidelityTest = async () => {
  console.log('🧪 Running Property-Based Test: Export Data Fidelity');
  console.log('📊 Feature: admin-work-management-enhancement, Property 7');
  console.log('🔄 Running 50 iterations...\n');

  const startTime = Date.now();
  
  try {
    let passedIterations = 0;
    
    for (let i = 0; i < 50; i++) {
      try {
        await testExportDataFidelity();
        passedIterations++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Completed ${i + 1}/50 iterations`);
        }
      } catch (error) {
        console.error(`❌ Iteration ${i + 1} failed: ${error.message}`);
        throw error;
      }
    }
    
    const endTime = Date.now();
    
    console.log('\n✅ PASS: Export Data Fidelity test passed');
    console.log(`⏱️  Completed 50 iterations in ${endTime - startTime}ms`);
    console.log('📄 All export formats maintain data fidelity');
    console.log('🔄 Export consistency verified across formats');
    console.log('📊 Analytics integration working correctly');
    
  } catch (error) {
    console.log('\n❌ FAIL: Export Data Fidelity test failed');
    console.error('Error:', error.message);
    process.exit(1);
  }
};

// Run the test
runExportFidelityTest();