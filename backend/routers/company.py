from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from schemas import CompanySettingsBase, CompanySettingsResponse
from services import storage

router = APIRouter()


# --- Logo endpoints ---

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload company logo to MinIO"""
    try:
        ext = file.filename.split(".")[-1]
        filename = f"logo_{current_user.id}.{ext}"  # Overwrite user's logo file

        file_data = await file.read()

        storage.upload_file(file_data, filename, file.content_type)

        current_user.logo_url = filename  # Storing filename instead of full URL
        db.commit()

        return {"message": "Logo actualizado exitosamente"}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/logo")
async def delete_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete company logo from MinIO and clear reference"""
    if not current_user.logo_url:
        raise HTTPException(status_code=404, detail="No hay logo para eliminar")

    storage.delete_file(current_user.logo_url)
    current_user.logo_url = None
    db.commit()

    return {"message": "Logo eliminado exitosamente"}


@router.get("/logo")
async def get_logo(current_user: User = Depends(get_current_user)):
    """Get current logo content"""
    if current_user.logo_url:
        content, content_type = storage.get_file_content_with_metadata(
            current_user.logo_url
        )
        if content:
            return Response(
                content, media_type=content_type or "application/octet-stream"
            )

    raise HTTPException(status_code=404, detail="No logo found")


# --- Company settings endpoints ---

@router.get("/settings", response_model=CompanySettingsResponse)
async def get_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's company/branding settings"""
    return CompanySettingsResponse(
        name=current_user.name,
        company_name=current_user.company_name,
        business_name=current_user.business_name,
        tax_id=current_user.tax_id,
        address=current_user.address,
        phone=current_user.phone,
        email_contact=current_user.email_contact,
        payment_terms=current_user.payment_terms,
        logo_url=current_user.logo_url,
        logo_size=current_user.logo_size or 180,
        pdf_font_size=current_user.pdf_font_size or 13,
        pdf_description_font_size=current_user.pdf_description_font_size or 14,
    )


@router.patch("/settings", response_model=CompanySettingsResponse)
async def update_company_settings(
    settings: CompanySettingsBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's company/branding settings"""
    update_data = settings.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No se proporcionaron campos para actualizar"
        )

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return CompanySettingsResponse(
        name=current_user.name,
        company_name=current_user.company_name,
        business_name=current_user.business_name,
        tax_id=current_user.tax_id,
        address=current_user.address,
        phone=current_user.phone,
        email_contact=current_user.email_contact,
        payment_terms=current_user.payment_terms,
        logo_url=current_user.logo_url,
        logo_size=current_user.logo_size or 180,
        pdf_font_size=current_user.pdf_font_size or 13,
        pdf_description_font_size=current_user.pdf_description_font_size or 14,
    )
