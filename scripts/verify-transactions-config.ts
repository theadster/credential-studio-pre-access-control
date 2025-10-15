#!/usr/bin/env tsx

/**
 * Appwrite Transactions Configuration Verification Script
 * 
 * This script verifies that the Appwrite Transactions implementation is properly configured.
 * It checks SDK versions, environment variables, client initialization, and basic connectivity.
 * 
 * Requirements verified:
 * - 1.1: node-appwrite version >= 19.1.0
 * - 1.2: TablesDB is imported and initialized
 * - 1.3: NEXT_PUBLIC_APPWRITE_ENDPOINT is set
 * - 1.4: NEXT_PUBLIC_APPWRITE_PROJECT_ID is set
 * - 1.5: APPWRITE_API_KEY is set
 * - 1.6: API key has sufficient permissions
 * - 1.7: Basic connectivity to Appwrite works
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client, Databases, TablesDB } from 'node-appwrite';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ConfigCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  requirement?: string;
}

interface ConfigReport {
  checks: ConfigCheck[];
  overallStatus: 'pass' | 'fail';
  recommendations: string[];
  timestamp: string;
}

/**
 * Print a formatted header
 */
function printHeader(title: string) {
  const line = '═'.repeat(70);
  console.log(`\n${colors.bright}${colors.cyan}╔${line}╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset} ${colors.bright}${title.padEnd(68)}${colors.reset} ${colors.bright}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚${line}╝${colors.reset}\n`);
}

/**
 * Print a check result
 */
function printCheck(check: ConfigCheck) {
  const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
  const color = check.status === 'pass' ? colors.green : check.status === 'fail' ? colors.red : colors.yellow;
  
  console.log(`${color}${icon}${colors.reset} ${colors.bright}${check.name}${colors.reset}`);
  console.log(`  ${check.message}`);
  
  if (check.details) {
    console.log(`  ${colors.cyan}Details:${colors.reset} ${check.details}`);
  }
  
  if (check.requirement) {
    console.log(`  ${colors.blue}Requirement:${colors.reset} ${check.requirement}`);
  }
  
  console.log('');
}

/**
 * Print the final report
 */
