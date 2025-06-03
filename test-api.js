// Quick API test script for Voxa Chat
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAPI() {
    console.log('🧪 Testing Voxa Chat API...\n');
    
    try {
        // Test 1: Health check (if we had one)
        console.log('1. Testing server connectivity...');
        const healthResponse = await axios.get(`${BASE_URL}/auth/profile`, {
            validateStatus: () => true // Accept any status
        });
        console.log(`   Server responding: ${healthResponse.status === 401 ? '✅ (Expected 401 - Unauthorized)' : '❌'}`);
        
        // Test 2: User registration
        console.log('\n2. Testing user registration...');
        const testUser = {
            username: 'testuser_' + Date.now(),
            email: `test${Date.now()}@example.com`,
            password: 'testpassword123'
        };
        
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser, {
            validateStatus: () => true
        });
        
        if (registerResponse.status === 201) {
            console.log('   ✅ User registration successful');
            console.log(`   User ID: ${registerResponse.data.user.userId}`);
            
            // Test 3: User login
            console.log('\n3. Testing user login...');
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: testUser.email,
                password: testUser.password
            });
            
            if (loginResponse.status === 200) {
                console.log('   ✅ User login successful');
                const token = loginResponse.data.token;
                
                // Test 4: Authenticated request
                console.log('\n4. Testing authenticated request...');
                const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (profileResponse.status === 200) {
                    console.log('   ✅ Authenticated request successful');
                    console.log(`   Welcome ${profileResponse.data.username}!`);
                } else {
                    console.log('   ❌ Authenticated request failed');
                }
                
                // Test 5: Room creation
                console.log('\n5. Testing room creation...');
                const roomResponse = await axios.post(`${BASE_URL}/chat/rooms`, {
                    name: 'Test Room ' + Date.now(),
                    description: 'A test room for API testing'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (roomResponse.status === 201) {
                    console.log('   ✅ Room creation successful');
                    console.log(`   Room ID: ${roomResponse.data._id}`);
                } else {
                    console.log('   ❌ Room creation failed');
                }
                
            } else {
                console.log('   ❌ User login failed');
            }
            
        } else {
            console.log('   ❌ User registration failed');
            console.log(`   Error: ${registerResponse.data?.message || 'Unknown error'}`);
        }
        
        console.log('\n🎉 API testing completed!');
          } catch (error) {
        console.error('❌ API test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Server is not running on port 3001');
        }
        console.error('   Full error:', error);
    }
}

// Run the test
testAPI();
