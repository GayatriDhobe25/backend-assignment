const axios = require('axios');

const loginURL = 'http://localhost:5000/login'; // Replace with your actual login endpoint

const testCredentials = {
  email: 'test@example.com', // Make sure this user exists
  password: 'wrongpassword', // Intentionally wrong to simulate brute force
};

const totalAttempts = 10; // Make more than your rate limiter allows
let count = 0;

const attemptLogin = async () => {
  try {
    const response = await axios.post(loginURL, testCredentials);
    console.log(`✅ Attempt ${count + 1}:`, response.data);
  } catch (err) {
    if (err.response) {
      console.log(`❌ Attempt ${count + 1}:`, err.response.status, err.response.data);
    } else {
      console.log(`❌ Attempt ${count + 1}: Request failed`);
    }
  }

  count++;
  if (count < totalAttempts) {
    setTimeout(attemptLogin, 500); // Wait 500ms between attempts
  }
};

attemptLogin();
