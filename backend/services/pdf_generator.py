import base64
import logging
import mimetypes
from datetime import datetime
from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from services import storage


logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates" / "pdf"
TEMPLATE_NAME = "budget.html"
STYLESHEET_PATH = TEMPLATE_DIR / "budget.css"

STATUS_CLASS_MAP = {
    "pendiente": "pendiente",
    "aceptado": "aceptado",
    "rechazado": "rechazado",
}

template_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _safe_value(value, fallback="-"):
    if value is None:
        return fallback

    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or fallback

    return str(value)


def _format_currency(value):
    amount = value or 0
    return f"${amount:,.2f}"


def _format_date(value):
    if value:
        return value.strftime("%d/%m/%Y")
    return datetime.now().strftime("%d/%m/%Y")


def _clean_item_description(value):
    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    return str(value).strip()


def _status_value(budget):
    raw_status = getattr(
        getattr(budget, "status", None), "value", getattr(budget, "status", None)
    )
    status = _safe_value(raw_status, "Pendiente")
    return status, STATUS_CLASS_MAP.get(status.lower(), "pendiente")


def _company_initials(name):
    words = [word[0] for word in _safe_value(name, "PC").split() if word]
    initials = "".join(words[:2]).upper()
    return initials or "PC"


def _company_display_name(user):
    for attribute in ("business_name", "company_name", "trade_name", "commercial_name"):
        value = _safe_value(getattr(user, attribute, None), "")
        if value:
            return value

    return "Presupuestos"


def _guess_logo_mime_type(logo_url, content_type):
    normalized_content_type = (content_type or "").lower().strip()
    if normalized_content_type in {"image/png", "image/jpeg", "image/jpg"}:
        return (
            "image/jpeg"
            if normalized_content_type == "image/jpg"
            else normalized_content_type
        )

    guessed_type, _ = mimetypes.guess_type(logo_url or "")
    if guessed_type in {"image/png", "image/jpeg"}:
        return guessed_type

    return None


def _resolve_logo_data_uri(budget):
    logo_url = getattr(getattr(budget, "user", None), "logo_url", None)
    if not logo_url:
        return None

    try:
        logo_bytes, content_type = storage.get_file_content_with_metadata(logo_url)
        if not logo_bytes:
            return None

        mime_type = _guess_logo_mime_type(logo_url, content_type)
        if not mime_type:
            logger.warning(
                "Logo ignorado para PDF HTML por tipo no soportado. logo_url=%s content_type=%s",
                logo_url,
                content_type,
            )
            return None

        encoded_logo = base64.b64encode(logo_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded_logo}"
    except Exception as error:
        logger.warning(
            "Error cargando logo para PDF HTML. logo_url=%s error=%s",
            logo_url,
            error,
        )
        return None


def _build_items_context(budget):
    sorted_items = sorted(
        getattr(budget, "items", []) or [],
        key=lambda item: (getattr(item, "order_index", 0), getattr(item, "id", 0)),
    )

    included = []
    excluded = []
    for item in sorted_items:
        description = _clean_item_description(getattr(item, "description", None))
        if not description:
            continue

        amount = getattr(item, "amount", 0) or 0
        quantity = getattr(item, "quantity", None)
        unit_price = getattr(item, "unit_price", None)
        is_excluded = getattr(item, "is_excluded", False)

        entry = {
            "description": description,
            "amount": amount,
            "amount_formatted": _format_currency(amount),
            "quantity": quantity,
            "unit_price": unit_price,
            "unit_price_formatted": _format_currency(unit_price) if unit_price else None,
            "has_quantity": quantity is not None,
            "has_unit_price": unit_price is not None,
            "is_excluded": is_excluded,
        }

        if is_excluded:
            excluded.append(entry)
        else:
            # Compute subtotal display
            if quantity is not None and unit_price is not None:
                entry["subtotal"] = quantity * unit_price
                entry["subtotal_formatted"] = _format_currency(quantity * unit_price)
                entry["show_qty_price"] = True
            elif unit_price is not None:
                entry["subtotal"] = unit_price
                entry["subtotal_formatted"] = _format_currency(unit_price)
                entry["show_qty_price"] = False
            else:
                entry["subtotal"] = 0
                entry["subtotal_formatted"] = _format_currency(0)
                entry["show_qty_price"] = False
            included.append(entry)

    return included, excluded


def _build_context(budget, client_data=None):
    user = getattr(budget, "user", None)
    company_name = _safe_value(getattr(user, "name", None), "Presupuesto comercial")
    status, status_slug = _status_value(budget)

    # Payment terms del branding del usuario o default
    user_payment_terms = _safe_value(getattr(user, "payment_terms", None), "-")

    included_items, excluded_items = _build_items_context(budget)

    return {
        "company": {
            "name": company_name,
            "display_name": _company_display_name(user),
            "initials": _company_initials(company_name),
            "logo_data_uri": _resolve_logo_data_uri(budget),
            # === Nuevos campos de branding ===
            "business_name": _safe_value(getattr(user, "business_name", None)),
            "tax_id": _safe_value(getattr(user, "tax_id", None)),
            "address": _safe_value(getattr(user, "address", None)),
            "phone": _safe_value(getattr(user, "phone", None)),
            "email": _safe_value(getattr(user, "email_contact", None)),
        },
        "budget": {
            "number": _safe_value(getattr(budget, "budget_id", None)),
            "number_label": "NÚM. PRESUPUESTO",
            "date": _format_date(getattr(budget, "date", None)),
            "validity": _safe_value(getattr(budget, "validity", None), ""),
            "accent_color": getattr(budget, "accent_color", None) or "#2563eb",
            "status": status,
            "status_slug": status_slug,
            "is_manual_total": getattr(budget, "is_manual_total", 0),
            "total": _format_currency(getattr(budget, "total", 0)),
            "document_letter": "X",
            "payment_terms": user_payment_terms,
            "notice": "Documento emitido únicamente como presupuesto. No reemplaza comprobantes fiscales.",
        },
        "client": {
            "name": _safe_value(getattr(budget, "client", None)),
            "address": _safe_value(getattr(client_data, "address", None)),
            "property_type": _safe_value(getattr(client_data, "tipo_inmueble", None)),
            "email": _safe_value(getattr(client_data, "email", None)),
            "phone": _safe_value(getattr(client_data, "phone", None)),
        },
        "items": included_items,
        "excluded_items": excluded_items,
        "footer": {
            "note": "Se muestran exclusivamente los datos disponibles en el sistema.",
        },
    }


def _render_html(context):
    template = template_env.get_template(TEMPLATE_NAME)
    return template.render(**context)


def _render_pdf_with_weasyprint(html_content):
    try:
        from weasyprint import CSS, HTML
    except ImportError as error:
        raise RuntimeError("WeasyPrint no está instalado en el entorno") from error

    pdf_bytes = HTML(string=html_content, base_url=str(TEMPLATE_DIR)).write_pdf(
        stylesheets=[CSS(filename=str(STYLESHEET_PATH))],
        presentational_hints=True,
    )
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)
    return buffer


def create_budget_pdf(budget, client_data=None):
    context = _build_context(budget, client_data)
    html_content = _render_html(context)

    try:
        return _render_pdf_with_weasyprint(html_content)
    except Exception as error:
        logger.warning(
            "No se pudo generar PDF con HTML->PDF. Se usa fallback legacy. error=%s",
            error,
        )
        from services.pdf_generator_legacy import create_budget_pdf_legacy
        return create_budget_pdf_legacy(budget, client_data)
