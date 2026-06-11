import logging
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from services import storage


logger = logging.getLogger(__name__)


PRIMARY_COLOR = colors.HexColor("#1F2937")
ACCENT_COLOR = colors.HexColor("#E5E7EB")
SURFACE_COLOR = colors.HexColor("#F9FAFB")
BORDER_COLOR = colors.HexColor("#9CA3AF")
TEXT_COLOR = colors.HexColor("#111827")
MUTED_COLOR = colors.HexColor("#4B5563")
WHITE_COLOR = colors.white


def _safe_value(value):
    if value is None:
        return "-"

    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or "-"

    return str(value)


def _format_currency(value):
    amount = value or 0
    return f"${amount:,.2f}"


def _paragraph(text, style):
    return Paragraph(escape(_safe_value(text)), style)


def _info_cell(label, value, label_style, value_style):
    return Table(
        [
            [_paragraph(label, label_style)],
            [_paragraph(value, value_style)],
        ],
        colWidths=[None],
    )


def _empty_cell():
    table = Table([[Paragraph("", getSampleStyleSheet()["Normal"])]], colWidths=[None])
    table.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _build_company_block(logo, budget, company_name_style, company_meta_style):
    user = getattr(budget, "user", None)
    company_name = getattr(user, "name", None) or "Presupuesto comercial"
    company_meta = getattr(user, "email", None) or "Documento generado por el sistema"

    identity_parts = [
        Paragraph(escape(_safe_value(company_name)), company_name_style),
        Paragraph(escape(_safe_value(company_meta)), company_meta_style),
    ]

    if logo:
        content = [[logo, identity_parts]]
        col_widths = [5.2 * cm, 5.6 * cm]
    else:
        content = [[identity_parts]]
        col_widths = [10.8 * cm]

    table = Table(content, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _build_logo(budget):
    user = getattr(budget, "user", None)
    logo_url = getattr(user, "logo_url", None)
    logo_size = getattr(user, "logo_size", None) or 180
    logo_size = max(80, min(int(logo_size), 320))

    try:
        if not logo_url:
            return None

        logo_bytes, content_type = storage.get_file_content_with_metadata(logo_url)

        if not logo_bytes:
            return None

        normalized_content_type = (content_type or "").lower()
        logo_extension = (
            "logo.jpg"
            if "jpeg" in normalized_content_type or "jpg" in normalized_content_type
            else "logo.png"
        )

        logo_io = BytesIO(logo_bytes)
        logo_io.name = logo_extension
        img = Image(logo_io, lazy=0)

        aspect_ratio = img.drawHeight / float(img.drawWidth)
        max_width = (logo_size / 180) * 5.2 * cm
        max_height = (logo_size / 180) * 1.8 * cm

        draw_width = max_width
        draw_height = draw_width * aspect_ratio

        if draw_height > max_height:
            draw_height = max_height
            draw_width = draw_height / aspect_ratio

        img.drawWidth = draw_width
        img.drawHeight = draw_height
        img.hAlign = "LEFT"
        return img
    except Exception as error:
        logger.warning(
            "Error cargando logo para PDF legacy. logo_url=%s error=%s",
            logo_url,
            error,
        )
        return None


def create_budget_pdf_legacy(budget, client_data=None):
    buffer = BytesIO()
    user = getattr(budget, "user", None)
    pdf_font_size = getattr(user, "pdf_font_size", None) or 13
    pdf_font_size = max(10, min(int(pdf_font_size), 18))
    pdf_description_font_size = getattr(user, "pdf_description_font_size", None) or 14
    pdf_description_font_size = max(11, min(int(pdf_description_font_size), 22))
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.7 * cm,
        leftMargin=1.7 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    company_name_style = ParagraphStyle(
        "CompanyName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        textColor=TEXT_COLOR,
        spaceAfter=2,
    )
    company_meta_style = ParagraphStyle(
        "CompanyMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED_COLOR,
    )
    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        alignment=1,
        textColor=TEXT_COLOR,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        alignment=1,
        textColor=MUTED_COLOR,
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=WHITE_COLOR,
        alignment=0,
    )
    info_label_style = ParagraphStyle(
        "InfoLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=MUTED_COLOR,
        textTransform="uppercase",
    )
    info_value_style = ParagraphStyle(
        "InfoValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=TEXT_COLOR,
        spaceAfter=2,
    )
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=max(9, pdf_font_size - 2),
        leading=max(12, pdf_font_size + 1),
        alignment=1,
        textColor=WHITE_COLOR,
    )
    item_style = ParagraphStyle(
        "Item",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=pdf_font_size,
        leading=pdf_font_size + 3,
        textColor=TEXT_COLOR,
    )
    description_item_style = ParagraphStyle(
        "DescriptionItem",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=pdf_description_font_size,
        leading=pdf_description_font_size + 3,
        textColor=TEXT_COLOR,
    )
    total_label_style = ParagraphStyle(
        "TotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=14,
        textColor=TEXT_COLOR,
    )
    total_value_style = ParagraphStyle(
        "TotalValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        alignment=2,
        textColor=TEXT_COLOR,
    )
    excluded_title_style = ParagraphStyle(
        "ExcludedTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#dc2626"),
    )
    excluded_item_style = ParagraphStyle(
        "ExcludedItem",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#dc2626"),
    )
    qty_header_style = ParagraphStyle(
        "QtyHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=max(9, pdf_font_size - 2),
        leading=max(12, pdf_font_size + 1),
        alignment=2,
        textColor=WHITE_COLOR,
    )
    qty_style = ParagraphStyle(
        "Qty",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=pdf_font_size,
        leading=pdf_font_size + 3,
        alignment=2,
        textColor=TEXT_COLOR,
    )
    unit_price_header_style = ParagraphStyle(
        "UnitPriceHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=max(9, pdf_font_size - 2),
        leading=max(12, pdf_font_size + 1),
        alignment=2,
        textColor=WHITE_COLOR,
    )
    unit_price_style = ParagraphStyle(
        "UnitPrice",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=pdf_font_size,
        leading=pdf_font_size + 3,
        alignment=2,
        textColor=TEXT_COLOR,
    )

    logo = _build_logo(budget)

    budget_date = (
        budget.date.strftime("%d/%m/%Y")
        if budget.date
        else datetime.now().strftime("%d/%m/%Y")
    )
    company_block = _build_company_block(
        logo,
        budget,
        company_name_style,
        company_meta_style,
    )
    budget_meta_block = Table(
        [
            [Paragraph("PRESUPUESTO", badge_style)],
            [Paragraph(f"N° {escape(_safe_value(budget.budget_id))}", meta_style)],
            [Paragraph(f"Fecha: {escape(budget_date)}", meta_style)],
        ],
        colWidths=[6.2 * cm],
    )
    budget_meta_block.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE_COLOR),
                ("BOX", (0, 0), (-1, -1), 1.1, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    header_table = Table(
        [[company_block, budget_meta_block]], colWidths=[10.8 * cm, 6.2 * cm]
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1.1, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LINEAFTER", (0, 0), (0, 0), 1.1, BORDER_COLOR),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 0.45 * cm))

    status_value = _safe_value(
        getattr(
            getattr(budget, "status", None),
            "value",
            getattr(budget, "status", None),
        )
    )
    info_grid = [
        [
            _info_cell(
                "Cliente",
                getattr(budget, "client", None),
                info_label_style,
                info_value_style,
            ),
            _info_cell(
                "Dirección",
                getattr(client_data, "address", None),
                info_label_style,
                info_value_style,
            ),
        ],
        [
            _info_cell(
                "Tipo inmueble",
                getattr(client_data, "tipo_inmueble", None),
                info_label_style,
                info_value_style,
            ),
            _info_cell(
                "Email",
                getattr(client_data, "email", None),
                info_label_style,
                info_value_style,
            ),
        ],
        [
            _info_cell(
                "Teléfono",
                getattr(client_data, "phone", None),
                info_label_style,
                info_value_style,
            ),
            _info_cell(
                "Validez",
                getattr(budget, "validity", None),
                info_label_style,
                info_value_style,
            ),
        ],
        [
            _info_cell("Estado", status_value, info_label_style, info_value_style),
            _empty_cell(),
        ],
    ]
    info_table = Table(
        [
            [Paragraph("DATOS DEL CLIENTE", section_title_style)],
            [Table(info_grid, colWidths=[8.45 * cm, 8.45 * cm])],
        ],
        colWidths=[17.0 * cm],
    )
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), PRIMARY_COLOR),
                ("BACKGROUND", (0, 1), (0, 1), WHITE_COLOR),
                ("BOX", (0, 0), (-1, -1), 1.1, BORDER_COLOR),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (0, 0), 8),
                ("BOTTOMPADDING", (0, 0), (0, 0), 8),
                ("TOPPADDING", (0, 1), (0, 1), 10),
                ("BOTTOMPADDING", (0, 1), (0, 1), 10),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 0.45 * cm))

    sorted_items = sorted(
        getattr(budget, "items", []) or [],
        key=lambda item: (getattr(item, "order_index", 0), getattr(item, "id", 0)),
    )

    included_items = [i for i in sorted_items if not getattr(i, "is_excluded", False)]
    excluded_items = [i for i in sorted_items if getattr(i, "is_excluded", False)]

    # ── Included items table ──
    item_rows = [
        [
            Paragraph("ÍTEM", header_style),
            Paragraph("DESCRIPCIÓN", header_style),
            Paragraph("CANT.", qty_header_style),
            Paragraph("P. UNIT.", unit_price_header_style),
            Paragraph("SUBTOTAL", header_style),
        ]
    ]

    for index, item in enumerate(included_items, start=1):
        description = escape(_safe_value(getattr(item, "description", None)))
        amount = getattr(item, "amount", 0) or 0
        quantity = getattr(item, "quantity", None)
        unit_price = getattr(item, "unit_price", None)
        qty_text = str(quantity) if quantity is not None else "-"
        price_text = _format_currency(unit_price) if unit_price is not None else "-"
        item_rows.append(
            [
                Paragraph(str(index), item_style),
                Paragraph(description, description_item_style),
                Paragraph(qty_text, qty_style),
                Paragraph(price_text, unit_price_style),
                Paragraph(_format_currency(amount), item_style),
            ]
        )

    if len(item_rows) == 1:
        item_rows.append(
            [
                Paragraph("-", description_item_style),
                Paragraph("-", item_style),
                Paragraph("-", qty_style),
                Paragraph("-", unit_price_style),
                Paragraph("-", item_style),
            ]
        )

    items_table = Table(item_rows, colWidths=[1.6 * cm, 9.0 * cm, 1.8 * cm, 2.4 * cm, 2.2 * cm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, BORDER_COLOR),
                ("BACKGROUND", (0, 1), (-1, -1), SURFACE_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
                ("TOPPADDING", (0, 1), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
                ("ALIGN", (0, 1), (0, -1), "CENTER"),
                ("ALIGN", (2, 1), (4, -1), "RIGHT"),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Excluded items section ──
    if excluded_items:
        excluded_header = Table(
            [[Paragraph("LO QUE NO INCLUYE EL PRESUPUESTO", excluded_title_style)]],
            colWidths=[17.0 * cm],
        )
        excluded_header.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#fecaca")),
        ]))
        story.append(excluded_header)

        excluded_rows = []
        for item in excluded_items:
            description = escape(_safe_value(getattr(item, "description", None)))
            quantity = getattr(item, "quantity", None)
            unit_price = getattr(item, "unit_price", None)
            parts = [description]
            if quantity is not None:
                parts.append(f" (x{quantity})")
            if unit_price is not None:
                parts.append(f" — {_format_currency(unit_price)}/u.")
            excluded_text = "".join(parts)
            excluded_rows.append([Paragraph(excluded_text, excluded_item_style)])

        excluded_table = Table(excluded_rows, colWidths=[17.0 * cm])
        excluded_table.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#fee2e2")),
        ]))
        story.append(excluded_table)
        story.append(Spacer(1, 0.3 * cm))

    total_table = Table(
        [
            [
                Paragraph("TOTAL", total_label_style),
                Paragraph(
                    _format_currency(getattr(budget, "total", 0)), total_value_style
                ),
            ]
        ],
        colWidths=[4.0 * cm, 6.0 * cm],
    )
    total_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT_COLOR),
                ("BOX", (0, 0), (-1, -1), 1.2, BORDER_COLOR),
                ("LINEABOVE", (0, 0), (-1, 0), 1.2, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    total_wrapper = Table([["", total_table]], colWidths=[7.0 * cm, 10.0 * cm])
    total_wrapper.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(total_wrapper)

    doc.build(story)
    buffer.seek(0)
    return buffer
