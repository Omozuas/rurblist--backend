const nodemailer = require("nodemailer");

class SendEmails {
  static transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  static sendOtpMail = async (email, firstName, otp) => {
    const rurblistEmail = process.env.EMAIL_USERNAME;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist Support" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: "Your OTP Code - Rurblist",
      text: `Hello ${firstName}, your OTP code is ${otp}. This code will expire in 10 minutes.`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rurblist OTP Verification</title>
</head>

<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

  <tr>
    <td style="padding: 20px; text-align: center; background-color: #ec6c10; color: #ffffff;">
      <h1 style="margin: 0">Rurblist</h1>
      <p style="margin: 0">Secure Account Verification</p>
    </td>
  </tr>

  <tr>
    <td style="padding: 20px">
      <p>Dear <strong style="text-transform: capitalize;">${firstName}</strong>,</p>

      <p>
        We received a request to verify your account. Please use the One-Time Password (OTP) below to continue:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <span style="
          display: inline-block;
          padding: 15px 30px;
          font-size: 28px;
          letter-spacing: 5px;
          font-weight: bold;
          background-color: #f1f1f1;
          border-radius: 8px;
          color: #ec6c10;
        ">
          ${otp}
        </span>
      </div>

      <p style="text-align: center; font-size: 14px; color: #555;">
        This OTP is valid for <strong>10 minutes</strong>.
      </p>

      <p>
        If you did not request this code, please ignore this email or contact our support team immediately.
      </p>

      <p style="text-align: left; font-size: 14px; color: #333;">
        <strong>Email:</strong>
        <a href="mailto:${rurblistEmail}" style="color: #ec6c10">
          ${rurblistEmail}
        </a><br />
        <strong>Phone:</strong> 1-800-RURBLIST
      </p>

      <p>Best regards,</p>
      <p>Support Team<br />Rurblist</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0" />

      <p style="text-align: center; font-size: 12px; color: #777;">
        &copy; ${currentYear} Rurblist. All rights reserved.
      </p>
    </td>
  </tr>

</table>
</body>
</html>
`,
    };

    const info = await SendEmails.transporter.sendMail(mailOptions);
    return info;
  };

  static sendPasswordResetMail = async (email, firstName, resetToken) => {
    const rurblistEmail = process.env.EMAIL_USERNAME;
    const currentYear = new Date().getFullYear();


    const mailOptions = {
      from: `"Rurblist Support" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: "Password Reset - Rurblist",
      text: `Hello ${firstName}, you requested a password reset. your OTP code is ${resetToken}. This code will expire in 10 minutes.`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rurblist Password Reset</title>
</head>

<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

  <tr>
    <td style="padding: 20px; text-align: center; background-color: #ec6c10; color: #ffffff;">
      <h1 style="margin: 0">Rurblist</h1>
      <p style="margin: 0">Password Reset Request</p>
    </td>
  </tr>

  <tr>
    <td style="padding: 20px">
      <p>Dear <strong style="text-transform: capitalize;">${firstName}</strong>,</p>

      <p>
        We received a request to reset your password. Please use the One-Time Password (OTP) below to continue:
      </p>

         <div style="text-align: center; margin: 30px 0;">
        <span style="
          display: inline-block;
          padding: 15px 30px;
          font-size: 28px;
          letter-spacing: 5px;
          font-weight: bold;
          background-color: #f1f1f1;
          border-radius: 8px;
          color: #ec6c10;
        ">
          ${resetToken}
        </span>
      </div>

      <p style="text-align: center; font-size: 14px; color: #555;">
        This link will expire in <strong>30 minutes</strong>.
      </p>

      <p>
        If you did not request this password reset, please ignore this email or contact our support team immediately.
      </p>


      <p style="text-align: left; font-size: 14px; color: #333;">
        <strong>Email:</strong>
        <a href="mailto:${rurblistEmail}" style="color: #ec6c10">
          ${rurblistEmail}
        </a><br />
        <strong>Phone:</strong> 1-800-RURBLIST
      </p>

      <p>Best regards,</p>
      <p>Support Team<br />Rurblist</p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0" />

      <p style="text-align: center; font-size: 12px; color: #777;">
        &copy; ${currentYear} Rurblist. All rights reserved.
      </p>
    </td>
  </tr>

</table>
</body>
</html>
`,
    };

    const info = await SendEmails.transporter.sendMail(mailOptions);
    return info;
  };

  static sendWelcomeEmail = async (email, firstName) => {
  const rurblistEmail = process.env.EMAIL_USERNAME;
  const currentYear = new Date().getFullYear();

  const mailOptions = {
    from: `"Rurblist" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: "Welcome to Rurblist 🎉",
    text: `Hello ${firstName}, welcome to Rurblist! Your journey to finding your dream property starts here.`,
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Rurblist</title>
</head>

<body style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px; color:#333;">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden">

<tr>
<td style="padding:20px;text-align:center;background:#ec6c10;color:#ffffff">
<h1 style="margin:0">Rurblist</h1>
<p style="margin:0">Your Access To Dream Home!</p>
</td>
</tr>

<tr>
<td style="padding:30px">

<p>Dear <strong style="text-transform:capitalize;">${firstName}</strong>,</p>

<p>
Welcome to <strong>Rurblist</strong>! 🎉  
We're excited to have you join our growing community of property seekers and investors.
</p>

<p>
Our platform makes it easy to discover amazing homes, apartments, and investment properties all in one place.
</p>

<h3 style="margin-top:25px;">What you can do on Rurblist:</h3>

<ul style="padding-left:20px">
<li>🏡 Browse thousands of verified property listings</li>
<li>❤️ Save your favorite properties</li>
<li>🤝 Connect directly with trusted agents and sellers</li>
<li>📊 Stay updated with market insights</li>
</ul>

<p style="text-align:center;margin:30px 0">
<a href="${process.env.FRONTEND_URL}/properties"
style="background:#ec6c10;color:#ffffff;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;">
Explore Properties
</a>
</p>

<p>If you ever need help, our support team is always here for you.</p>

<p style="font-size:14px">
<strong>Email:</strong> 
<a href="mailto:${rurblistEmail}" style="color:#ec6c10">${rurblistEmail}</a>
</p>

<p>Best regards,</p>

<p>
<strong>Rurblist Team</strong><br/>
Helping you find your dream home.
</p>

<hr style="border:none;border-top:1px solid #eee;margin:25px 0"/>

<p style="text-align:center;font-size:13px;color:#777">
Follow us for updates and property tips!
</p>

<p style="text-align:center;font-size:14px">
<a href="#" style="color:#ec6c10;text-decoration:none">Facebook</a> |
<a href="#" style="color:#ec6c10;text-decoration:none">Twitter</a> |
<a href="#" style="color:#ec6c10;text-decoration:none">Instagram</a>
</p>

</td>
</tr>

<tr>
<td style="padding:12px;text-align:center;background:#f1f1f1;font-size:12px;color:#777">
© ${currentYear} Rurblist. All rights reserved.
</td>
</tr>

</table>

</body>
</html>`
  };

   const info = await SendEmails.transporter.sendMail(mailOptions);
  return info;
  };

  static sendPasswordChangeAlertEmail = async (email, firstName) => {

        const rurblistEmail = process.env.EMAIL_USERNAME;
        const currentYear = new Date().getFullYear();
        const time = new Date().toLocaleString();

        const mailOptions = {
          from: `"Rurblist Security" <${process.env.EMAIL_USERNAME}>`,
          to: email,
          subject: "Security Alert: Your Password Was Changed",
          text: `Hello ${firstName}, your Rurblist account password was changed on ${time}. If you did not perform this action please contact support immediately.`,
          
          html: `<!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert - Password Changed</title>
      </head>

      <body style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px; color:#333;">

      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden">

      <tr>
      <td style="padding:20px;text-align:center;background:#ec6c10;color:#ffffff">
      <h1 style="margin:0">Rurblist</h1>
      <p style="margin:0">Account Security Notification</p>
      </td>
      </tr>

      <tr>
      <td style="padding:30px">

      <p>Dear <strong style="text-transform:capitalize;">${firstName}</strong>,</p>

      <p>
      This is a security notification to inform you that your <strong>Rurblist account password was recently changed</strong>.
      </p>

      <p style="margin-top:15px;">
      <strong>Time of change:</strong> ${time}
      </p>

      <p>
      If you made this change, no further action is required.
      </p>

      <p style="color:#d9534f; font-weight:bold;">
      If you did NOT change your password, please contact our support team immediately to secure your account.
      </p>

      <p style="text-align:center;margin:30px 0">
      <a href="${process.env.FRONTEND_URL}/login"
      style="background:#ec6c10;color:#ffffff;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;">
      Secure Your Account
      </a>
      </p>

      <p>If you need help, our support team is always ready to assist.</p>

      <p style="font-size:14px">
      <strong>Email:</strong> 
      <a href="mailto:${rurblistEmail}" style="color:#ec6c10">${rurblistEmail}</a>
      </p>

      <p>Stay safe,<br/>
      <strong>Rurblist Security Team</strong>
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:25px 0"/>

      <p style="text-align:center;font-size:13px;color:#777">
      Security tip: Never share your password with anyone.
      </p>

      </td>
      </tr>

      <tr>
      <td style="padding:12px;text-align:center;background:#f1f1f1;font-size:12px;color:#777">
      © ${currentYear} Rurblist. All rights reserved.
      </td>
      </tr>

      </table>

      </body>
      </html>`
        };

        const info = await SendEmails.transporter.sendMail(mailOptions);
        return info;
      };
}

module.exports = SendEmails;

