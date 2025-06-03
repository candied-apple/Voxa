const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ message: String });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ message: 'Connection test successful' });
    await testDoc.save();
    
    console.log('✅ Successfully wrote test document to database');
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✅ Test cleanup completed');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 SOLUTION:');
      console.log('MongoDB is not running. You have two options:');
      console.log('\n1. Install and start MongoDB locally:');
      console.log('   - Download from: https://www.mongodb.com/try/download/community');
      console.log('   - Follow installation instructions');
      console.log('   - Start MongoDB service');
      console.log('\n2. Use MongoDB Atlas (cloud database):');
      console.log('   - Sign up at: https://www.mongodb.com/cloud/atlas');
      console.log('   - Create a free cluster');
      console.log('   - Update MONGODB_URI in .env file with your Atlas connection string');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testConnection();