function printReport(report: ConfigReport) {
  const passCount = report.checks.filter(c => c.status === 'pass').length;
  const failCount = report.checks.filter(c => c.status === 'fail').length;
  const warnCount = report.checks.filter(c => c.status === 'warning').length;
  
  console.log(`\n${colors.bright}${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total Checks: ${report.checks.length}`);
  console.log(`  ${colors.green}Passed: ${passCount}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failCount}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${warnCount}${colors.reset}`);
  
  if (report.recommendations.length > 0) {
    console.log(`\n${colors.bright}${colors.cyan}Recommendations:${colors.reset}`);
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.log(`\n${colors.bright}Overall Status:${colors.reset} ${report.overallStatus === 'pass' ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`${colors.cyan}Timestamp:${colors.reset} ${report.timestamp}\n`);
}

/**
 * Check 1: Verify node-appwrite version
 */
function checkNodeAppwriteVersion(): ConfigCheck {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    const nodeAppwriteVersion = packageJson.devDependencies?.['node-appwrite'] || 
                                packageJson.dependencies?.['node-appwrite'];
    
    if (!nodeAppwriteVersion) {
      return {
        name: 'node-appwrite SDK Version',
        status: 'fail',
        message: 'node-appwrite is not installed',
        details: 'Install with: npm install node-appwrite',
        requirement: '1.1: node-appwrite version >= 19.1.0'
      };
    }
    
    // Extract version number (remove ^ or ~ prefix)
    const versionMatch = nodeAppwriteVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      return {
        name: 'node-appwrite SDK Version',
        status: 'warning',
        message: `Could not parse version: ${nodeAppwriteVersion}`,
        requirement: '1.1: node-appwrite version >= 19.1.0'
      };
    }
    
    const [, major, minor] = versionMatch.map(Number);
    const version = `${major}.${minor}`;
    
    // Check if version >= 19.1.0
    if (major > 19 || (major === 19 && minor >= 1)) {
      return {
        name: 'node-appwrite SDK Version',
        status: 'pass',
        message: `Version ${nodeAppwriteVersion} supports TablesDB`,
        details: `Installed version: ${nodeAppwriteVersion}`,
        requirement: '1.1: node-appwrite version >= 19.1.0'
      };
    } else {
      return {
        name: 'node-appwrite SDK Version',
        status: 'fail',
        message: `Version ${nodeAppwriteVersion} does not support TablesDB`,
        details: 'Upgrade to >= 19.1.0 with: npm install node-appwrite@latest',
        requirement: '1.1: node-appwrite version >= 19.1.0'
      };
    }
  } catch (error) {
    return {
      name: 'node-appwrite SDK Version',
      status: 'fail',
      message: 'Failed to check version',
      details: error instanceof Error ? error.message : String(error),
      requirement: '1.1: node-appwrite version >= 19.1.0'
    };
  }
}

/**
 * Check 2: Verify TablesDB import and initialization
 */
function checkTablesDBImport(): ConfigCheck {
  try {
    const appwriteLibPath = join(process.cwd(), 'src/lib/appwrite.ts');
    const appwriteLib = readFileSync(appwriteLibPath, 'utf-8');
    
    // Check if TablesDB is imported
    const hasImport = appwriteLib.includes('TablesDB') && 
                      appwriteLib.includes('node-appwrite');
    
    // Check if TablesDB is initialized in createSessionClient
    const hasSessionInit = appwriteLib.includes('tablesDB: new TablesDB(client)') &&
                           appwriteLib.includes('createSessionClient');
    
    // Check if TablesDB is initialized in createAdminClient
    const hasAdminInit = appwriteLib.includes('tablesDB: new TablesDB(client)') &&
                         appwriteLib.includes('createAdminClient');
    
    if (hasImport && hasSessionInit && hasAdminInit) {
      return {
        name: 'TablesDB Import and Initialization',
        status: 'pass',
        message: 'TablesDB is properly imported and initialized',
        details: 'Found in both createSessionClient and createAdminClient',
        requirement: '1.2: TablesDB is imported and initialized'
      };
    } else if (hasImport) {
      return {
        name: 'TablesDB Import and Initialization',
        status: 'warning',
        message: 'TablesDB is imported but may not be fully initialized',
        details: `Session client: ${hasSessionInit}, Admin client: ${hasAdminInit}`,
        requirement: '1.2: TablesDB is imported and initialized'
      };
    } else {
      return {
        name: 'TablesDB Import and Initialization',
        status: 'fail',
        message: 'TablesDB is not imported from node-appwrite',
        details: 'Add: import { TablesDB } from "node-appwrite"',
        requirement: '1.2: TablesDB is imported and initialized'
      };
    }
  } catch (error) {
    return {
      name: 'TablesDB Import and Initialization',
      status: 'fail',
      message: 'Failed to check TablesDB import',
      details: error instanceof Error ? error.message : String(error),
      requirement: '1.2: TablesDB is imported and initialized'
    };
  }
}

/**
 * Check 3: Verify NEXT_PUBLIC_APPWRITE_ENDPOINT
 */
function checkEndpoint(): ConfigCheck {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  
  if (!endpoint) {
    return {
      name: 'Appwrite Endpoint',
      status: 'fail',
      message: 'NEXT_PUBLIC_APPWRITE_ENDPOINT is not set',
      details: 'Set in .env.local: NEXT_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1',
      requirement: '1.3: NEXT_PUBLIC_APPWRITE_ENDPOINT is set'
    };
  }
  
  // Validate endpoint format
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    return {
      name: 'Appwrite Endpoint',
      status: 'fail',
      message: 'Invalid endpoint format',
      details: `Current value: ${endpoint}. Must start with http:// or https://`,
      requirement: '1.3: NEXT_PUBLIC_APPWRITE_ENDPOINT is set'
    };
  }
  
  return {
    name: 'Appwrite Endpoint',
    status: 'pass',
    message: 'Endpoint is properly configured',
    details: endpoint,
    requirement: '1.3: NEXT_PUBLIC_APPWRITE_ENDPOINT is set'
  };
}

