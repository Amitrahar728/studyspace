import * as nodemailer from "nodemailer";
import env from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface EmailParams {
  to: string;
  studentName: string;
  libraryName: string;
  seatCode: string;
  date: string;
  slotName: string;
  price: number;
  accessKey?: string;
}

export async function sendBookingConfirmationEmail(params: EmailParams) {
  const { to, studentName, libraryName, seatCode, date, slotName, price, accessKey } = params;

  const text = `Booking Confirmed: ${libraryName}

Dear ${studentName},

Your self-study seat is booked. Show this email at reception when you arrive.

Access Key: ${accessKey || "N/A"}
Seat: ${seatCode}
Date: ${date}
Slot: ${slotName}
Amount Paid: ₹${price}

Alcove Inc.`;

  const html = `
    <div style="max-width: 520px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 12px; border: 1px solid #ececec; overflow: hidden;">
      <div style="padding: 28px 32px 20px; border-bottom: 2px solid #FF385C;">
        <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.06em; color: #999999; margin: 0 0 6px; text-transform: uppercase;">Booking Confirmed</p>
        <h1 style="font-size: 21px; font-weight: 700; margin: 0; color: #1a1a1a; line-height: 1.3;">${libraryName}</h1>
      </div>

      <div style="padding: 24px 32px 12px;">
        <p style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0 0 6px;">Dear ${studentName},</p>
        <p style="font-size: 14px; color: #666666; margin: 0 0 20px; line-height: 1.6;">
          Your self-study seat is booked. Please show your Access Key at reception when you arrive.
        </p>
      </div>

      ${
        accessKey
          ? `<div style="margin: 0 32px 20px; padding: 16px; background-color: #0f172a; border-radius: 10px; text-align: center;">
              <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px;">Reception Access Key</p>
              <p style="font-size: 22px; font-weight: 900; font-family: 'Courier New', Consolas, monospace; color: #38bdf8; letter-spacing: 0.08em; margin: 0;">${accessKey}</p>
            </div>`
          : ""
      }

      <div style="padding: 0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #888888;">Seat</td>
            <td align="right" style="padding: 14px 0; border-top: 1px solid #f0f0f0;">
              <span style="font-size: 14px; font-weight: 700; font-family: 'Courier New', Consolas, monospace; background-color: #fdeef1; color: #c22c4f; padding: 4px 10px; border-radius: 6px; display: inline-block;">${seatCode}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #888888;">Date</td>
            <td align="right" style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #1a1a1a;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #888888;">Slot</td>
            <td align="right" style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #1a1a1a;">${slotName}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #888888;">Amount Paid</td>
            <td align="right" style="padding: 14px 0; border-top: 1px solid #f0f0f0; font-size: 16px; font-weight: 700; color: #1a1a1a;">₹${price}</td>
          </tr>
        </table>
      </div>

      <div style="padding: 16px 32px 24px; border-top: 1px solid #f0f0f0;">
        <p style="font-size: 12px; color: #bbbbbb; margin: 0; text-align: center;">Alcove Inc.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Alcove" <${env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `Booking Confirmed: Seat ${seatCode} at ${libraryName}`,
    text,
    html,
  };

  try {
    if (!to || !to.includes("@")) {
      console.warn("Invalid or missing email recipient address:", to);
      return null;
    }
    const info = await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${to} via SES SMTP:`, info.messageId);
    return info;
  } catch (error: any) {
    console.error(`Error sending confirmation email to ${to} via SES SMTP:`, error?.message || error);
    return null;
  }
}
