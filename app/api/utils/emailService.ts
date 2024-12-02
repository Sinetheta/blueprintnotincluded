import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '25'),
  secure: false, // true for 465, false for other ports
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

export async function sendResetEmail(email: string, token: string) {
  console.log('Attempting to send reset email to:', email);
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@blueprintnotincluded.com',
    to: email,
    subject: 'Password Reset Request',
    text: `To reset your password, click this link: ${process.env.SITE_URL}/reset-password?token=${token}`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reset email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending reset email:', error);
    throw error;
  }
} 