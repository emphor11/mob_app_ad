import io
from decimal import Decimal
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

from app.models.business import Business
from app.models.customer import Customer
from app.models.quotation import Quotation


def format_inr(amount: Optional[Decimal]) -> str:
    """Format decimal amount as Indian Rupees."""
    if amount is None:
        return "Rs. 0.00"
    return f"Rs. {amount:,.2f}"


def generate_quotation_pdf(
    quotation: Quotation,
    business: Business,
    customer: Optional[Customer] = None,
) -> bytes:
    """
    Generate a clean, high-contrast, Indian trade quotation PDF on A4 format.
    Includes:
    - Business header (Name, Owner, Phone, Email, Address, GSTIN)
    - Quotation metadata (Number, Issue Date, Validity Date, Status)
    - Customer details (Billed To, Phone, Email, Address, GSTIN)
    - Itemized line items table (Description, Qty, Unit Price, Tax %, Tax Amt, Line Total)
    - Financial totals (Subtotal, Discount, GST, Grand Total)
    - Notes & Commercial Terms
    - Signature footer
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )

    styles = getSampleStyleSheet()

    doc_meta_style = ParagraphStyle(
        "DocMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=2,  # Right aligned
        textColor=colors.HexColor("#4A5568"),
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#2D3748"),
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#4A5568"),
    )

    bold_body_style = ParagraphStyle(
        "BoldBody",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1A202C"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#2D3748"),
    )

    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=table_cell_style,
        alignment=2,
    )

    table_cell_bold_right = ParagraphStyle(
        "TableCellBoldRight",
        parent=bold_body_style,
        fontSize=8.5,
        alignment=2,
    )

    story = []

    # 1. Header Banner: Business Info (Left) + Quotation Number & Date (Right)
    biz_lines = [
        f"<b>{business.name}</b>",
        f"Proprietor / Contact: {business.owner_name}",
        f"Phone: {business.phone} | Email: {business.email}",
        f"Address: {business.address}",
    ]
    if business.gstin:
        biz_lines.append(f"<b>GSTIN:</b> {business.gstin}")

    biz_info_p = Paragraph("<br/>".join(biz_lines), body_style)

    quote_meta_lines = [
        "<font size=16 color='#2B6CB0'><b>ESTIMATE / QUOTATION</b></font>",
        f"<b>Quote No:</b> {quotation.quotation_number}",
        f"<b>Date:</b> {quotation.issue_date.strftime('%d-%b-%Y')}",
        f"<b>Valid Until:</b> {quotation.valid_until.strftime('%d-%b-%Y')}",
        f"<b>Status:</b> {quotation.status.value}",
    ]
    quote_meta_p = Paragraph("<br/>".join(quote_meta_lines), doc_meta_style)

    header_table = Table(
        [[biz_info_p, quote_meta_p]],
        colWidths=[105 * mm, 77 * mm],
    )
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#CBD5E0"), spaceAfter=10))

    # 2. Customer Details ("Billed To" Card)
    cust_lines = []
    if customer:
        cust_lines.append(f"<b>{customer.name}</b>")
        if customer.phone:
            cust_lines.append(f"Phone: {customer.phone}")
        if customer.email:
            cust_lines.append(f"Email: {customer.email}")
        if customer.address:
            cust_lines.append(f"Address: {customer.address}")
        if customer.gstin:
            cust_lines.append(f"<b>Customer GSTIN:</b> {customer.gstin}")
    else:
        cust_lines.append("<i>Valued Client</i>")

    customer_table = Table(
        [
            [
                Paragraph("<b>QUOTATION ISSUED TO:</b>", meta_label_style),
            ],
            [
                Paragraph("<br/>".join(cust_lines), body_style),
            ],
        ],
        colWidths=[182 * mm],
    )
    customer_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(customer_table)
    story.append(Spacer(1, 12))

    # 3. Itemized Quotation Table
    table_data = [
        [
            Paragraph("#", table_header_style),
            Paragraph("Item Description", table_header_style),
            Paragraph("Qty", ParagraphStyle("THC", parent=table_header_style, alignment=1)),
            Paragraph("Unit Price", ParagraphStyle("THR", parent=table_header_style, alignment=2)),
            Paragraph("GST %", ParagraphStyle("THC", parent=table_header_style, alignment=1)),
            Paragraph("Tax Amt", ParagraphStyle("THR", parent=table_header_style, alignment=2)),
            Paragraph("Total (INR)", ParagraphStyle("THR", parent=table_header_style, alignment=2)),
        ]
    ]

    col_widths = [8 * mm, 68 * mm, 16 * mm, 24 * mm, 16 * mm, 22 * mm, 28 * mm]

    for index, item in enumerate(quotation.items, start=1):
        row = [
            Paragraph(str(index), table_cell_style),
            Paragraph(item.description, table_cell_style),
            Paragraph(f"{item.quantity:g}", ParagraphStyle("TC", parent=table_cell_style, alignment=1)),
            Paragraph(format_inr(item.unit_price), table_cell_right),
            Paragraph(f"{item.tax_rate:g}%", ParagraphStyle("TC", parent=table_cell_style, alignment=1)),
            Paragraph(format_inr(item.tax_amount), table_cell_right),
            Paragraph(format_inr(item.line_total), table_cell_bold_right),
        ]
        table_data.append(row)

    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2B6CB0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
            ("TOPPADDING", (0, 1), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [colors.white, colors.HexColor("#F7FAFC")],
            ),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    # 4. Financial Summary Breakdown (Subtotal, Discount, Tax, Grand Total)
    summary_data = [
        [Paragraph("Taxable Subtotal:", meta_label_style), Paragraph(format_inr(quotation.subtotal), table_cell_bold_right)],
    ]
    if quotation.discount and quotation.discount > 0:
        summary_data.append([
            Paragraph("Special Trade Discount:", meta_label_style),
            Paragraph(f"- {format_inr(quotation.discount)}", table_cell_bold_right),
        ])
    summary_data.extend([
        [Paragraph("GST Output Tax:", meta_label_style), Paragraph(format_inr(quotation.tax), table_cell_bold_right)],
        [
            Paragraph("<font size=11 color='#1A365D'><b>Grand Total (INR):</b></font>", meta_label_style),
            Paragraph(f"<font size=11 color='#1A365D'><b>{format_inr(quotation.total)}</b></font>", table_cell_bold_right),
        ],
    ])

    summary_table = Table(
        summary_data,
        colWidths=[48 * mm, 38 * mm],
    )
    summary_table.setStyle(
        TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.HexColor("#2B6CB0")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EBF8FF")),
        ])
    )

    # Place Notes/Terms on Left and Summary on Right
    notes_parts = []
    if quotation.notes:
        notes_parts.append(f"<b>Notes:</b><br/>{quotation.notes}")
    if quotation.terms:
        notes_parts.append(f"<b>Terms & Conditions:</b><br/>{quotation.terms}")
    if not notes_parts:
        notes_parts.append("<i>Thank you for your business! Please contact us if you have any questions.</i>")

    notes_p = Paragraph("<br/><br/>".join(notes_parts), body_style)

    lower_table = Table(
        [[notes_p, summary_table]],
        colWidths=[96 * mm, 86 * mm],
    )
    lower_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(KeepTogether([lower_table]))

    # 5. Authorization & Signature Footer
    story.append(Spacer(1, 20))
    signature_data = [
        [
            Paragraph("Customer Acceptance Signature<br/><font size=7 color='#718096'>(Sign and return copy)</font>", body_style),
            Paragraph(f"For <b>{business.name}</b><br/><br/><br/>Authorized Signatory", ParagraphStyle("SigRight", parent=body_style, alignment=2)),
        ]
    ]
    signature_table = Table(
        signature_data,
        colWidths=[91 * mm, 91 * mm],
    )
    signature_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, 0), (0, 0), 0.5, colors.HexColor("#CBD5E0")),
            ("LINEABOVE", (1, 0), (1, 0), 0.5, colors.HexColor("#CBD5E0")),
        ])
    )
    story.append(KeepTogether([signature_table]))

    doc.build(story)
    return buffer.getvalue()
