import mongoose from 'mongoose';

/**
 * MongoDB Connection Configuration
 * 
 * Handles connection setup, error handling, and provides utilities
 * for working with Mongoose in the application.
 */

// Connection options
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not defined in environment variables. " +
      "Add it to your .env file: MONGO_URI=mongodb://localhost:27017/human-ai-art-collab"
    );
  }

  try {
    console.log("📍 Connecting to MongoDB...");
    console.log("   URI (hidden for security):", mongoUri.split('@')[0] + '@****');

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    console.log("✅ MongoDB connected successfully");
    console.log(`   Database: ${conn.connection.db.name}`);
    console.log(`   Host: ${conn.connection.host}:${conn.connection.port}`);

    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(`   Error: ${error.message}`);

    // Provide helpful troubleshooting tips
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Troubleshooting tips:");
      console.error("   - Is MongoDB running?");
      console.error("   - Default local connection: mongodb://localhost:27017");
      console.error("   - To start MongoDB:");
      console.error("     Windows: net start MongoDB");
      console.error("     macOS: brew services start mongodb-community");
      console.error("     Linux: sudo systemctl start mongod");
      console.error("     Docker: docker run -d -p 27017:27017 mongo:7.0");
    } else if (error.message.includes("authentication failed")) {
      console.error("\n💡 Troubleshooting tips:");
      console.error("   - Check MONGO_URI credentials");
      console.error("   - Verify username and password");
      console.error("   - For local dev without auth: mongodb://localhost:27017/dbname");
    } else if (error.message.includes("TIMEOUT")) {
      console.error("\n💡 Troubleshooting tips:");
      console.error("   - Connection timed out");
      console.error("   - Check if MongoDB is responding");
      console.error("   - Verify network connectivity");
      console.error("   - Try: mongosh -u admin -p password");
    }

    throw error;
  }
}

/**
 * Setup connection event listeners
 */
export function setupConnectionListeners() {
  const conn = mongoose.connection;

  conn.on("connected", () => {
    console.log("✅ Mongoose connected to MongoDB");
  });

  conn.on("error", (err) => {
    console.error("❌ Mongoose connection error:", err);
  });

  conn.on("disconnected", () => {
    console.warn("⚠️  Mongoose disconnected from MongoDB");
  });

  conn.on("reconnected", () => {
    console.log("🔄 Mongoose reconnected to MongoDB");
  });

  conn.on("reconnectFailed", () => {
    console.error("❌ Mongoose failed to reconnect");
  });
}

/**
 * Get connection status
 * @returns {Object} Connection status information
 */
export function getConnectionStatus() {
  const conn = mongoose.connection;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];

  return {
    state: states[conn.readyState],
    readyState: conn.readyState,
    database: conn.db?.name || "N/A",
    host: conn.host || "N/A",
    port: conn.port || "N/A",
    isConnected: conn.readyState === 1,
  };
}

/**
 * Health check - verify MongoDB is accessible
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return false;
    }

    // Ping the database
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error("Health check failed:", error.message);
    return false;
  }
}

/**
 * Get MongoDB server info
 * @returns {Promise<Object|null>}
 */
export async function getServerInfo() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();

    return {
      version: serverStatus.version,
      uptime: `${Math.floor(serverStatus.uptime / 3600)}h`,
      connections: `${serverStatus.connections.current}/${serverStatus.connections.available}`,
      database: mongoose.connection.db.name,
    };
  } catch (error) {
    console.error("Could not retrieve server info:", error.message);
    return null;
  }
}

export default {
  connectDB,
  setupConnectionListeners,
  getConnectionStatus,
  healthCheck,
  getServerInfo,
};
