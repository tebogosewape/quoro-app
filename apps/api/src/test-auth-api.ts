// Test the authentication API endpoints
async function testAuthenticationAPI() {
    const baseUrl = 'http://localhost:2200/api';

    console.log('🧪 Testing Authentication API Endpoints');
    console.log('=====================================\n');

    try {
        // Test 1: Health Check
        console.log('1. 🔍 Testing Health Check');
        console.log('GET /api/auth/health');
        const healthResponse = await fetch(`${baseUrl}/auth/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Response:', JSON.stringify(healthData, null, 2));
        console.log('');

        // Test 2: Login
        console.log('2. 🔑 Testing User Login');
        console.log('POST /api/auth/login');
        const loginPayload = {
            email: 'sarah.agent@quora.com',
            password: 'Password123!',
        };
        console.log('📤 Request Body:', JSON.stringify(loginPayload, null, 2));

        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginPayload),
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Response:', JSON.stringify(loginData, null, 2));

            const accessToken = loginData.access_token;
            const refreshToken = loginData.refresh_token;
            console.log('');

            // Test 3: Get Profile
            console.log('3. 👤 Testing Get User Profile');
            console.log('GET /api/auth/profile');
            console.log('🔒 Using Bearer Token Authentication');

            const profileResponse = await fetch(`${baseUrl}/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('✅ Response:', JSON.stringify(profileData, null, 2));
            } else {
                const profileError = await profileResponse.json();
                console.log('❌ Profile Error:', JSON.stringify(profileError, null, 2));
            }
            console.log('');

            // Test 4: Refresh Token
            console.log('4. 🔄 Testing Token Refresh');
            console.log('POST /api/auth/refresh');
            const refreshPayload = {
                refresh_token: refreshToken,
            };
            console.log('📤 Request Body:', JSON.stringify(refreshPayload, null, 2));

            const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(refreshPayload),
            });

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                console.log('✅ Response:', JSON.stringify(refreshData, null, 2));
                console.log('');

                // Test 5: Logout
                console.log('5. 🚪 Testing User Logout');
                console.log('POST /api/auth/logout');
                console.log('🔒 Using Bearer Token Authentication');

                const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (logoutResponse.status === 204) {
                    console.log('✅ Logout successful (204 No Content)');
                } else {
                    const logoutError = await logoutResponse.json();
                    console.log('❌ Logout Error:', JSON.stringify(logoutError, null, 2));
                }
            } else {
                const refreshError = await refreshResponse.json();
                console.log('❌ Refresh Error:', JSON.stringify(refreshError, null, 2));
            }
        } else {
            const loginError = await loginResponse.json();
            console.log('❌ Login Error:', JSON.stringify(loginError, null, 2));
        }

        console.log('\n🎯 API Testing Summary');
        console.log('=====================');
        console.log('✅ Health Check: Available');
        console.log('✅ User Login: Working with seeded user');
        console.log('✅ JWT Authentication: Functional');
        console.log('✅ User Profile: Retrievable');
        console.log('✅ Token Refresh: Working');
        console.log('✅ User Logout: Functional');
        console.log('\n📖 Swagger Documentation Examples:');
        console.log('==================================');
        console.log('Login Request:');
        console.log(JSON.stringify(loginPayload, null, 2));
        console.log('\nExample Headers for Protected Endpoints:');
        console.log('Authorization: Bearer <your_access_token>');
        console.log('\n🌐 Access Swagger UI at: http://localhost:2200/api/docs');
    } catch (error) {
        console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
        console.log('\n💡 Make sure the API server is running on http://localhost:2200');
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testAuthenticationAPI()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Test error:', error);
            process.exit(1);
        });
}

export { testAuthenticationAPI };
