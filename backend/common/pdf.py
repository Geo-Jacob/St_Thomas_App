from io import BytesIO

import qrcode
from django.template.loader import render_to_string
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, Spacer, Table, TableStyle, SimpleDocTemplate


def _get_weasyprint_html():
    try:
        from weasyprint import HTML

        return HTML
    except (ImportError, OSError):  # pragma: no cover
        # On Windows, missing GTK/Pango libs can raise OSError during import.
        return None


def _qr_image(qr_payload: str):
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(qr_payload)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#1e3a8a", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def generate_qr_png(qr_payload: str) -> bytes:
    return _qr_image(qr_payload).getvalue()


def _build_reportlab_pdf(context: dict) -> bytes:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CenterTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1e3a8a"),
            fontSize=24,
            leading=28,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CenterBody",
            parent=styles["BodyText"],
            alignment=TA_CENTER,
            fontSize=12,
            leading=16,
        )
    )

    story = [
        Paragraph("St Thomas App", styles["CenterTitle"]),
        Spacer(1, 12),
        Paragraph(context.get("title", "Certificate"), styles["Heading1"]),
        Spacer(1, 10),
        Paragraph(
            f"This is to certify that <b>{context.get('member_name', 'N/A')}</b>",
            styles["CenterBody"],
        ),
        Spacer(1, 8),
        Paragraph(
            f"Type: <b>{context.get('certificate_type', 'Certificate')}</b>",
            styles["CenterBody"],
        ),
        Spacer(1, 4),
        Paragraph(
            f"Issued on: <b>{context.get('issued_on', 'N/A')}</b>",
            styles["CenterBody"],
        ),
        Spacer(1, 12),
    ]

    notes = context.get("notes")
    if notes:
        story.extend([Paragraph("Notes", styles["Heading2"]), Paragraph(notes, styles["BodyText"]), Spacer(1, 10)])

    qr_payload = context.get("qr_payload")
    verification_code = context.get("verification_code")
    if qr_payload:
        qr_buffer = _qr_image(qr_payload)
        qr = Image(qr_buffer, width=40 * mm, height=40 * mm)
        details = Table(
            [[Paragraph(f"Verification Code: <b>{verification_code}</b>", styles["BodyText"]), qr]],
            colWidths=[110 * mm, 40 * mm],
        )
        details.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#d4af37")),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ]
            )
        )
        story.extend([details])

    document.build(story)
    pdf_bytes = output.getvalue()
    output.close()
    return pdf_bytes


def _build_weasyprint_pdf(context: dict) -> bytes:
    html_cls = _get_weasyprint_html()
    if not html_cls:
        raise RuntimeError("WeasyPrint is not available in this environment.")

    html_string = render_to_string(
        "certificates/certificate_template.html",
        {
            "title": context.get("title", "Certificate"),
            "member_name": context.get("member_name", "N/A"),
            "certificate_type": context.get("certificate_type", "Certificate"),
            "issued_on": context.get("issued_on", "N/A"),
            "verification_code": context.get("verification_code", "N/A"),
            "notes": context.get("notes", ""),
        },
    )
    return html_cls(string=html_string).write_pdf()


def generate_certificate_pdf(context: dict) -> bytes:
    if _get_weasyprint_html():
        return _build_weasyprint_pdf(context)
    return _build_reportlab_pdf(context)
