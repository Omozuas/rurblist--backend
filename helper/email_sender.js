const nodemailer = require('nodemailer');

class SendEmails {
  /* static transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
*/

  static getTransporter(email, password) {
    return nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
    });
  }
  static verifyTransporter = SendEmails.getTransporter(
    process.env.EMAIL_VERIFY,
    process.env.EMAIL_VERIFY_PASSWORD,
  );

  static supportTransporter = SendEmails.getTransporter(
    process.env.EMAIL_SUPPORT,
    process.env.EMAIL_SUPPORT_PASSWORD,
  );

  static helloTransporter = SendEmails.getTransporter(
    process.env.EMAIL_HELLO,
    process.env.EMAIL_HELLO_PASSWORD,
  );
  static sendOtpMail = async (email, firstName, otp) => {
    const rurblistEmail = process.env.EMAIL_SUPPORT;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist Support" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: 'Your OTP Code - Rurblist',
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
        <strong>Phone:</strong> 08154155124
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

    const info = await SendEmails.verifyTransporter.sendMail(mailOptions);
    return info;
  };

  static sendPasswordResetMail = async (email, firstName, resetToken) => {
    const rurblistEmail = process.env.EMAIL_SUPPORT;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist Support" <${process.env.EMAIL_SUPPORT}>`,
      to: email,
      subject: 'Password Reset - Rurblist',
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
        <strong>Phone:</strong> 08154155124
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

    const info = await SendEmails.supportTransporter.sendMail(mailOptions);
    return info;
  };

  static sendWelcomeEmail = async (email, firstName) => {
    const rurblistEmail = process.env.EMAIL_HELLO;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_HELLO}>`,
      to: email,
      subject: 'Welcome to Rurblist 🎉',
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
REAL ESTATE WITHOUT THE RISK.
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
</html>`,
    };

    const info = await SendEmails.helloTransporter.sendMail(mailOptions);
    return info;
  };

  static sendPasswordChangeAlertEmail = async (email, firstName) => {
    const rurblistEmail = process.env.EMAIL_SUPPORT;
    const currentYear = new Date().getFullYear();
    const time = new Date().toLocaleString();

    const mailOptions = {
      from: `"Rurblist Security" <${process.env.EMAIL_SUPPORT}>`,
      to: email,
      subject: 'Security Alert: Your Password Was Changed',
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
      </html>`,
    };

    const info = await SendEmails.supportTransporter.sendMail(mailOptions);
    return info;
  };

  static sendAgentApplicationEmail = async (email, firstName) => {
    const rurblistEmail = process.env.EMAIL_HELLO;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_HELLO}>`,
      to: email,
      subject: 'Agent Application Received ✅',
      text: `Hello ${firstName}, we have received your request to become a Rurblist agent. Our team will review your application within 2–3 working days.`,

      html: `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Application Received</title>
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
    Thank you for applying to become a <strong>Rurblist Agent</strong>. ✅  
    We have successfully received your application and it is currently under review.
    </p>

    <p>
    Our verification team will carefully assess your details, including your KYC information and submitted documents.
    </p>

    <h3 style="margin-top:25px;">What happens next?</h3>

    <ul style="padding-left:20px">
    <li>🔍 Your application will be reviewed by our team</li>
    <li>🛡️ Your identity and documents will be verified</li>
    <li>⏳ This process typically takes <strong>2–3 working days</strong></li>
    <li>📩 You will receive an update via email once the review is complete</li>
    </ul>

    <p style="margin-top:20px;">
    If additional information is required, we will contact you directly.
    </p>

    <p style="text-align:center;margin:30px 0">
    <a href="${process.env.FRONTEND_URL}"
    style="background:#ec6c10;color:#ffffff;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;">
    Visit Rurblist
    </a>
    </p>

    <p>If you have any questions, feel free to reach out to our support team.</p>

    <p style="font-size:14px">
    <strong>Email:</strong> 
    <a href="mailto:${rurblistEmail}" style="color:#ec6c10">${rurblistEmail}</a>
    </p>

    <p>Best regards,</p>

    <p>
    <strong>Rurblist Team</strong><br/>
    Building trusted connections in real estate.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:25px 0"/>

    <p style="text-align:center;font-size:13px;color:#777">
    Stay connected with us for updates and opportunities.
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
  </html>`,
    };

    const info = await SendEmails.helloTransporter.sendMail(mailOptions);
    return info;
  };

  static sendAgentApprovalEmail = async (email, firstName) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: "Congratulations! You're Now a Rurblist Agent 🎉",
      text: `Hello ${firstName}, your agent application has been approved.`,
      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Congratulations ${firstName}! 🎉</h2>

    <p>Your application to become a <strong>Rurblist Agent</strong> has been <strong>approved</strong>.</p>

    <p>You can now start listing properties, connecting with clients, and growing your business.</p>

    <p style="margin:30px 0;">
    <a href="${process.env.FRONTEND_URL}" 
    style="background:#ec6c10;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;">
    Go to Dashboard
    </a>
    </p>

    <p>Welcome aboard 🚀</p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.verifyTransporter.sendMail(mailOptions);
  };

  static sendAgentRejectionEmail = async (email, firstName) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_SUPPORT}>`,
      to: email,
      subject: 'Update on Your Agent Application',
      text: `Hello ${firstName}, your application was not approved at this time.`,
      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2>Dear ${firstName},</h2>

    <p>Thank you for your interest in becoming a Rurblist agent.</p>

    <p>
    After careful review, we regret to inform you that your application was not approved at this time.
    </p>

    <p>
    This may be due to incomplete or unverifiable information.
    </p>

    <p>
    You are welcome to reapply after making the necessary updates.
    </p>

    <p>We appreciate your interest in Rurblist.</p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.supportTransporter.sendMail(mailOptions);
  };

  static sendAgentMoreInfoEmail = async (email, firstName) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: 'Additional Information Required ⚠️',
      text: `Hello ${firstName}, we need more information to process your application.`,
      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
    We are currently reviewing your agent application, but we need some additional information to proceed.
    </p>

    <ul>
    <li>📄 Missing or unclear documents</li>
    <li>🧾 Incomplete details</li>
    <li>🛡️ Verification issues</li>
    </ul>

    <p>
    Please log in to your account and update the required information.
    </p>

    <p style="margin:30px 0;">
    <a href="${process.env.FRONTEND_URL}" 
    style="background:#ec6c10;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;">
    Update Application
    </a>
    </p>

    <p>If you need help, contact support.</p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.verifyTransporter.sendMail(mailOptions);
  };

  static sendAdminAgentNotification = async (agentData) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_HELLO}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 New Agent Application Submitted',
      text: `A new agent has applied.`,
      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">New Agent Application 🚨</h2>

    <p>A new agent has submitted an application. Details below:</p>

    <ul>
    <li><strong>Name:</strong> ${agentData.firstName} ${agentData.lastName}</li>
    <li><strong>NIN:</strong> ${agentData.nin}</li>
    <li><strong>Company:</strong> ${agentData.companyName || 'N/A'}</li>
    <li><strong>Experience:</strong> ${agentData.yearsOfExperience} years</li>
    <li><strong>City:</strong> ${agentData.city}</li>
    </ul>

    <p>Please review the application in the admin dashboard.</p>

    <p><strong>Rurblist System</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.helloTransporter.sendMail(mailOptions);
  };

  static sendTourBookingPaymentEmail = async (email, firstName, tour) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: 'Tour Booking Pending Payment ⏳',

      text: `Hello ${firstName}, your tour has been scheduled. Please complete payment within 24 hours to confirm your booking.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
      Your property tour has been successfully scheduled 🎉
    </p>

    <p>
      <strong>⚠️ Important:</strong> This booking is <strong>pending</strong> until payment is completed.
    </p>

    <div style="background:#fff4e5;padding:15px;border-left:5px solid #ec6c10;margin:20px 0;">
      ⏳ You have <strong>24 hours</strong> to complete your payment, or this booking will be automatically cancelled.
    </div>

    <h3 style="margin-top:20px;">📋 Tour Details</h3>
    <ul>
      <li>📅 Date: ${new Date(tour.date).toDateString()}</li>
      <li>⏰ Time: ${new Date(tour.date).toLocaleTimeString()}</li>
      <li>🏠 Tour Type: ${tour.tourType}</li>
      <li>💰 Price: ${tour.price}</li>
    </ul>

    <p style="margin:30px 0;">
      <a href="${process.env.FRONTEND_URL}/payment-tour/${tour._id}" 
      style="background:#ec6c10;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;">
      Complete Payment
      </a>
    </p>

    <p>
      If you do not complete payment within the time limit, your slot may be released to other users.
    </p>

    <p>If you need help, contact support.</p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.verifyTransporter.sendMail(mailOptions);
  };

  static sendTourRescheduleEmail = async (email, firstName, tour) => {
    const currentYear = new Date().getFullYear();

    // ⏰ 1-hour duration assumed
    const endDate = new Date(new Date(tour.date).getTime() + 60 * 60 * 1000);

    const formatDate = (date) => new Date(date).toISOString().replace(/-|:|\.\d+/g, '');

    const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE
  &text=${encodeURIComponent('Property Tour (Rescheduled)')}
  &details=${encodeURIComponent(`Tour Type: ${tour.tourType}`)}
  &location=${encodeURIComponent('Property Location')}
  &dates=${formatDate(tour.date)}/${formatDate(endDate)}`;

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_HELLO}>`,
      to: email,
      subject: 'Tour Rescheduled 🔄',

      text: `Hello ${firstName}, your tour has been rescheduled.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
      Your property tour has been <strong>rescheduled</strong> 🔄
    </p>

    <div style="background:#e8f4fd;padding:15px;border-left:5px solid #2196f3;margin:20px 0;">
      📅 Please take note of the new schedule below
    </div>

    <h3>📋 Updated Tour Details</h3>
    <ul>
      <li>📅 Date: ${new Date(tour.date).toDateString()}</li>
      <li>⏰ Time: ${new Date(tour.date).toLocaleTimeString()}</li>
      <li>🏠 Tour Type: ${tour.tourType}</li>
      <li>💰 Price: ${tour.price}</li>
    </ul>

    <p style="margin:25px 0;">
      <a href="${calendarLink}" 
      style="background:#ec6c10;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;">
      Add to Google Calendar
      </a>
    </p>

    <p>
      If you have any conflicts with the new time, please take action promptly.
    </p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.helloTransporter.sendMail(mailOptions);
  };

  static sendTourCancelEmail = async (email, firstName, tour) => {
    const currentYear = new Date().getFullYear();

    const endDate = new Date(new Date(tour.date).getTime() + 60 * 60 * 1000);

    const formatDate = (date) => new Date(date).toISOString().replace(/-|:|\.\d+/g, '');

    const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE
  &text=${encodeURIComponent('Cancelled Property Tour')}
  &details=${encodeURIComponent('This tour has been cancelled')}
  &location=${encodeURIComponent('Property Location')}
  &dates=${formatDate(tour.date)}/${formatDate(endDate)}`;

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_SUPPORT}>`,
      to: email,
      subject: 'Tour Cancelled ❌',

      text: `Hello ${firstName}, your scheduled tour has been cancelled.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
      Your property tour has been <strong>cancelled</strong> ❌
    </p>

    <div style="background:#fdecea;padding:15px;border-left:5px solid #e53935;margin:20px 0;">
      📌 This booking is no longer active.
    </div>

    <h3>📋 Cancelled Tour Details</h3>
    <ul>
      <li>📅 Date: ${new Date(tour.date).toDateString()}</li>
      <li>⏰ Time: ${new Date(tour.date).toLocaleTimeString()}</li>
      <li>🏠 Tour Type: ${tour.tourType}</li>
      <li>💰 Price: ${tour.price}</li>
    </ul>

    ${
      tour.paid
        ? `
      <div style="background:#e8f5e9;padding:15px;border-left:5px solid #2e7d32;margin:20px 0;">
        💰 A refund has been initiated and will be processed shortly.
      </div>
    `
        : `
      <div style="background:#fff4e5;padding:15px;border-left:5px solid #ec6c10;margin:20px 0;">
        ℹ️ No payment was made for this booking.
      </div>
    `
    }

    <p style="margin:25px 0;">
      <a href="${calendarLink}" 
      style="background:#757575;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">
      Remove from Google Calendar
      </a>
    </p>

    <p>
      If this was a mistake or you would like to book another tour, you can visit our platform anytime.
    </p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.supportTransporter.sendMail(mailOptions);
  };

  static sendPaymentReceiptEmail = async (email, firstName, payment, pdfBuffer) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: 'Payment Successful 💰',

      text: `Hello ${firstName}, your payment was successful.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
      Your payment was <strong>successful</strong> 🎉
    </p>

    <div style="background:#e8f5e9;padding:15px;border-left:5px solid #2e7d32;margin:20px 0;">
      💰 Your transaction has been completed successfully.
    </div>

    <h3>🧾 Payment Details</h3>
    <ul>
      <li>💳 Reference: ${payment.reference}</li>
      <li>💰 Amount: ${payment.amount} ${payment.currency}</li>
      <li>📌 Payment Type: ${payment.paymentFor}</li>
      <li>📅 Date: ${new Date(payment.paidAt || payment.createdAt).toDateString()}</li>
      <li>⏰ Time: ${new Date(payment.paidAt || payment.createdAt).toLocaleTimeString()}</li>
    </ul>

    ${
      payment.paymentFor === 'tour'
        ? `
      <h3>🏠 Tour Details</h3>
      <ul>
        <li>📅 Date: ${new Date(payment.tour?.date).toDateString()}</li>
        <li>⏰ Time: ${new Date(payment.tour?.date).toLocaleTimeString()}</li>
        <li>🏠 Tour Type: ${payment.tour?.tourType}</li>
      </ul>

      <div style="background:#e3f2fd;padding:15px;border-left:5px solid #1976d2;margin:20px 0;">
        📅 Your tour is now <strong>confirmed</strong>.
      </div>
    `
        : ''
    }

    ${
      payment.paymentFor === 'property'
        ? `
      <h3>🏠 Property Details</h3>
      <ul>
        <li>📌 Title: ${payment.property?.title || 'N/A'}</li>
      </ul>
    `
        : ''
    }

    <p style="margin:25px 0;">
      <a href="${process.env.FRONTEND_URL}/payments/${payment._id}" 
      style="background:#ec6c10;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">
      View Payment
      </a>
    </p>

    <p>
      A receipt has been generated for this transaction.
    </p>

    <p><strong>Rurblist Team</strong></p>
     
    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,

      attachments: [
        {
          filename: `receipt-${payment.reference}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    return await SendEmails.verifyTransporter.sendMail(mailOptions);
  };

  static sendPlanActivationEmail = async (email, firstName, plan) => {
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_VERIFY}>`,
      to: email,
      subject: `Your ${plan.name} Plan is Now Active 🚀`,

      text: `Hello ${firstName}, your ${plan.name} plan has been activated successfully.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

      <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

      <p>
        Your <strong>${plan.name}</strong> plan is now <strong>active</strong> 🎉
      </p>

      <div style="background:#e8f5e9;padding:15px;border-left:5px solid #2e7d32;margin:20px 0;">
        🚀 You can now proceed with property purchases and enjoy premium verification features.
      </div>

      <h3>📦 Plan Details</h3>
      <ul>
        <li><strong>Plan:</strong> ${plan.name}</li>
        <li><strong>Price:</strong> ${plan.amount} ${plan.currency || 'NGN'}</li>
        <li><strong>Activated On:</strong> ${new Date().toDateString()}</li>
      </ul>

      <h3>✨ What You Get</h3>
      <ul>
        ${
          plan.features?.map((feature) => `<li>✔️ ${feature}</li>`).join('') ||
          '<li>No features listed</li>'
        }
      </ul>

      <div style="background:#fff3e0;padding:15px;border-left:5px solid #ec6c10;margin:20px 0;">
        💡 You won’t need to pay again for this plan when purchasing properties.
      </div>

      <p style="margin:25px 0;">
        <a href="${process.env.FRONTEND_URL}/properties" 
        style="background:#ec6c10;color:#fff;padding:12px 18px;text-decoration:none;border-radius:5px;">
        Browse Properties
        </a>
      </p>

      <p>
        If you have any questions, feel free to reach out to our support team.
      </p>

      <p><strong>Rurblist Team</strong></p>

      <hr/>
      <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.verifyTransporter.sendMail(mailOptions);
  };

  static sendTourConfirmedEmail = async (email, firstName, tour) => {
    const currentYear = new Date().getFullYear();

    // ⏰ 1-hour duration
    const endDate = new Date(new Date(tour.date).getTime() + 60 * 60 * 1000);

    const formatDate = (date) => new Date(date).toISOString().replace(/-|:|\.\d+/g, '');

    const calendarLink = `https://www.google.com/calendar/render?action=TEMPLATE
  &text=${encodeURIComponent('Property Tour (Confirmed)')}
  &details=${encodeURIComponent(`Tour Type: ${tour.tourType}`)}
  &location=${encodeURIComponent('Property Location')}
  &dates=${formatDate(tour.date)}/${formatDate(endDate)}`;

    const mailOptions = {
      from: `"Rurblist" <${process.env.EMAIL_HELLO}>`,
      to: email,
      subject: 'Tour Confirmed ✅',

      text: `Hello ${firstName}, your property tour has been confirmed.`,

      html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; background:#f9f9f9; padding:20px;">
    <table style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px">

    <h2 style="color:#ec6c10;">Hello ${firstName},</h2>

    <p>
      Your property tour has been <strong>confirmed</strong> ✅
    </p>

    <div style="background:#e8f5e9;padding:15px;border-left:5px solid #4caf50;margin:20px 0;">
      🎉 Your booking is secured. Please arrive on time.
    </div>

    <h3>📋 Tour Details</h3>
    <ul>
      <li>📅 Date: ${new Date(tour.date).toDateString()}</li>
      <li>⏰ Time: ${new Date(tour.date).toLocaleTimeString()}</li>
      <li>🏠 Tour Type: ${tour.tourType}</li>
      <li>💰 Price: ${tour.price}</li>
      <li>📍 Location: ${tour.property?.location?.address || 'N/A'}</li>
    </ul>

    <p style="margin:25px 0;">
      <a href="${calendarLink}" 
      style="background:#ec6c10;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;">
      Add to Google Calendar
      </a>
    </p>

    <p>
      We look forward to helping you explore your future home 🏡
    </p>

    <p><strong>Rurblist Team</strong></p>

    <hr/>
    <p style="font-size:12px;color:#777;">© ${currentYear} Rurblist</p>

    </table>
    </body>
    </html>
    `,
    };

    return await SendEmails.helloTransporter.sendMail(mailOptions);
  };
}

module.exports = SendEmails;
