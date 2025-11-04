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

const AppointmentUtils = {
  createAppointmentConfirmationEmail,
};

export default AppointmentUtils;
