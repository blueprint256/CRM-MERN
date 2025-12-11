/**
 * Test script to verify Canva configuration
 * Run with: node test-canva-config.js
 */

require('dotenv').config();

console.log('\n=== CANVA CONFIGURATION TEST ===\n');

// Check environment variables
console.log('1. Checking environment variables...\n');

const config = {
  CANVA_CLIENT_ID: process.env.CANVA_CLIENT_ID,
  CANVA_CLIENT_SECRET: process.env.CANVA_CLIENT_SECRET,
  CANVA_REDIRECT_URI: process.env.CANVA_REDIRECT_URI,
  CLIENT_URL: process.env.CLIENT_URL
};

// Validate each config
Object.entries(config).forEach(([key, value]) => {
  if (!value) {
    console.log(`   ❌ ${key}: NOT SET`);
  } else if (key === 'CANVA_CLIENT_SECRET') {
    console.log(`   ✓ ${key}: ${value.substring(0, 5)}...${value.substring(value.length - 5)} (length: ${value.length})`);
  } else if (key === 'CANVA_CLIENT_ID') {
    console.log(`   ✓ ${key}: ${value}`);
    if (!value.startsWith('OAC')) {
      console.log(`      ⚠️  WARNING: Client ID should typically start with "OAC"`);
    }
  } else {
    console.log(`   ✓ ${key}: ${value}`);
  }
});

// Check for common issues
console.log('\n2. Checking for common issues...\n');

if (config.CANVA_REDIRECT_URI) {
  if (config.CANVA_REDIRECT_URI.includes('localhost')) {
    console.log('   ⚠️  WARNING: CANVA_REDIRECT_URI uses "localhost"');
    console.log('      Canva requires "127.0.0.1" instead of "localhost"');
    console.log(`      Current: ${config.CANVA_REDIRECT_URI}`);
    console.log(`      Should be: ${config.CANVA_REDIRECT_URI.replace('localhost', '127.0.0.1')}`);
  }

  if (!config.CANVA_REDIRECT_URI.includes('/api/canva/callback')) {
    console.log('   ⚠️  WARNING: CANVA_REDIRECT_URI should end with /api/canva/callback');
  }
}

if (config.CANVA_CLIENT_SECRET) {
  // Check for special characters that might cause encoding issues
  const specialChars = /[^a-zA-Z0-9_-]/g;
  const matches = config.CANVA_CLIENT_SECRET.match(specialChars);
  if (matches) {
    console.log(`   ⚠️  Note: Client secret contains special characters: ${[...new Set(matches)].join(', ')}`);
    console.log('      This is usually fine, but ensure .env file has proper quoting');
  }
}

// Test Basic Auth encoding
console.log('\n3. Testing Basic Auth encoding...\n');

const credentials = Buffer.from(
  `${config.CANVA_CLIENT_ID}:${config.CANVA_CLIENT_SECRET}`
).toString('base64');

console.log(`   Basic Auth header: Basic ${credentials.substring(0, 20)}...`);

// Test actual token endpoint connectivity
console.log('\n4. Testing Canva API connectivity...\n');

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

async function testCanvaEndpoint() {
  try {
    // Just test if the endpoint is reachable (will fail auth, but should return JSON error)
    const response = await fetch(CANVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'test_invalid_code',
        code_verifier: 'test_verifier',
        redirect_uri: config.CANVA_REDIRECT_URI || 'http://127.0.0.1:5000/api/canva/callback'
      })
    });

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${contentType}`);

    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      console.log('\n   ❌ ERROR: Canva returned HTML instead of JSON!');
      console.log('   This usually means:');
      console.log('   - CANVA_CLIENT_ID is invalid or does not exist');
      console.log('   - CANVA_CLIENT_SECRET is wrong');
      console.log('   - The Canva app is disabled in Developer Portal');
      console.log('\n   HTML Preview:');
      console.log(`   ${responseText.substring(0, 200)}...`);
    } else {
      try {
        const data = JSON.parse(responseText);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);

        if (data.error === 'invalid_grant') {
          console.log('\n   ✓ Good news! The endpoint is working correctly.');
          console.log('   The "invalid_grant" error is expected with test credentials.');
          console.log('   Your Canva configuration appears to be correct!');
        } else if (data.error === 'invalid_client') {
          console.log('\n   ❌ ERROR: Invalid client credentials');
          console.log('   Check your CANVA_CLIENT_ID and CANVA_CLIENT_SECRET');
        }
      } catch (e) {
        console.log(`   Response (not JSON): ${responseText.substring(0, 300)}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
}

testCanvaEndpoint().then(() => {
  console.log('\n=== TEST COMPLETE ===\n');
});
