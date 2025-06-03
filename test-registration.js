const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123'
    };
    
    console.log('📤 Sending registration data:', testUser);
    
    const response = await axios.post('http://localhost:3001/api/auth/register', testUser, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Registration successful:', response.data);
    
  } catch (error) {
    console.error('❌ Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request:', error.code || error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
    console.error('Full error:', error.stack);
  }
}

console.log('🚀 Starting registration test...');
testRegistration().then(() => {
  console.log('📋 Test completed.');
}).catch(err => {
  console.error('💥 Unexpected error:', err);
});
