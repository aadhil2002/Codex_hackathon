from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router
from app.shopping_routes import router as shopping_router


app = FastAPI(title="VocaPilot Shopping", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)
app.include_router(shopping_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
