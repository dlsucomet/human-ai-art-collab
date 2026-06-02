#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB Connection Test Script
 * 
 * Tests connection to MongoDB and validates collections
 * Usage: node scripts/testMongoDB.js
 */

async function testMongoDB() {
  console.log("\n=== MongoDB Connection Test ===\n");
  
  const mongoUri = process.env.MONGO_URI;
  console.log("📍 Connection URI:", mongoUri);
  
  if (!mongoUri) {
    console.error("❌ Error: MONGO_URI not set in .env file");
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log("\n⏳ Connecting to MongoDB...");
    const startTime = Date.now();
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    
    const connectTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Connected successfully (${connectTime}s)`);
    
    // Get connection info
    const connection = mongoose.connection;
    console.log(`\n📦 Database: ${connection.db.name}`);
    console.log(`🖥️  Host: ${connection.host}`);
    console.log(`🔌 Port: ${connection.port}`);
    
    // List all databases (requires admin privileges)
    try {
      const admin = connection.db.admin();
      const databases = await admin.listDatabases();
      console.log(`\n📚 Available Databases (${databases.databases.length}):`);
      databases.databases.forEach(db => {
        console.log(`   - ${db.name}`);
      });
    } catch (err) {
      console.log("⚠️  Could not list databases (may require admin privileges)");
    }
    
    // List collections in current database
    const collections = await connection.db.listCollections().toArray();
    console.log(`\n📋 Collections in "${connection.db.name}" (${collections.length}):`);
    if (collections.length === 0) {
      console.log("   (no collections yet - they'll be created on first use)");
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Test write operation
    console.log("\n⏳ Testing write operation...");
    const testCollection = connection.db.collection("_connection_test");
    const testDoc = {
      test: "data",
      timestamp: new Date(),
      success: true
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`✅ Write successful - Document ID: ${insertResult.insertedId}`);
    
    // Test read operation
    console.log("\n⏳ Testing read operation...");
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log(`✅ Read successful - Found document:`, foundDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log("🧹 Cleaned up test document");
    
    // Test server status
    try {
      const serverStatus = await connection.db.admin().serverStatus();
      console.log(`\n⚙️  MongoDB Version: ${serverStatus.version}`);
      console.log(`🔄 Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
      console.log(`📊 Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
    } catch (err) {
      console.log("⚠️  Could not retrieve server status");
    }
    
    console.log("\n✅ All tests passed! MongoDB is ready to use.\n");
    
    // Provide next steps
    console.log("Next steps:");
    console.log("1. Update .env with your MongoDB URI");
    console.log("2. Start the server: npm start");
    console.log("3. Test API endpoints");
    console.log("\n");
    
  } catch (error) {
    console.error("\n❌ Connection failed!\n");
    console.error("Error:", error.message);
    
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Tips:");
      console.error("   - Is MongoDB running?");
      console.error("   - Default: mongodb://localhost:27017");
      console.error("   - Check with: mongosh");
      console.error("   - Start MongoDB:");
      console.error("     Windows: net start MongoDB");
      console.error("     macOS: brew services start mongodb-community");
      console.error("     Linux: sudo systemctl start mongod");
      console.error("     Docker: docker run -d -p 27017:27017 mongo:7.0");
    } else if (error.message.includes("authentication failed")) {
      console.error("\n💡 Tips:");
      console.error("   - Check username and password in MONGO_URI");
      console.error("   - Verify database exists");
      console.error("   - For local dev, remove authentication");
    } else if (error.message.includes("TIMEOUT")) {
      console.error("\n💡 Tips:");
      console.error("   - Connection timed out");
      console.error("   - Check network connectivity");
      console.error("   - Verify MongoDB host is reachable");
    }
    
    process.exit(1);
  } finally {
    // Disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB");
    }
  }
}

// Run test
testMongoDB();
