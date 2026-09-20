import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.business import Business
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationItem, QuotationStatus


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_quotation_exact_decimal_precision(db_session):
    """
    CRITICAL FINANCIAL RULE 4: Money uses exact decimals, never float.
    Verify that fractional currencies, taxes, and prices maintain exact precision
    in the database without floating point inaccuracy (e.g. 0.1 + 0.2 != 0.30000000000000004).
    """
    # 1. Setup user, business, customer
    suffix = uuid.uuid4().hex[:6]
    user = User(
        email=f"trade_{suffix}@smartquote.in",
        hashed_password="dummy_password",
        full_name=f"Contractor {suffix}",
    )
    db_session.add(user)
    db_session.flush()

    business = Business(
        user_id=user.id,
        name="Precise Electrical Works",
        owner_name=user.full_name,
        phone="+91 99999 88888",
        email=user.email,
        address="Sector 18, Gurugram",
        currency="₹",
    )
    db_session.add(business)
    db_session.flush()

    customer = Customer(
        business_id=business.id,
        name="Oberoi Constructions",
        phone="+91 98888 77777",
    )
    db_session.add(customer)
    db_session.flush()

    # 2. Add Quotation with precise Decimal calculations
    # Item 1: 12.5 meters of heavy conduit pipe @ ₹149.99/meter with 18% tax
    qty1 = Decimal("12.50")
    price1 = Decimal("149.99")
    line_subtotal1 = qty1 * price1  # 1874.875 -> rounded to 1874.88
    tax_rate1 = Decimal("18.00")
    tax_amt1 = Decimal("337.48")
    total1 = Decimal("2212.36")

    quotation = Quotation(
        business_id=business.id,
        customer_id=customer.id,
        quotation_number=f"QT-2026-{suffix[:4].upper()}",
        issue_date=date.today(),
        valid_until=date.today() + timedelta(days=15),
        status=QuotationStatus.DRAFT,
        subtotal=Decimal("1874.88"),
        discount=Decimal("50.00"),
        tax=tax_amt1,
        total=Decimal("2162.36"),
        notes="Exact commercial quote.",
        terms="50% advance on order confirmation.",
    )
    db_session.add(quotation)
    db_session.flush()

    item = QuotationItem(
        quotation_id=quotation.id,
        description="25mm Heavy Duty PVC Conduit Pipe (meters)",
        quantity=qty1,
        unit_price=price1,
        tax_rate=tax_rate1,
        tax_amount=tax_amt1,
        line_total=total1,
    )
    db_session.add(item)
    db_session.commit()

    # 3. Reload from DB to verify Decimal types
    loaded_quote = db_session.scalar(select(Quotation).where(Quotation.id == quotation.id))
    assert loaded_quote is not None
    assert isinstance(loaded_quote.subtotal, Decimal)
    assert loaded_quote.subtotal == Decimal("1874.88")
    assert loaded_quote.discount == Decimal("50.00")
    assert loaded_quote.tax == Decimal("337.48")
    assert loaded_quote.total == Decimal("2162.36")
    assert loaded_quote.status == QuotationStatus.DRAFT

    # Verify line item
    assert len(loaded_quote.items) == 1
    loaded_item = loaded_quote.items[0]
    assert isinstance(loaded_item.quantity, Decimal)
    assert loaded_item.quantity == Decimal("12.50")
    assert isinstance(loaded_item.unit_price, Decimal)
    assert loaded_item.unit_price == Decimal("149.99")
    assert loaded_item.line_total == Decimal("2212.36")


def test_quotation_status_enum_values():
    """Verify all required status enum states exist."""
    assert QuotationStatus.DRAFT.value == "DRAFT"
    assert QuotationStatus.SENT.value == "SENT"
    assert QuotationStatus.ACCEPTED.value == "ACCEPTED"
    assert QuotationStatus.REJECTED.value == "REJECTED"
    assert QuotationStatus.EXPIRED.value == "EXPIRED"
    assert QuotationStatus.CONVERTED.value == "CONVERTED"


def test_quotation_cascade_deletion(db_session):
    """Deleting a quotation must cascade and remove all associated line items."""
    suffix = uuid.uuid4().hex[:6]
    user = User(email=f"user_{suffix}@smartquote.in", hashed_password="pw", full_name="User")
    db_session.add(user)
    db_session.flush()

    business = Business(user_id=user.id, name="Biz", owner_name="Owner", phone="+91 90000 00000", email=user.email, address="Address")
    db_session.add(business)
    db_session.flush()

    customer = Customer(business_id=business.id, name="Client", phone="+91 90000 11111")
    db_session.add(customer)
    db_session.flush()

    quote = Quotation(
        business_id=business.id,
        customer_id=customer.id,
        quotation_number=f"QT-DEL-{suffix}",
        issue_date=date.today(),
        valid_until=date.today() + timedelta(days=7),
        status=QuotationStatus.DRAFT,
        subtotal=Decimal("100.00"),
        total=Decimal("100.00"),
    )
    db_session.add(quote)
    db_session.flush()

    item1 = QuotationItem(quotation_id=quote.id, description="Item 1", quantity=Decimal("1.00"), unit_price=Decimal("50.00"), line_total=Decimal("50.00"))
    item2 = QuotationItem(quotation_id=quote.id, description="Item 2", quantity=Decimal("1.00"), unit_price=Decimal("50.00"), line_total=Decimal("50.00"))
    db_session.add_all([item1, item2])
    db_session.commit()

    quote_id = quote.id
    item1_id = item1.id
    item2_id = item2.id

    # Delete quotation
    db_session.delete(quote)
    db_session.commit()

    # Verify quotation and its line items are deleted
    assert db_session.scalar(select(Quotation).where(Quotation.id == quote_id)) is None
    assert db_session.scalar(select(QuotationItem).where(QuotationItem.id == item1_id)) is None
    assert db_session.scalar(select(QuotationItem).where(QuotationItem.id == item2_id)) is None
