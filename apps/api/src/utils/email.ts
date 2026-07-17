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
}

export async function sendBookingConfirmationEmail(params: EmailParams) {
  const { to, studentName, libraryName, seatCode, date, slotName, price } = params;

  const mailOptions = {
    from: `"StudySpace" <${env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `Booking Confirmed: Seat ${seatCode} at ${libraryName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #FF385C; border-bottom: 2px solid #FF385C; padding-bottom: 10px;">StudySpace Booking Confirmation</h2>
        <p>Dear ${studentName},</p>
        <p>Your self-study seat reservation has been successfully booked and confirmed!</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Reservation Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">Library:</td>
              <td style="padding: 8px 0; color: #333;">${libraryName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Seat Code:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 16px; font-weight: bold;">${seatCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0; color: #333;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Slot:</td>
              <td style="padding: 8px 0; color: #333;">${slotName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Price Paid:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold; color: #FF385C;">₹${price}</td>
            </tr>
          </table>
        </div>
        <p>Please present this email at the library reception when checking in.</p>
        <p>Happy learning!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">StudySpace Inc. © 2026</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent via SES SMTP:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending confirmation email via SES SMTP:", error);
    throw error;
  }
}
