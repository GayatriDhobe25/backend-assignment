const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationMail = async (email, token) => {
  const link = `${process.env.BASE_URL}/verify-registration?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email',
    html: `<p>Click the link to verify: <a href="${link}">${link}</a></p>`
  });
};

module.exports = { sendVerificationMail };
