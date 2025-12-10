const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');
const OpenAI = require('openai');

// Generate temporary password
const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email
const sendEmail = async (to, subject, htmlBody) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlBody
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

// Welcome email template
const welcomeEmailBody = (name, tempPassword) => {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Welcome to Blueprint Marketing</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
    <table style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
      <tr>
        <td style="text-align: center;">
          <h2 style="color: #0d6efd;">Blueprint Marketing</h2>
          <p style="font-size: 16px; color: #212529;">
            Hello ${name},
          </p>
          <p style="font-size: 16px; color: #212529;">
            Here is your temporary password. Please use it to log in and update your password immediately.
          </p>
          <p style="font-size: 18px; font-weight: bold; background-color: #e9ecef; padding: 10px; border-radius: 5px; display: inline-block;">
            ${tempPassword}
          </p>
          <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
            If you didn't request this, please ignore this message or contact support.
          </p>
          <p style="font-size: 14px; color: #6c757d;">
            Regards,<br>
            The Blueprint Team
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

// Sanitize HTML content
const sanitizeContent = (htmlContent) => {
  if (!htmlContent) return htmlContent;

  return sanitizeHtml(htmlContent, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'a', 'span', 'div'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'span': ['style'],
      'div': ['style']
    },
    allowedStyles: {
      '*': {
        'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/],
        'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/],
        'font-size': [/^\d+(?:px|em|%)$/],
        'font-weight': [/^bold$/, /^\d+$/],
        'text-align': [/^(?:left|right|center|justify)$/]
      }
    }
  });
};

// Generate AI slogan
const generateSlogan = async (systemPrompt, userInput) => {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a creative marketing copywriter. Create compelling marketing slogans.'
        },
        {
          role: 'user',
          content: `Create a marketing slogan for: ${userInput}`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate slogan');
  }
};

// Validate file size
const validateFileSize = (fileSize, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
};

module.exports = {
  generateTempPassword,
  sendEmail,
  welcomeEmailBody,
  sanitizeContent,
  generateSlogan,
  validateFileSize
};
