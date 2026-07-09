import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('Error: MONGODB_URI is not defined in the environment variables.');
    process.exit(1);
  }

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('MongoDB successfully connected to database.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection disconnected. Attempting to reconnect...');
  });

  const options = {
    autoIndex: true, // Build indexes
  };

  const maxRetries = 5;
  let retryCount = 0;

  const connectWithRetry = async () => {
    try {
      await mongoose.connect(mongoURI, options);
    } catch (err) {
      retryCount++;
      console.error(`MongoDB connection attempt ${retryCount} failed. Error:`, err);
      if (retryCount < maxRetries) {
        console.log(`Waiting 5 seconds before retrying connection...`);
        setTimeout(connectWithRetry, 5000);
      } else {
        console.error('MongoDB connection failed after maximum retries. Exiting process...');
        process.exit(1);
      }
    }
  };

  await connectWithRetry();
};
