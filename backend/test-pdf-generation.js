/**
 * Simple PDF Generation Test
 * Tests if PDF generation is working correctly
 */

import exportService from './src/services/exportService.js';
import fs from 'fs';
import path from 'path';

const testPDFGeneration = async () => {
  console.log('🧪 Testing PDF Generation...');
  
  try {
    // Create sample work entries
    const sampleWorkEntries = [
      {
        _id: '1',
        title: 'Test Work Entry 1',
        status: 'in-progress',
        priority: 'high',
        client: { name: 'Test Client A' },
        assignedTo: { name: 'John Doe' },
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completionPercentage: 75,
        timeTracking: { estimatedHours: 40, actualHours: 30 }
      },
      {
        _id: '2',
        title: 'Test Work Entry 2',
        status: 'completed',
        priority: 'medium',
        client: { name: 'Test Client B' },
        assignedTo: { name: 'Jane Smith' },
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completionPercentage: 100,
        timeTracking: { estimatedHours: 20, actualHours: 18 }
      }
    ];

    console.log('📊 Generating PDF with sample data...');
    
    // Generate PDF
    const pdfData = await exportService.generateEnhancedPDF(
      sampleWorkEntries, 
      [], 
      true, 
      { client: 'test' }
    );

    console.log('✅ PDF generated successfully');
    console.log(`📄 PDF size: ${pdfData.length} bytes`);

    // Verify PDF header
    const pdfHeader = pdfData.toString('ascii', 0, 8);
    console.log(`📋 PDF header: ${pdfHeader}`);
    
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Generated data is not a valid PDF file');
    }

    // Save test PDF
    const testDir = './test-exports';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }

    const testFilePath = path.join(testDir, 'test-pdf-generation.pdf');
    fs.writeFileSync(testFilePath, pdfData);
    
    console.log(`💾 Test PDF saved to: ${testFilePath}`);
    console.log('🎉 PDF generation test completed successfully!');
    
    // Try to read the file back
    const readBack = fs.readFileSync(testFilePath);
    console.log(`📖 Read back size: ${readBack.length} bytes`);
    
    if (readBack.length !== pdfData.length) {
      throw new Error('File size mismatch after write/read');
    }
    
    console.log('✅ File integrity verified');

  } catch (error) {
    console.error('❌ PDF generation test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Run the test
testPDFGeneration();