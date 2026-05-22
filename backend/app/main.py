import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_v1_router
from app.config import get_settings
from app.core.exceptions import AppHTTPException
from app.db.mongodb import close_db, connect_db
from app.startup import ensure_indexes, seed_admin_user

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await ensure_indexes()
    await seed_admin_user()
    yield
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppHTTPException)
    async def app_http_handler(_request: Request, exc: AppHTTPException):
        detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=detail)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"message": "Validation error", "errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        logger.exception("Unhandled error: %s", exc)
        if settings.debug:
            return JSONResponse(
                status_code=500,
                content={"message": "Internal server error", "detail": str(exc)},
            )
        return JSONResponse(status_code=500, content={"message": "Internal server error"})

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    app.include_router(api_v1_router, prefix="/api")

    return app


app = create_app()