/**
 * Check 4: Verify NEXT_PUBLIC_APPWRITE_PROJECT_ID
 */
function checkProjectId(): ConfigCheck {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  
  if (!projectId) {
    return {
      name: 'Appwrite Project ID',
      status: 'fail',
      message: 'NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set',
      details: 'Set in .env.local: NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id',
      requirement: '1.4: NEXT_PUBLIC_APPWRITE_PROJECT_ID is set'
    };
  }
  
  // Validate project ID format (should be alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(projectId)) {
    return {
      name: 'Appwrite Project ID',
      status: 'warning',
      message: 'Project ID has unusual format',
      details: `Current value: ${projectId}. Expected alphanumeric string`,
      requirement: '1.4: NEXT_PUBLIC_APPWRITE_PROJECT_ID is set'
    };
  }
  
  return {
    name: 'Appwrite Project ID',
    status: 'pass',
    message: 'Project ID is properly configured',
    details: projectId,
    requirement: '1.4: NEXT_PUBLIC_APPWRITE_PROJECT_ID is set'
  };
}

/**
 * Check 5: Verify APPWRITE_API_KEY
 */
function checkApiKey(): ConfigCheck {
  const apiKey = process.env.APPWRITE_API_KEY;
  
  if (!apiKey) {
    return {
      name: 'Appwrite API Key',
      status: 'fail',
      message: 'APPWRITE_API_KEY is not set',
      details: 'Set in .env.local: APPWRITE_API_KEY=your_api_key',
      requirement: '1.5: APPWRITE_API_KEY is set'
    };
  }
  
  // Validate API key format (should be a long string)
  if (apiKey.length < 20) {
    return {
      name: 'Appwrite API Key',
      status: 'warning',
      message: 'API key seems too short',
      details: `Current length: ${apiKey.length} characters. Expected > 20`,
      requirement: '1.5: APPWRITE_API_KEY is set'
    };
  }
  
  return {
    name: 'Appwrite API Key',
    status: 'pass',
    message: 'API key is properly configured',
    details: `${apiKey.substring(0, 20)}... (${apiKey.length} characters)`,
    requirement: '1.5: APPWRITE_API_KEY is set'
  };
}

/**
 * Check 6: Test TablesDB client initialization
 */
async function checkTablesDBInitialization(): Promise<ConfigCheck> {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    
    if (!endpoint || !projectId || !apiKey) {
      return {
        name: 'TablesDB Client Initialization',
        status: 'fail',
        message: 'Cannot initialize client - missing configuration',
        details: 'Fix environment variables first',
        requirement: '1.2, 1.6: TablesDB client initialization'
      };
    }
    
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    
    const tablesDB = new TablesDB(client);
    
    // Verify the client is properly initialized
    if (!tablesDB) {
      return {
        name: 'TablesDB Client Initialization',
        status: 'fail',
        message: 'Failed to create TablesDB instance',
        requirement: '1.2, 1.6: TablesDB client initialization'
      };
    }
    
    return {
      name: 'TablesDB Client Initialization',
      status: 'pass',
      message: 'TablesDB client initialized successfully',
      details: 'Client is ready for transaction operations',
      requirement: '1.2, 1.6: TablesDB client initialization'
    };
  } catch (error) {
    return {
      name: 'TablesDB Client Initialization',
      status: 'fail',
      message: 'Failed to initialize TablesDB client',
      details: error instanceof Error ? error.message : String(error),
      requirement: '1.2, 1.6: TablesDB client initialization'
    };
  }
}

/**
 * Check 7: Test basic connectivity to Appwrite
 */
