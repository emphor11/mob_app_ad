from datetime import date
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.business import Business
from app.models.customer import Customer
from app.models.quotation import Quotation
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.schemas.dashboard import (
    DashboardMetrics,
    DashboardResponse,
    RecentQuotationItem,
    RecentInvoiceItem,
    RecentPaymentItem,
    OverdueInvoiceItem,
)


class DashboardService:
    @classmethod
    def get_dashboard_summary(cls, db: Session, business: Business) -> DashboardResponse:
        today = date.today()
        b_id = business.id

        # 1. Counts
        customers_count = db.scalar(
            select(func.count(Customer.id)).where(Customer.business_id == b_id)
        ) or 0

        quotations_count = db.scalar(
            select(func.count(Quotation.id)).where(Quotation.business_id == b_id)
        ) or 0

        invoices_count = db.scalar(
            select(func.count(Invoice.id)).where(
                Invoice.business_id == b_id,
                Invoice.status != InvoiceStatus.CANCELLED,
            )
        ) or 0

        # 2. Total Sales (non-cancelled invoice totals)
        total_sales_raw = db.scalar(
            select(func.sum(Invoice.total)).where(
                Invoice.business_id == b_id,
                Invoice.status != InvoiceStatus.CANCELLED,
            )
        )
        total_sales = Decimal(str(total_sales_raw or "0.00")).quantize(Decimal("0.01"))

        # 3. Total Collected (sum of all recorded payments)
        total_collected_raw = db.scalar(
            select(func.sum(Payment.amount)).where(
                Payment.business_id == b_id,
            )
        )
        total_collected = Decimal(str(total_collected_raw or "0.00")).quantize(Decimal("0.01"))

        # 4. Outstanding
        outstanding = max(Decimal("0.00"), total_sales - total_collected)

        # 5. Overdue & Overdue Invoices List
        overdue_invoices_query = (
            select(Invoice)
            .join(Customer, Invoice.customer_id == Customer.id)
            .where(
                Invoice.business_id == b_id,
                Invoice.status != InvoiceStatus.CANCELLED,
                Invoice.due_date < today,
            )
            .order_by(Invoice.due_date.asc())
        )
        overdue_invoices_raw = list(db.scalars(overdue_invoices_query).all())

        overdue_amount = Decimal("0.00")
        overdue_items: List[OverdueInvoiceItem] = []

        for inv in overdue_invoices_raw:
            remaining = max(Decimal("0.00"), inv.total - inv.paid_amount)
            if remaining > 0:
                overdue_amount += remaining
                days_overdue = (today - inv.due_date).days
                overdue_items.append(
                    OverdueInvoiceItem(
                        id=inv.id,
                        invoice_number=inv.invoice_number,
                        customer_id=inv.customer_id,
                        customer_name=inv.customer.name if inv.customer else "Customer",
                        customer_phone=inv.customer.phone if inv.customer else None,
                        total=inv.total,
                        paid_amount=inv.paid_amount,
                        remaining_amount=remaining,
                        due_date=inv.due_date,
                        days_overdue=days_overdue,
                    )
                )

        metrics = DashboardMetrics(
            total_sales=total_sales,
            total_collected=total_collected,
            outstanding=outstanding,
            overdue=overdue_amount.quantize(Decimal("0.01")),
            customers_count=customers_count,
            quotations_count=quotations_count,
            invoices_count=invoices_count,
        )

        # 6. Recent Quotations (top 5)
        recent_quotes_query = (
            select(Quotation)
            .join(Customer, Quotation.customer_id == Customer.id)
            .where(Quotation.business_id == b_id)
            .order_by(Quotation.created_at.desc())
            .limit(5)
        )
        recent_quotes = list(db.scalars(recent_quotes_query).all())
        recent_quotation_items = [
            RecentQuotationItem(
                id=q.id,
                quotation_number=q.quotation_number,
                customer_id=q.customer_id,
                customer_name=q.customer.name if q.customer else "Customer",
                total=q.total,
                status=q.status,
                issue_date=q.issue_date,
                valid_until=q.valid_until,
                created_at=q.created_at,
            )
            for q in recent_quotes
        ]

        # 7. Recent Invoices (top 5)
        recent_invoices_query = (
            select(Invoice)
            .join(Customer, Invoice.customer_id == Customer.id)
            .where(
                Invoice.business_id == b_id,
                Invoice.status != InvoiceStatus.CANCELLED,
            )
            .order_by(Invoice.created_at.desc())
            .limit(5)
        )
        recent_invs = list(db.scalars(recent_invoices_query).all())
        recent_invoice_items = [
            RecentInvoiceItem(
                id=inv.id,
                invoice_number=inv.invoice_number,
                customer_id=inv.customer_id,
                customer_name=inv.customer.name if inv.customer else "Customer",
                total=inv.total,
                paid_amount=inv.paid_amount,
                remaining_amount=max(Decimal("0.00"), inv.total - inv.paid_amount),
                status=inv.status,
                issue_date=inv.issue_date,
                due_date=inv.due_date,
                created_at=inv.created_at,
            )
            for inv in recent_invs
        ]

        # 8. Recent Payments (top 5)
        recent_payments_query = (
            select(Payment)
            .join(Invoice, Payment.invoice_id == Invoice.id)
            .where(Payment.business_id == b_id)
            .order_by(Payment.payment_date.desc(), Payment.created_at.desc())
            .limit(5)
        )
        recent_pmts = list(db.scalars(recent_payments_query).all())
        recent_payment_items = [
            RecentPaymentItem(
                id=p.id,
                invoice_id=p.invoice_id,
                invoice_number=p.invoice.invoice_number if p.invoice else "",
                customer_name=p.invoice.customer.name if (p.invoice and p.invoice.customer) else "Customer",
                amount=p.amount,
                method=p.method,
                payment_date=p.payment_date,
                created_at=p.created_at,
            )
            for p in recent_pmts
        ]

        return DashboardResponse(
            business_id=business.id,
            business_name=business.name,
            owner_name=business.owner_name,
            metrics=metrics,
            recent_quotations=recent_quotation_items,
            recent_invoices=recent_invoice_items,
            recent_payments=recent_payment_items,
            overdue_invoices=overdue_items,
        )
