const nodemailer = require("nodemailer");

class SendEmails {
  static transporter = nodemailer.createTransport({
    service: "gmail",
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
}

module.exports = SendEmails;

