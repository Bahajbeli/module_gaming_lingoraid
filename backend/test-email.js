require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_LQbidZ5V_BQCn8AiZHaZHDW1hWdKHM2vj');

async function testEmail() {
  console.log("Testing Resend API...");
  try {
    const data = await resend.emails.send({
      from: 'LingoRaid <onboarding@resend.dev>',
      to: 'test_random_user_12345@gmail.com',
      subject: 'Test Resend API',
      html: '<p>Test email content</p>'
    });

    console.log("Response:", data);
  } catch (err) {
    console.error("Error thrown:", err);
  }
}

testEmail();
