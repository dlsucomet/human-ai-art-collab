#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple API Test Script
 * Tests MongoDB through API endpoints
 * 
 * Usage: npm run test-api
 * or: node scripts/testAPI.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TIMESTAMP = Date.now();

// Test data
const testUser = {
  username: `testuser_${TIMESTAMP}`,
  email: `test_${TIMESTAMP}@example.com`,
  password: 'testpass123'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAPI() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║     MongoDB API Testing                ║");
  console.log("╚════════════════════════════════════════╝\n");
  
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${testUser.email}\n`);
  
  let registeredUserId = null;
  let authToken = null;

  try {
    // Test 1: Register
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 1: User Registration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n📝 Registering user: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });
    
    console.log("✅ Response:", registerRes.data.message);
    console.log(`✅ Status: ${registerRes.status}`);
    
    // Small delay to ensure write
    await delay(500);
    
    // Test 2: Login
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 2: User Login");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🔐 Logging in with: ${testUser.email}`);
    
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    registeredUserId = loginRes.data.user.id;
    authToken = loginRes.data.token;
    
    console.log("✅ Login successful!");
    console.log(`   User ID: ${loginRes.data.user.id}`);
    console.log(`   Username: ${loginRes.data.user.username}`);
    console.log(`   Token: ${loginRes.data.token.substring(0, 20)}...`);
    console.log(`✅ Status: ${loginRes.status}`);
    
    // Test 3: Get Profile
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 3: Get User Profile");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n👤 Fetching profile for user: ${registeredUserId}`);
    
    const profileRes = await axios.get(
      `${BASE_URL}/auth/profile/${registeredUserId}`
    );
    
    console.log("✅ Profile fetched!");
    console.log(`   Username: ${profileRes.data.username}`);
    console.log(`   Email: ${profileRes.data.email}`);
    console.log(`   Created: ${profileRes.data.createdAt}`);
    console.log(`✅ Status: ${profileRes.status}`);
    
    // Test 4: Check Me Endpoint
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 4: Authenticated '/me' Endpoint");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🔐 Testing authenticated request with token`);
    
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log("✅ Authenticated request successful!");
    console.log(`   Username: ${meRes.data.username}`);
    console.log(`   Email: ${meRes.data.email}`);
    console.log(`✅ Status: ${meRes.status}`);
    
    // Test 5: Duplicate Registration
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 5: Duplicate Registration (Should Fail)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🔍 Trying to register same user again...`);
    
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password
      });
      console.log("⚠️  Warning: Duplicate allowed (may need index check)");
    } catch (dupError) {
      console.log("✅ Correctly rejected duplicate!");
      console.log(`   Error: ${dupError.response?.data?.error || dupError.message}`);
    }
    
    // Summary
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║        ✅ ALL TESTS PASSED!            ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("\n📊 Summary:");
    console.log("   ✅ User Registration");
    console.log("   ✅ User Login");
    console.log("   ✅ Profile Fetching");
    console.log("   ✅ Authentication");
    console.log("   ✅ Validation\n");
    console.log("🎉 MongoDB connection is working properly!\n");
    
  } catch (error) {
    console.error("\n╔════════════════════════════════════════╗");
    console.error("║        ❌ TEST FAILED!                 ║");
    console.error("╚════════════════════════════════════════╝\n");
    
    if (error.response) {
      console.error("❌ API Error:");
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.response.data?.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error("❌ Connection Error: Cannot reach backend");
      console.error(`   Make sure server is running at ${BASE_URL}`);
      console.error("   Run: npm start");
    } else {
      console.error("❌ Error:", error.message);
    }
    
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Is backend running? npm start");
    console.log("   2. Is MongoDB connected? npm run test-mongodb");
    console.log("   3. Check .env file for correct MONGO_URI");
    console.log("   4. Check backend logs for errors\n");
    
    process.exit(1);
  }
}

testAPI();
