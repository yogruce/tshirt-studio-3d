"""
PromptVault 3D T-Shirt Studio Eklenti Modülü (FastAPI Plugin)
=============================================================

Bu modülü PromptVault (veya herhangi bir FastAPI uygulaması) içinde doğrudan import ederek
3D T-Shirt Studio'yu tek sunucu altında (`/tshirt-studio`) çalıştırabilirsiniz.

Kullanım (PromptVault `promptvault/web/app.py` içinde):
-------------------------------------------------------
```python
from promptvault_tshirt_plugin import mount_tshirt_studio
mount_tshirt_studio(app)
```
"""
from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles


def mount_tshirt_studio(
    app: FastAPI,
    studio_dist_dir: str | Path | None = None,
    mount_path: str = "/tshirt-studio",
) -> APIRouter:
    """3D T-Shirt Studio derlemesini (`dist/`) FastAPI uygulamasına bağlar."""
    if studio_dist_dir is None:
        # Varsayılan olarak bu dosyanın bulunduğu klasörün üstündeki `dist` klasörüne bakar
        studio_dist_dir = Path(__file__).resolve().parent.parent / "dist"
    else:
        studio_dist_dir = Path(studio_dist_dir).resolve()

    router = APIRouter(prefix="/api/tshirt-studio", tags=["tshirt-studio"])

    @router.get("/status")
    def tshirt_studio_status():
        return {
            "ok": studio_dist_dir.exists(),
            "mount_path": mount_path,
            "sdk_url": f"{mount_path}/plugin/tshirt-studio-sdk.js",
            "models": ["short", "long"],
        }

    app.include_router(router)

    if studio_dist_dir.exists():
        app.mount(
            mount_path,
            StaticFiles(directory=str(studio_dist_dir), html=True),
            name="tshirt_studio_static",
        )

    return router
