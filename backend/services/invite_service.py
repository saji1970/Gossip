"""
Email invite service for group invitations.
Sends invite emails via SMTP when configured, otherwise logs and succeeds silently.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def send_invite_email(to_email: str, group_name: str, inviter_name: str) -> bool:
    """Send an invite email. Returns True if sent, False if SMTP not configured or failed."""
    if not _smtp_configured():
        logger.info(
            "SMTP not configured — skipping email invite to %s for group '%s'",
            to_email,
            group_name,
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"You're invited to join {group_name} on Gossip!"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        text_body = (
            f"Hi there!\n\n"
            f"{inviter_name} has invited you to join the group \"{group_name}\" on Gossip.\n\n"
            f"Open the Gossip app to accept the invitation.\n\n"
            f"— The Gossip Team"
        )

        html_body = f"""
        <html><body style="font-family: -apple-system, sans-serif; color: #333;">
        <h2 style="color: #818CF8;">You're invited to Gossip!</h2>
        <p><strong>{inviter_name}</strong> has invited you to join
        <strong>{group_name}</strong>.</p>
        <p>Open the Gossip app to accept the invitation.</p>
        <p style="color: #999; font-size: 12px;">— The Gossip Team</p>
        </body></html>
        """

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        logger.info("Invite email sent to %s for group '%s'", to_email, group_name)
        return True
    except Exception as exc:
        logger.warning("Failed to send invite email to %s: %s", to_email, exc)
        return False
