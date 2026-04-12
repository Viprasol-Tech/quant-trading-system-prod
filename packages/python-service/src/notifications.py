"""
Email notifications system
Sends alerts for trading signals, orders, and risk events
"""

import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailNotifier:
    """Simple email notifier using SMTP"""

    def __init__(self):
        self.email_from = os.getenv('ALERT_EMAIL_FROM')
        self.email_to = os.getenv('ALERT_EMAIL_TO')
        self.smtp_host = os.getenv('SMTP_HOST')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER')
        self.smtp_pass = os.getenv('SMTP_PASS')

        self.enabled = all([self.email_from, self.email_to, self.smtp_host])

        if not self.enabled:
            logger.warning(
                'Email alerts disabled (missing: '
                f'ALERT_EMAIL_FROM={not self.email_from}, '
                f'ALERT_EMAIL_TO={not self.email_to}, '
                f'SMTP_HOST={not self.smtp_host})'
            )
        else:
            logger.info(f'Email alerts enabled: {self.email_from} -> {self.email_to}')

    def send_alert(self, subject: str, body: str, alert_type: str = 'info') -> bool:
        """
        Send email alert

        Args:
            subject: Email subject
            body: Email body
            alert_type: 'info', 'warning', 'critical'

        Returns:
            True if sent, False otherwise
        """
        if not self.enabled:
            logger.debug(f'Email alerts disabled, skipping: {subject}')
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_from
            msg['To'] = self.email_to

            # Add alert type to subject
            if alert_type == 'critical':
                msg['Subject'] = f'[CRITICAL] {subject}'
            elif alert_type == 'warning':
                msg['Subject'] = f'[WARNING] {subject}'
            else:
                msg['Subject'] = f'[TRADING SYSTEM] {subject}'

            # Format body with timestamp
            footer = f'\n\n---\nTimestamp: {datetime.now().isoformat()}\nAlert Type: {alert_type}'
            msg.attach(MIMEText(body + footer, 'plain'))

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()

                if self.smtp_user and self.smtp_pass:
                    server.login(self.smtp_user, self.smtp_pass)

                server.sendmail(self.email_from, self.email_to, msg.as_string())

            logger.info(f'Alert sent: {subject}')
            return True

        except Exception as e:
            logger.error(f'Failed to send alert: {e}')
            return False

    def notify_signal(self, symbol: str, direction: str, price: float, confidence: int) -> bool:
        """Notify when new trading signal generated"""
        subject = f'New Trading Signal: {symbol}'
        body = f'''
Trading Signal Generated

Symbol: {symbol}
Direction: {direction}
Entry Price: ${price:.2f}
Confidence: {confidence}%

Action Required: Review and confirm trade execution if auto-trading is disabled.
'''
        return self.send_alert(subject, body, 'info')

    def notify_order_executed(self, symbol: str, side: str, quantity: int, price: float, order_id: str) -> bool:
        """Notify when order executed"""
        subject = f'Order Executed: {symbol}'
        body = f'''
Order Execution Confirmation

Order ID: {order_id}
Symbol: {symbol}
Side: {side}
Quantity: {quantity}
Price: ${price:.2f}
Total Value: ${quantity * price:,.2f}

Status: Order filled successfully.
'''
        return self.send_alert(subject, body, 'info')

    def notify_drawdown_threshold(self, drawdown_pct: float, threshold: int) -> bool:
        """Notify when drawdown threshold crossed"""
        alert_type = 'critical' if drawdown_pct > 15 else 'warning'
        subject = f'Drawdown Alert: {drawdown_pct:.1f}% (>{threshold}%)'
        body = f'''
Portfolio Drawdown Threshold Exceeded

Current Drawdown: {drawdown_pct:.2f}%
Threshold: {threshold}%

Action: Review portfolio and consider reducing risk exposure.
'''
        return self.send_alert(subject, body, alert_type)

    def notify_ibkr_disconnected(self) -> bool:
        """Notify when IBKR connection lost"""
        subject = 'IBKR Connection Lost'
        body = '''
The connection to Interactive Brokers Gateway has been lost.

Status: Trading system is operating in degraded mode.
Action Required: Check IBKR Gateway status and re-establish connection.

Note: The system will continue to monitor and attempt reconnection.
'''
        return self.send_alert(subject, body, 'critical')

    def notify_ibkr_reconnected(self) -> bool:
        """Notify when IBKR connection restored"""
        subject = 'IBKR Connection Restored'
        body = '''
The connection to Interactive Brokers Gateway has been successfully restored.

Status: Trading system operating normally.
'''
        return self.send_alert(subject, body, 'info')


# Global instance
_notifier = None


def get_notifier() -> EmailNotifier:
    """Get or create notifier instance"""
    global _notifier
    if _notifier is None:
        _notifier = EmailNotifier()
    return _notifier
