const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing login endpoint...');
    
    const loginData = {
      emailOrUsername: 'testuser123',
      password: 'password123'
    };
    
    console.log('📤 Sending login data:', loginData);
    
    const response = await axios.post('http://localhost:3001/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Login successful:', response.data);
    
  } catch (error) {
    console.error('❌ Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

console.log('🚀 Starting login test...');
testLogin().then(() => {
  console.log('📋 Login test completed.');
}).catch(err => {
  console.error('💥 Unexpected error:', err);
});
