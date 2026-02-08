import config from '../../config';

interface AppointmentEmailData {
  clientName: string;
  counselorName: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: 'ONLINE' | 'IN_PERSON';
  meetingLink?: string;
  counselorId: string;
}

const createAppointmentConfirmationEmail = (
  data: AppointmentEmailData,
): string => {
  const bookingLink = `${config.frontend_base_url}/book/${data.counselorId}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Confirmation</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 0;
                background-color: #ffffff;
            }
            .header {
                background-color: #007bff;
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 30px 40px;
            }
            .appointment-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #007bff;
            }
            .detail-row {
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 140px;
            }
            .detail-value {
                color: #212529;
            }
            .meeting-link {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
            }
            .meeting-link a {
                color: #007bff;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
            }
            .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #007bff;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .note {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                margin-top: 30px;
                padding: 20px 40px 30px;
                font-size: 13px;
                color: #6c757d;
                text-align: center;
                background-color: #f8f9fa;
            }
            .divider {
                height: 1px;
                background-color: #dee2e6;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Confirmed</h1>
            </div>

            <div class="content">
                <p>Hello <strong>${data.clientName}</strong>,</p>

                <p>Your counseling appointment has been successfully scheduled by ${data.counselorName}. We look forward to meeting with you!</p>

                <div class="appointment-details">
                    <div class="detail-row">
                        <span class="detail-label">Counselor:</span>
                        <span class="detail-value">${data.counselorName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${data.appointmentDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${data.appointmentTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Session Type:</span>
                        <span class="detail-value">${data.sessionType === 'ONLINE' ? 'Online Session' : 'In-Person Session'}</span>
                    </div>
                </div>

                ${
                  data.meetingLink && data.sessionType === 'ONLINE'
                    ? `
                <div class="meeting-link">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Join your online session:</p>
                    <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a>
                </div>
                `
                    : ''
                }

                <div class="note">
                    <strong>Important:</strong> Please join the meeting a few minutes early to ensure a smooth start to your session.
                </div>

                <div class="divider"></div>

                <p style="text-align: center; margin: 25px 0;">
                    <a href="${bookingLink}" class="button">Book Another Appointment</a>
                </p>

                <p style="margin-top: 25px;">If you need to reschedule or have any questions, please contact your counselor directly.</p>
            </div>

            <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p style="margin: 5px 0;">&copy; Alexander Rodriguez Booking System</p>
                <p style="margin: 5px 0; font-size: 12px;">Your privacy is important to us. This appointment confirmation is confidential.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

interface PaymentLinkEmailData {
  clientName: string;
  counselorName: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: 'ONLINE' | 'IN_PERSON';
  amount: number;
  currency: string;
  paymentLink: string;
  tokenExpiry: string;
}

const createPaymentLinkEmail = (data: PaymentLinkEmailData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Complete Your Appointment Payment</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 0;
                background-color: #ffffff;
            }
            .header {
                background-color: #28a745;
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 30px 40px;
            }
            .appointment-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #28a745;
            }
            .detail-row {
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 140px;
            }
            .detail-value {
                color: #212529;
            }
            .payment-amount {
                background-color: #e7f7ef;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                text-align: center;
                border: 2px solid #28a745;
            }
            .amount-label {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 5px;
            }
            .amount-value {
                font-size: 32px;
                font-weight: bold;
                color: #28a745;
                margin: 10px 0;
            }
            .button {
                display: inline-block;
                padding: 15px 40px;
                background-color: #28a745;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
                font-weight: bold;
                font-size: 18px;
            }
            .button:hover {
                background-color: #218838;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .note {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .alert {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                color: #721c24;
            }
            .footer {
                margin-top: 30px;
                padding: 20px 40px 30px;
                font-size: 13px;
                color: #6c757d;
                text-align: center;
                background-color: #f8f9fa;
            }
            .divider {
                height: 1px;
                background-color: #dee2e6;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Payment Required for Your Appointment</h1>
            </div>

            <div class="content">
                <p>Hello <strong>${data.clientName}</strong>,</p>

                <p>Your counseling appointment with ${data.counselorName} has been reserved. To complete your booking, please proceed with payment.</p>

                <div class="appointment-details">
                    <div class="detail-row">
                        <span class="detail-label">Counselor:</span>
                        <span class="detail-value">${data.counselorName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${data.appointmentDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${data.appointmentTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Session Type:</span>
                        <span class="detail-value">${data.sessionType === 'ONLINE' ? 'Online Session' : 'In-Person Session'}</span>
                    </div>
                </div>

                <div class="payment-amount">
                    <div class="amount-label">Total Amount Due:</div>
                    <div class="amount-value">${data.currency} $${data.amount.toFixed(2)}</div>
                </div>

                <div class="button-container">
                    <a href="${data.paymentLink}" class="button">Complete Payment Now</a>
                </div>

                <div class="alert">
                    <strong>Important:</strong> This payment link will expire on ${data.tokenExpiry}. Please complete your payment before the expiration time to secure your appointment.
                </div>

                <div class="note">
                    <strong>What happens next?</strong><br>
                    1. Click the payment button above<br>
                    2. Complete the secure payment process<br>
                    3. Receive instant confirmation with meeting details
                </div>

                <div class="divider"></div>

                <p style="margin-top: 25px; font-size: 14px;">If you did not request this appointment or have any questions, please contact us immediately.</p>
            </div>

            <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p style="margin: 5px 0;">&copy; Alexander Rodriguez Booking System</p>
                <p style="margin: 5px 0; font-size: 12px;">All payments are processed securely through Stripe.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

interface CounselorNotificationData {
  counselorName: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: 'ONLINE' | 'IN_PERSON';
  clientEmail: string;
  clientPhone: string;
  meetingLink?: string;
  notes?: string;
}

const createCounselorNotificationEmail = (
  data: CounselorNotificationData,
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Appointment Notification</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 0;
                background-color: #ffffff;
            }
            .header {
                background-color: #17a2b8;
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 30px 40px;
            }
            .appointment-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #17a2b8;
            }
            .detail-row {
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 140px;
            }
            .detail-value {
                color: #212529;
            }
            .meeting-link {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
            }
            .meeting-link a {
                color: #007bff;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
            }
            .note {
                background-color: #d1ecf1;
                border-left: 4px solid #17a2b8;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                margin-top: 30px;
                padding: 20px 40px 30px;
                font-size: 13px;
                color: #6c757d;
                text-align: center;
                background-color: #f8f9fa;
            }
            .divider {
                height: 1px;
                background-color: #dee2e6;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Appointment Scheduled</h1>
            </div>

            <div class="content">
                <p>Hello <strong>${data.counselorName}</strong>,</p>

                <p>A new appointment has been scheduled with you. Here are the details:</p>

                <div class="appointment-details">
                    <div class="detail-row">
                        <span class="detail-label">Client Name:</span>
                        <span class="detail-value">${data.clientName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Client Email:</span>
                        <span class="detail-value">${data.clientEmail}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Client Phone:</span>
                        <span class="detail-value">${data.clientPhone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${data.appointmentDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${data.appointmentTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Session Type:</span>
                        <span class="detail-value">${data.sessionType === 'ONLINE' ? 'Online Session' : 'In-Person Session'}</span>
                    </div>
                    ${
                      data.notes
                        ? `
                    <div class="detail-row">
                        <span class="detail-label">Notes:</span>
                        <span class="detail-value">${data.notes}</span>
                    </div>
                    `
                        : ''
                    }
                </div>

                ${
                  data.meetingLink && data.sessionType === 'ONLINE'
                    ? `
                <div class="meeting-link">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Online Meeting Link:</p>
                    <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a>
                </div>
                `
                    : ''
                }

                <div class="note">
                    <strong>Reminder:</strong> Please ensure you're prepared for this session. The client has been notified and will receive the same meeting details.
                </div>

                <p style="margin-top: 25px;">This appointment has been confirmed and added to your calendar.</p>
            </div>

            <div class="footer">
                <p>This is an automated notification from your booking system.</p>
                <p style="margin: 5px 0;">&copy; Alexander Rodriguez Booking System</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

interface ConfirmedWithPaymentEmailData {
  clientName: string;
  counselorName: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: 'ONLINE' | 'IN_PERSON';
  meetingLink?: string;
  counselorId: string;
  amount: number;
  currency: string;
  paymentLink: string;
  tokenExpiry: string;
}

const createConfirmedWithPaymentEmail = (
  data: ConfirmedWithPaymentEmailData,
): string => {
  const bookingLink = `${config.frontend_base_url}/book/${data.counselorId}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Confirmed - Payment Required</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 0;
                background-color: #ffffff;
            }
            .header {
                background-color: #007bff;
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 30px 40px;
            }
            .appointment-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #007bff;
            }
            .detail-row {
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #495057;
                display: inline-block;
                width: 140px;
            }
            .detail-value {
                color: #212529;
            }
            .meeting-link {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                text-align: center;
            }
            .meeting-link a {
                color: #007bff;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
            }
            .payment-section {
                background-color: #fff8e6;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #ffc107;
            }
            .payment-amount {
                background-color: #e7f7ef;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                text-align: center;
                border: 2px solid #28a745;
            }
            .amount-label {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 5px;
            }
            .amount-value {
                font-size: 28px;
                font-weight: bold;
                color: #28a745;
                margin: 5px 0;
            }
            .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #28a745;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #218838;
            }
            .button-secondary {
                display: inline-block;
                padding: 10px 25px;
                background-color: #007bff;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
                font-weight: bold;
                font-size: 14px;
            }
            .note {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .alert {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .footer {
                margin-top: 30px;
                padding: 20px 40px 30px;
                font-size: 13px;
                color: #6c757d;
                text-align: center;
                background-color: #f8f9fa;
            }
            .divider {
                height: 1px;
                background-color: #dee2e6;
                margin: 20px 0;
            }
            .section-title {
                color: #495057;
                font-size: 18px;
                margin-bottom: 15px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Confirmed</h1>
            </div>

            <div class="content">
                <p>Hello <strong>${data.clientName}</strong>,</p>

                <p>Great news! Your counseling appointment with ${data.counselorName} has been confirmed. Below are your appointment details.</p>

                <div class="note">
                    <strong>Your booking is confirmed!</strong> You can attend your session as scheduled.
                </div>

                <div class="appointment-details">
                    <div class="detail-row">
                        <span class="detail-label">Counselor:</span>
                        <span class="detail-value">${data.counselorName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${data.appointmentDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${data.appointmentTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Session Type:</span>
                        <span class="detail-value">${data.sessionType === 'ONLINE' ? 'Online Session' : 'In-Person Session'}</span>
                    </div>
                </div>

                ${
                  data.meetingLink && data.sessionType === 'ONLINE'
                    ? `
                <div class="meeting-link">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Join your online session:</p>
                    <a href="${data.meetingLink}" target="_blank">${data.meetingLink}</a>
                </div>
                `
                    : ''
                }

                <div class="divider"></div>

                <div class="payment-section">
                    <div class="section-title">Payment Required</div>
                    <p style="margin: 0 0 15px 0;">Please complete the payment for your session at your earliest convenience.</p>

                    <div class="payment-amount">
                        <div class="amount-label">Amount Due:</div>
                        <div class="amount-value">${data.currency} $${data.amount.toFixed(2)}</div>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.paymentLink}" class="button">Complete Payment</a>
                    </div>

                    <p style="font-size: 13px; color: #856404; margin: 0;">Payment link expires on ${data.tokenExpiry}</p>
                </div>

                <div class="alert">
                    <strong>Important:</strong> Please join the meeting a few minutes early to ensure a smooth start to your session.
                </div>

                <div class="divider"></div>

                <p style="text-align: center; margin: 25px 0;">
                    <a href="${bookingLink}" class="button-secondary">Book Another Appointment</a>
                </p>

                <p style="margin-top: 25px;">If you need to reschedule or have any questions, please contact your counselor directly.</p>
            </div>

            <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p style="margin: 5px 0;">&copy; Alexander Rodriguez Booking System</p>
                <p style="margin: 5px 0; font-size: 12px;">Your privacy is important to us. This appointment confirmation is confidential.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const AppointmentUtils = {
  createAppointmentConfirmationEmail,
  createPaymentLinkEmail,
  createCounselorNotificationEmail,
  createConfirmedWithPaymentEmail,
};

export default AppointmentUtils;
