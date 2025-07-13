import { app } from "./api";
import { connectToDatabase, closeDatabase } from "./db";

// Initialize database connection
async function initializeDatabase() {
  try {
    await connectToDatabase();
    console.log('Frontend service database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

const gracefulShutdown = async () => {
  await closeDatabase()
    .then(() => {
      console.log('Frontend service MongoDB connection closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing MongoDB connection', err);
      process.exit(1);
    });
};

process.on('SIGINT', gracefulShutdown);   // Catches Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // Catches kill command
process.on('SIGQUIT', gracefulShutdown);  // Catches quit signal

// Start the server after database initialization
initializeDatabase().then(() => {
  app.listen(3001, () => {
    console.log('Frontend service running on port 3001');
  });
});