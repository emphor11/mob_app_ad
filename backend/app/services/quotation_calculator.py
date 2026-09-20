import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.quotation import Quotation
from app.models.business import Business
from app.schemas.quotation import QuotationItemCreate

TWO_PLACES = Decimal("0.01")


def quantize_money(amount: Decimal) -> Decimal:
    """Quantize monetary amount to 2 decimal places using standard commercial half-up rounding."""
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_quotation_item(
    quantity: Decimal,
    unit_price: Decimal,
    tax_rate: Decimal,
) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Compute financial amounts for a single line item.
    Returns (item_subtotal, tax_amount, line_total).
    """
    item_subtotal = quantize_money(quantity * unit_price)
    tax_amount = quantize_money(item_subtotal * (tax_rate / Decimal("100.00")))
    line_total = item_subtotal + tax_amount
    return item_subtotal, tax_amount, line_total


def calculate_quotation_totals(
    items: List[QuotationItemCreate],
    discount: Decimal = Decimal("0.00"),
) -> Tuple[Decimal, Decimal, Decimal, List[Dict[str, Any]]]:
    """
    Authoritatively calculate all line item totals and aggregate quotation summary.
    Enforces Rule 1 (Server is Authoritative Source of Truth) and Rule 4 (Exact Decimal Money).

    Returns:
        (subtotal, total_tax, grand_total, computed_items)
    """
    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    computed_items = []

    for item in items:
        item_subtotal, tax_amount, line_total = calculate_quotation_item(
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
        )
        subtotal += item_subtotal
        total_tax += tax_amount
        computed_items.append({
            "description": item.description.strip(),
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "tax_rate": item.tax_rate,
            "tax_amount": tax_amount,
            "line_total": line_total,
        })

    # Apply discount
    clamped_discount = min(discount, subtotal)
    discounted_subtotal = subtotal - clamped_discount
    grand_total = discounted_subtotal + total_tax

    return (
        quantize_money(subtotal),
        quantize_money(total_tax),
        quantize_money(grand_total),
        computed_items,
    )


def generate_quotation_number(db: Session, business_id: uuid.UUID) -> str:
    """
    Generate sequential human-readable quotation identifier: QT-YYYY-XXXX.
    Enforces Rule 5 (UUID PKs internally, business sequential prefixes externally).
    Supports custom quotation prefix configured per business.
    """
    current_year = date.today().year
    business = db.get(Business, business_id)
    raw_prefix = (business.quotation_prefix if business and business.quotation_prefix else "QT").strip().upper()
    prefix = f"{raw_prefix}-{current_year}-"

    stmt = (
        select(func.count(Quotation.id))
        .where(
            Quotation.business_id == business_id,
            Quotation.quotation_number.like(f"{prefix}%"),
        )
    )
    count = db.scalar(stmt) or 0
    sequence_number = count + 1
    return f"{prefix}{sequence_number:04d}"
