import os
import smtplib
import logging
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Setup logger for production-ready reporting
logger = logging.getLogger("email_service")
logging.basicConfig(level=logging.INFO)

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

# Safely parse port
try:
    SMTP_PORT = int(SMTP_PORT)
except (ValueError, TypeError):
    SMTP_PORT = 587

def send_email(recipient_email: str, subject: str, body: str, is_html: bool = False) -> bool:
    """
    Sends an email synchronously using SMTP.
    Supports both HTML and plain text formats.
    
    Args:
        recipient_email (str): The email address of the receiver.
        subject (str): The subject line of the email.
        body (str): The content/message of the email.
        is_html (bool): True if the body is HTML formatted; False if plain text.
        
    Returns:
        bool: True if the email was successfully sent, False otherwise.
    """
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM]):
        logger.error("SMTP credentials are not fully configured in the environment variables.")
        return False

    try:
        # Create message container
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = recipient_email

        # Attach text or HTML body
        part = MIMEText(body, "html" if is_html else "plain")
        msg.attach(part)

        # Connect to the SMTP server and send the email
        logger.info(f"Connecting to SMTP server at {SMTP_HOST}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()  # Upgrade secure connection
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Successfully sent email to {recipient_email}")
        return True
    except Exception as e:
        logger.exception(f"Failed to send email to {recipient_email} due to error: {e}")
        return False

async def send_email_async(recipient_email: str, subject: str, body: str, is_html: bool = False) -> bool:
    """
    Asynchronously sends an email by executing the blocking synchronous SMTP operations
    in a separate worker thread. This prevents the FastAPI event loop from blocking.
    """
    return await asyncio.to_thread(send_email, recipient_email, subject, body, is_html)


async def send_meeting_email(recipient_email: str, recipient_name: str, title: str, date_str: str, time_str: str, agenda: str, meet_link: str) -> bool:
    """
    Sends a professional styled HTML email invitation for scheduled meetings.
    """
    subject = f"Scheduled Meeting: {title}"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="background-color: #E53935; padding: 24px; text-align: center; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">EduStream Scheduled Meeting</h2>
                </div>
                <div style="padding: 24px;">
                    <p style="font-size: 16px; margin-top: 0;">Hello {recipient_name},</p>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">You have been invited to a scheduled meeting. Here are the meeting details:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 120px; font-size: 14px;">Title:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">{title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">{date_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px;">Time:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">{time_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px;">Agenda:</td>
                            <td style="padding: 8px 0; color: #4b5563; font-size: 14px;">{agenda or "N/A"}</td>
                        </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="{meet_link}" style="background-color: #E53935; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 14px; display: inline-block;">Join Google Meet</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">This is an automated message from your EduStream Learning Platform.</p>
                </div>
            </div>
        </body>
    </html>
    """
    return await send_email_async(recipient_email, subject, body, is_html=True)
