const nodemailer = require('nodemailer');

const sendMail = async (to, subject, text) => {
  try {
    // Create transporter using SMTP details from env variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,       // e.g. smtp.gmail.com
      port: process.env.SMTP_PORT,       // e.g. 587
      secure: false,                     // true for port 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,   // your email address
        pass: process.env.EMAIL_PASS    // your email password or app password
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = sendMail;