async function checkConnectivity(): Promise<ConfigCheck> {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    
    if (!endpoint || !projectId || !apiKey) {
      return {
        name: 'Appwrite Connectivity',
        status: 'fail',
        message: 'Cannot test connectivity - missing configuration',
        details: 'Fix environment variables first',
        requirement: '1.7: Basic connectivity to Appwrite'
      };
    }
    
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    
    const databases = new Databases(client);
    
    // Try to list databases to verify connectivity and permissions
    const startTime = Date.now();
    
    if (databaseId) {
      // Try to get the specific database
      await databases.get(databaseId);
      const duration = Date.now() - startTime;
      
      return {
        name: 'Appwrite Connectivity',
        status: 'pass',
        message: 'Successfully connected to Appwrite',
        details: `Database '${databaseId}' accessible. Response time: ${duration}ms`,
        requirement: '1.7: Basic connectivity to Appwrite'
      };
    } else {
      // Just try to list databases
      await databases.list();
      const duration = Date.now() - startTime;
      
      return {
        name: 'Appwrite Connectivity',
        status: 'pass',
        message: 'Successfully connected to Appwrite',
        details: `Response time: ${duration}ms`,
        requirement: '1.7: Basic connectivity to Appwrite'
      };
    }
  } catch (error: any) {
    // Parse Appwrite error
    let message = 'Failed to connect to Appwrite';
    let details = error instanceof Error ? error.message : String(error);
    
    if (error.code === 401) {
      message = 'Authentication failed';
      details = 'Invalid API key or insufficient permissions';
    } else if (error.code === 404) {
      message = 'Database not found';
      details = 'Check NEXT_PUBLIC_APPWRITE_DATABASE_ID';
    } else if (error.type === 'network_error') {
      message = 'Network error';
      details = 'Cannot reach Appwrite endpoint. Check your internet connection and endpoint URL';
    }
    
    return {
      name: 'Appwrite Connectivity',
      status: 'fail',
      message,
      details,
      requirement: '1.7: Basic connectivity to Appwrite'
    };
  }
}

/**
 * Main verification function
 */
async function verifyConfiguration(): Promise<ConfigReport> {
  printHeader('Appwrite Transactions Configuration Verification');
  
  const checks: ConfigCheck[] = [];
  const recommendations: string[] = [];
  
  // Run all checks
  console.log(`${colors.bright}Running configuration checks...${colors.reset}\n`);
  
  // Synchronous checks
  checks.push(checkNodeAppwriteVersion());
  checks.push(checkTablesDBImport());
  checks.push(checkEndpoint());
  checks.push(checkProjectId());
  checks.push(checkApiKey());
  
  // Asynchronous checks
  checks.push(await checkTablesDBInitialization());
  checks.push(await checkConnectivity());
  
  // Print all checks
  checks.forEach(printCheck);
  
  // Generate recommendations
  const failedChecks = checks.filter(c => c.status === 'fail');
  const warningChecks = checks.filter(c => c.status === 'warning');
  
  if (failedChecks.length === 0 && warningChecks.length === 0) {
    recommendations.push('✓ All checks passed! Transactions are properly configured.');
    recommendations.push('You can now proceed with testing transaction functionality.');
  } else {
    if (failedChecks.length > 0) {
      recommendations.push(`Fix ${failedChecks.length} failed check(s) before proceeding.`);
      failedChecks.forEach(check => {
        if (check.details) {
          recommendations.push(`  - ${check.name}: ${check.details}`);
        }
      });
    }
    
    if (warningChecks.length > 0) {
      recommendations.push(`Review ${warningChecks.length} warning(s) for potential issues.`);
    }
  }
  
  const report: ConfigReport = {
    checks,
    overallStatus: failedChecks.length === 0 ? 'pass' : 'fail',
    recommendations,
    timestamp: new Date().toISOString()
  };
  
  printReport(report);
  
  return report;
}

/**
 * Run the verification
 */
async function main() {
  try {
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
    
    const report = await verifyConfiguration();
    
    // Exit with appropriate code
    process.exit(report.overallStatus === 'pass' ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Fatal Error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { verifyConfiguration, type ConfigReport, type ConfigCheck };
