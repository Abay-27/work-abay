import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/notify", async (req, res) => {
    const { orderId, customerName, customerEmail, customerPhone, items, totalAmount } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || "ABAYGEBEYAW1996@gmail.com";
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    const itemsHtml = items.map((item: any) => `
      <li>${item.quantity}x ${item.name} - ${item.price.toLocaleString()} ETB</li>
    `).join("");

    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #059669;">Order Confirmation / የትዕዛዝ ማረጋገጫ</h2>
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Thank you for your order at Abay Bedding Solutions. Your order has been placed successfully.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Order ID</p>
          <p style="margin: 0; font-weight: bold; font-family: monospace;">${orderId}</p>
        </div>
        <h3>Order Summary:</h3>
        <ul>${itemsHtml}</ul>
        <p style="font-size: 18px; font-weight: bold;">Total: ${totalAmount.toLocaleString()} ETB</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">If you have any questions, please contact us at ${adminEmail}.</p>
      </div>
    `;

    // 1. Send Email
    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      try {
        // To Customer
        await transporter.sendMail({
          from: `"Abay Bedding Solutions" <${emailUser}>`,
          to: customerEmail,
          subject: `Order Confirmation - ${orderId}`,
          html: emailBody,
        });

        // To Admin
        await transporter.sendMail({
          from: `"Abay Bedding Solutions" <${emailUser}>`,
          to: adminEmail,
          subject: `New Order Received - ${orderId}`,
          html: `<h3>New Order from ${customerName}</h3>${emailBody}`,
        });
        
        console.log(`Emails sent for order ${orderId}`);
      } catch (error: any) {
        if (error.code === 'EAUTH') {
          console.error("Email Authentication Failed (535): Please ensure you are using a Gmail 'App Password' and not your regular password. See: https://support.google.com/accounts/answer/185833");
        } else {
          console.error("Email sending failed:", error);
        }
      }
    } else {
      console.warn("Email credentials not configured. Skipping email notification.");
    }

    // 2. Send SMS (Twilio)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioPhone && customerPhone) {
      const client = twilio(twilioSid, twilioToken);
      const smsBody = `Abay Bedding Solutions: Order ${orderId} placed successfully. Total: ${totalAmount.toLocaleString()} ETB. Thank you!`;

      try {
        await client.messages.create({
          body: smsBody,
          from: twilioPhone,
          to: customerPhone.startsWith('0') ? `+251${customerPhone.substring(1)}` : customerPhone,
        });
        console.log(`SMS sent for order ${orderId}`);
      } catch (error) {
        console.error("SMS sending failed:", error);
      }
    } else {
      console.warn("Twilio credentials not configured or phone missing. Skipping SMS notification.");
    }

    res.json({ success: true });
  });

  app.post("/api/merchant-notify", async (req, res) => {
    const { email, storeName, status, reason } = req.body;

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "ABAYGEBEYAW1996@gmail.com";

    if (!emailUser || !emailPass) {
      console.warn("Email credentials not configured. Skipping merchant notification.");
      return res.json({ success: false, message: "Email not configured" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const isApproved = status === 'approved';
    const subject = isApproved ? `Merchant Application Approved - ${storeName}` : `Merchant Application Update - ${storeName}`;
    
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: ${isApproved ? '#059669' : '#dc2626'};">Merchant Application ${isApproved ? 'Approved' : 'Declined'}</h2>
        <p>Hello,</p>
        <p>Your application to become a merchant for <strong>${storeName}</strong> on WORK_ABAY MART has been <strong>${status}</strong>.</p>
        
        ${isApproved ? `
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <p style="margin: 0; color: #166534; font-weight: bold;">Congratulations!</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;">You can now log in to your account and access the Merchant Dashboard to start listing your products.</p>
          </div>
        ` : `
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Application Status: Declined</p>
            ${reason ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #991b1b;">Reason: ${reason}</p>` : ''}
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #991b1b;">If you have any questions, please contact our support team.</p>
          </div>
        `}
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">This is an automated message from WORK_ABAY MART ETHIOPIA. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"WORK_ABAY MART" <${emailUser}>`,
        to: email,
        subject: subject,
        html: emailHtml,
      });
      console.log(`Merchant notification email sent to ${email} (Status: ${status})`);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send merchant notification email:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
