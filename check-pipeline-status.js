/**
 * Pipeline Status Diagnostic Tool
 * Run this in browser console to check current pipeline state
 */

window.checkPipelineStatus = async () => {
  console.log('🔍 Checking Pipeline Status...\n');
  
  // Check crash logs
  const crashLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
  console.log(`📋 Crash Logs: ${crashLogs.length} entries`);
  if (crashLogs.length > 0) {
    console.log('   Latest 3 crash logs:');
    crashLogs.slice(-3).forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.substring(0, 200)}...`);
    });
  }
  console.log('');
  
  // Check persistent logs
  const persistentLogs = JSON.parse(localStorage.getItem('crashLogs') || '[]');
  const pdfLogs = persistentLogs.filter(log => 
    typeof log === 'string' && log.includes('[PDF]')
  );
  console.log(`📄 PDF-related logs: ${pdfLogs.length} entries`);
  if (pdfLogs.length > 0) {
    console.log('   Latest PDF logs:');
    pdfLogs.slice(-5).forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.substring(0, 150)}...`);
    });
  }
  console.log('');
  
  // Check IndexedDB for agent outputs
  try {
    const localforage = await import('localforage');
    const keys = await localforage.keys();
    
    console.log('💾 IndexedDB Keys:', keys.length);
    
    // Find file UUIDs
    const fileUUIDs = [...new Set(
      keys
        .filter(k => k.includes('_agent_output_'))
        .map(k => k.split('_agent_output_')[0])
    )];
    
    console.log(`📁 Found ${fileUUIDs.length} file UUID(s):`, fileUUIDs);
    console.log('');
    
    if (fileUUIDs.length > 0) {
      const fileUUID = fileUUIDs[0]; // Use first UUID
      console.log(`🔍 Checking agent outputs for UUID: ${fileUUID}\n`);
      
      const agents = ['discovery', 'assessment', 'strategy', 'cost'];
      
      for (const agentId of agents) {
        const key = `${fileUUID}_agent_output_${agentId}`;
        const output = await localforage.getItem(key);
        
        if (output) {
          console.log(`✅ ${agentId.toUpperCase()} Agent: COMPLETE`);
          if (agentId === 'discovery') {
            console.log(`   - Workloads: ${output.workloads?.length || 0}`);
            console.log(`   - Summary: ${JSON.stringify(output.summary || {})}`);
          }
          if (agentId === 'assessment') {
            console.log(`   - Results: ${output.results?.length || 0}`);
          }
          if (agentId === 'strategy') {
            console.log(`   - Migration Plans: ${output.migrationPlans?.length || 0}`);
          }
          if (agentId === 'cost') {
            console.log(`   - Cost Estimates: ${output.costEstimates?.length || 0}`);
            console.log(`   - Has costEstimates array: ${Array.isArray(output.costEstimates)}`);
            if (output.costEstimates && output.costEstimates.length > 0) {
              console.log(`   - First estimate:`, {
                service: output.costEstimates[0].service,
                hasCostEstimate: !!output.costEstimates[0].costEstimate
              });
            }
          }
        } else {
          console.log(`❌ ${agentId.toUpperCase()} Agent: NOT COMPLETE`);
        }
        console.log('');
      }
      
      // Check pipeline state
      const pipelineStateKey = `${fileUUID}_pipeline_state`;
      const pipelineState = await localforage.getItem(pipelineStateKey);
      if (pipelineState) {
        console.log('📊 Pipeline State:');
        console.log(`   - Output Format: ${pipelineState.outputFormat || 'not set'}`);
        console.log(`   - Pipeline Complete: ${pipelineState.pipelineComplete || false}`);
        console.log(`   - Files Count: ${pipelineState.filesCount || 0}`);
        console.log('');
      }
    }
    
    // Check workload repository
    try {
      const { getContainer } = await import('./src/infrastructure/dependency_injection/Container.js');
      const container = getContainer();
      const workloads = await container.workloadRepository.findAll();
      console.log(`📦 Workload Repository: ${workloads.length} workloads`);
      console.log('');
    } catch (err) {
      console.log('⚠️ Could not check workload repository:', err.message);
      console.log('');
    }
    
  } catch (err) {
    console.error('❌ Error checking IndexedDB:', err);
  }
  
  // Check if PDF generation is in progress
  console.log('🔍 Checking PDF Generation Status...');
  
  // Check for PDF generation indicators in console
  const consoleMessages = [];
  const originalLog = console.log;
  console.log = (...args) => {
    consoleMessages.push(args.join(' '));
    originalLog.apply(console, args);
  };
  
  // Check for PDF-related DOM elements
  const pdfSuccessMessage = document.querySelector('.pdf-success-message');
  if (pdfSuccessMessage) {
    console.log('✅ PDF Success Message found in DOM');
  } else {
    console.log('❌ No PDF success message in DOM');
  }
  
  // Check for processing indicators
  const isProcessingPDF = document.querySelector('[class*="processing"]') || 
                        document.querySelector('[class*="generating"]');
  if (isProcessingPDF) {
    console.log('⏳ PDF generation appears to be in progress');
  }
  
  console.log('\n📋 Recommendations:');
  console.log('1. Check browser console for [PDF] logs');
  console.log('2. Look for errors in crash logs (click "View Crash Logs" button)');
  console.log('3. Verify all 4 agents (Discovery, Assessment, Strategy, Cost) are complete');
  console.log('4. Check if Cost Agent has costEstimates array');
  console.log('5. If stuck, try refreshing and re-running the pipeline');
  
  return {
    crashLogs: crashLogs.length,
    pdfLogs: pdfLogs.length,
    fileUUIDs: fileUUIDs || [],
    agentsComplete: agents || {}
  };
};

console.log('✅ Pipeline status checker loaded!');
console.log('Run: await window.checkPipelineStatus()');
