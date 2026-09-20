import re
import urllib.parse
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.invoice import Invoice, InvoiceStatus
from app.models.reminder import InvoiceReminder, ReminderChannel
from app.schemas.reminder import (
    DueAlertItem,
    DueAlertsResponse,
    InvoiceReminderCreate,
    ReminderTemplateResponse,
)


def format_inr(amount: Decimal) -> str:
    """
    Format decimal amount with Indian comma separation.
    e.g., 6800 -> 6,800; 125000 -> 1,25,000
    If .00, omits decimals. Otherwise includes cents.
    """
    val = Decimal(str(amount)).quantize(Decimal("0.01"))
    s = str(int(abs(val)))
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        chunks = []
        while len(rest) > 2:
            chunks.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            chunks.append(rest)
        formatted = ",".join(reversed(chunks)) + "," + last3
    else:
        formatted = s

    if val % 1 != 0:
        formatted += f".{str(val).split('.')[1]}"
    if val < 0:
        formatted = "-" + formatted
    return formatted


def clean_phone_number(phone: Optional[str]) -> Optional[str]:
    """Clean phone number and add default Indian country code (91) if 10 digits."""
    if not phone:
        return None
    digits = re.sub(r"[^\d+]", "", phone)
    if digits.startswith("+"):
        return digits[1:]
    if len(digits) == 10:
        return f"91{digits}"
    return digits


