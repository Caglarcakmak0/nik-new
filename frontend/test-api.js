// API Test Script
const baseUrl = import.meta.env.VITE_API_BASE_URL;

// Test user credentials (create a test user first)
const testUser = {
  email: 'testuser@example.com',
  password: 'test123'
};

let token = '';

async function login() {
  try {
    const response = await fetch(`${baseUrl}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    if (data.token) {
      token = data.token;
      console.log('✅ Login successful');
      console.log('Token:', token.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function testDailyPlanAPI() {
  console.log('\n📅 Testing Daily Plan API...');
  
  // Test GET /daily-plans (should be empty at first)
  try {
    const response = await fetch(`${baseUrl}/daily-plans`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('✅ GET /daily-plans:', data.message);
    console.log('Plans count:', data.data?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Daily plan API error:', error.message);
    return false;
  }
}

async function testCreateDailyPlan() {
  console.log('\n📝 Testing Create Daily Plan...');
  
  const planData = {
    title: 'Test Çalışma Programı',
    date: new Date().toISOString(),
    subjects: [
      {
        subject: 'matematik',
        targetQuestions: 50,
        targetTime: 120,
        topics: ['limit', 'türev'],
        priority: 1
      },
      {
        subject: 'turkce',
        targetQuestions: 40,
        targetTime: 90,
        topics: ['anlam', 'sözcük'],
        priority: 2
      }
    ],
    motivationNote: 'Hedefime odaklanıyorum!',
    dailyGoal: 'Net 85 yapmak'
  };
  
  try {
    const response = await fetch(`${baseUrl}/daily-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Plan created successfully');
      console.log('Plan ID:', data.data._id);
      console.log('Subjects count:', data.data.subjects.length);
      return data.data._id;
    } else {
      console.log('❌ Plan creation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Plan creation error:', error.message);
    return null;
  }
}

async function testEnhancedStudySession() {
  console.log('\n⏰ Testing Enhanced Study Session...');
  
  const sessionData = {
    subject: 'matematik',
    duration: 45, // 45 minutes
    date: new Date(),
    notes: 'İyi bir çalışma oldu',
    quality: 4,
    technique: 'Pomodoro',
    mood: 'Enerjik',
    distractions: 2,
    
    // Enhanced fields
    questionStats: {
      targetQuestions: 50,
      correctAnswers: 35,
      wrongAnswers: 12,
      blankAnswers: 3,
      netScore: 32, // Will be calculated
      topics: ['limit', 'türev']
    },
    intervals: [
      {
        type: 'study',
        duration: 25,
        startTime: new Date(Date.now() - 45 * 60 * 1000),
        endTime: new Date(Date.now() - 20 * 60 * 1000)
      },
      {
        type: 'break',
        duration: 5,
        startTime: new Date(Date.now() - 20 * 60 * 1000),
        endTime: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        type: 'study',
        duration: 20,
        startTime: new Date(Date.now() - 15 * 60 * 1000),
        endTime: new Date()
      }
    ],
    liveTracking: {
      isActive: false,
      currentInterval: '',
      lastUpdate: new Date()
    }
  };
  
  try {
    const response = await fetch(`${baseUrl}/study-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Enhanced session created');
      console.log('Session ID:', data.data._id);
      console.log('Calculated Net Score:', data.data.questionStats?.netScore);
      console.log('Calculated Efficiency:', data.data.efficiency);
      return data.data._id;
    } else {
      console.log('❌ Session creation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Session creation error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Test Daily Plan API
  await testDailyPlanAPI();
  
  // Step 3: Create a daily plan
  const planId = await testCreateDailyPlan();
  
  // Step 4: Test enhanced study session
  const sessionId = await testEnhancedStudySession();
  
  console.log('\n🎉 Tests completed!');
  console.log('Plan ID:', planId || 'Failed');
  console.log('Session ID:', sessionId || 'Failed');
}

// Run tests
runTests().catch(console.error);