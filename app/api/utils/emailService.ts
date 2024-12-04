import sgMail from '@sendgrid/mail';
import nodemailer, { Transporter } from 'nodemailer';

// Define custom error type for SendGrid errors
interface SendGridError extends Error {
  response?: {
    body: any;
  };
}

let transporter: Transporter | null = null;

if (process.env.ENV_NAME === 'production') {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY environment variable is not set');
  } else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });
}

export async function sendResetEmail(email: string, token: string) {
  console.log('Attempting to send reset email to:', email);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@blueprintnotincluded.com',
    subject: 'Password Reset Request - Blueprint Not Included',
    text: `To reset your password, click this link: ${process.env.SITE_URL}/reset-password?token=${token}`,
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Blueprint Not Included account.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${process.env.SITE_URL}/reset-password?token=${token}">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>The link will expire in 1 hour.</p>
    `
  };

  try {
    if (process.env.ENV_NAME === 'production') {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }
      const result = await sgMail.send(msg);
      console.log('Reset email sent successfully to:', email);
      return result;
    } else {
      if (!transporter) {
        throw new Error('Email transporter not configured');
      }
      const info = await transporter.sendMail({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html
      });
      console.log('Reset email sent:', info.response);
      return info;
    }
  } catch (error) {
    console.error('Error sending reset email:', error);
    if (error instanceof Error && (error as SendGridError).response) {
      console.error('SendGrid error details:', (error as SendGridError).response?.body);
    }
    throw error;
  }
} 