class ReminderService:
    @classmethod
    def get_invoice_for_business(
        cls, db: Session, invoice_id: uuid.UUID, business_id: uuid.UUID
    ) -> Invoice:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.business_id == business_id,
        ).first()
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )
        return invoice

    @classmethod
    def generate_templates(
        cls, invoice: Invoice
    ) -> Tuple[str, str, str, Optional[str], Decimal]:
        remaining = max(Decimal("0.00"), invoice.total - invoice.paid_amount)
        remaining_str = format_inr(remaining)
        customer_name = invoice.customer.name if invoice.customer else "Customer"
        # First name or short name for friendly salutation
        short_name = customer_name.split()[0] if customer_name else "there"
        invoice_num = invoice.invoice_number
        due_str = invoice.due_date.strftime("%d %b %Y")

        # 1. Standard Template (matches exact specification requested by user):
        # "Hi Raj, this is a reminder regarding invoice INV-0042 for ₹6,800, which is currently pending. Please let us know once the payment is completed."
        standard_msg = (
            f"Hi {short_name}, this is a reminder regarding invoice {invoice_num} "
            f"for ₹{remaining_str}, which is currently pending. "
            f"Please let us know once the payment is completed."
        )

        # 2. Gentle / Advance Template:
        gentle_msg = (
            f"Hi {short_name}, hope you are doing well! This is a gentle reminder "
            f"regarding invoice {invoice_num} with ₹{remaining_str} pending (Due: {due_str}). "
            f"Please let us know once the payment is completed. Thank you!"
        )

        # 3. Urgent / Overdue Template:
        urgent_msg = (
            f"Urgent Reminder: Payment for invoice {invoice_num} (₹{remaining_str}) "
            f"was due on {due_str} and is currently overdue. "
            f"Kindly settle the balance at your earliest convenience."
        )

        # WhatsApp Deep Link
        phone = invoice.customer.phone if invoice.customer else None
        cleaned_phone = clean_phone_number(phone)
        whatsapp_url = None
        if cleaned_phone:
            encoded_text = urllib.parse.quote(standard_msg)
            whatsapp_url = f"https://wa.me/{cleaned_phone}?text={encoded_text}"

        return standard_msg, gentle_msg, urgent_msg, whatsapp_url, remaining

    @classmethod
    def get_reminder_template(
        cls, db: Session, invoice_id: uuid.UUID, business_id: uuid.UUID
    ) -> ReminderTemplateResponse:
        invoice = cls.get_invoice_for_business(db, invoice_id, business_id)
        standard_msg, gentle_msg, urgent_msg, whatsapp_url, remaining = (
            cls.generate_templates(invoice)
        )

        return ReminderTemplateResponse(
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            customer_name=invoice.customer.name if invoice.customer else "",
            customer_phone=invoice.customer.phone if invoice.customer else None,
            invoice_number=invoice.invoice_number,
            due_date=invoice.due_date,
            total_amount=invoice.total,
            paid_amount=invoice.paid_amount,
            remaining_amount=remaining,
            status=invoice.status,
            standard_message=standard_msg,
            gentle_message=gentle_msg,
            urgent_message=urgent_msg,
            whatsapp_url=whatsapp_url,
        )

    @classmethod
    def record_reminder(
        cls,
        db: Session,
        invoice_id: uuid.UUID,
        business_id: uuid.UUID,
        reminder_in: InvoiceReminderCreate,
    ) -> InvoiceReminder:
        invoice = cls.get_invoice_for_business(db, invoice_id, business_id)

        now = datetime.now(timezone.utc)
        reminder = InvoiceReminder(
            business_id=business_id,
            invoice_id=invoice.id,
            channel=reminder_in.channel,
            recipient_name=reminder_in.recipient_name or (invoice.customer.name if invoice.customer else None),
            recipient_phone=reminder_in.recipient_phone or (invoice.customer.phone if invoice.customer else None),
            message=reminder_in.message,
            sent_at=now,
        )

        invoice.last_reminded_at = now
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @classmethod
    def get_reminder_history(
        cls, db: Session, invoice_id: uuid.UUID, business_id: uuid.UUID
    ) -> List[InvoiceReminder]:
        cls.get_invoice_for_business(db, invoice_id, business_id)
        return (
            db.query(InvoiceReminder)
            .filter(
                InvoiceReminder.invoice_id == invoice_id,
                InvoiceReminder.business_id == business_id,
            )
            .order_by(InvoiceReminder.sent_at.desc())
            .all()
        )

    @classmethod
    def get_due_alerts(cls, db: Session, business_id: uuid.UUID) -> DueAlertsResponse:
        """
        Calculates upcoming and overdue invoices requiring reminders.
        Used for automated notification foundation:
          - Due tomorrow -> Notification
          - Due today / Overdue -> Urgent Reminder
        """
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Invoices with outstanding balances not cancelled or fully paid
        invoices = (
            db.query(Invoice)
            .filter(
                Invoice.business_id == business_id,
                Invoice.status.in_([
                    InvoiceStatus.UNPAID,
                    InvoiceStatus.PARTIALLY_PAID,
                    InvoiceStatus.OVERDUE,
                ]),
            )
            .order_by(Invoice.due_date.asc())
            .all()
        )

        alerts: List[DueAlertItem] = []
        due_tomorrow_count = 0
        overdue_count = 0

        for inv in invoices:
            balance = max(Decimal("0.00"), inv.total - inv.paid_amount)
            if balance <= 0:
                continue

            customer_name = inv.customer.name if inv.customer else "Customer"
            customer_phone = inv.customer.phone if inv.customer else None
            balance_str = format_inr(balance)

            if inv.due_date == tomorrow:
                due_tomorrow_count += 1
                msg = (
                    f"Reminder: Invoice {inv.invoice_number} for ₹{balance_str} "
                    f"is due tomorrow. Please arrange payment."
                )
                alerts.append(
                    DueAlertItem(
                        invoice_id=inv.id,
                        invoice_number=inv.invoice_number,
                        customer_id=inv.customer_id,
                        customer_name=customer_name,
                        customer_phone=customer_phone,
                        due_date=inv.due_date,
                        total_amount=inv.total,
                        remaining_amount=balance,
                        status=inv.status,
                        alert_type="DUE_TOMORROW",
                        days_offset=1,
                        suggested_message=msg,
                    )
                )
            elif inv.due_date < today:
                overdue_count += 1
                days_overdue = (today - inv.due_date).days
                msg = (
                    f"Overdue Notice: Invoice {inv.invoice_number} for ₹{balance_str} "
                    f"was due on {inv.due_date.strftime('%d %b')} ({days_overdue} days overdue). "
                    f"Please settle the payment immediately."
                )
                alerts.append(
                    DueAlertItem(
                        invoice_id=inv.id,
                        invoice_number=inv.invoice_number,
                        customer_id=inv.customer_id,
                        customer_name=customer_name,
                        customer_phone=customer_phone,
                        due_date=inv.due_date,
                        total_amount=inv.total,
                        remaining_amount=balance,
                        status=inv.status,
                        alert_type="OVERDUE",
                        days_offset=-days_overdue,
                        suggested_message=msg,
                    )
                )

        return DueAlertsResponse(
            due_tomorrow_count=due_tomorrow_count,
            overdue_count=overdue_count,
            total_alerts=len(alerts),
            alerts=alerts,
        )
