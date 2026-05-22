from typing import Optional

from fastapi import HTTPException, status


class AppHTTPException(HTTPException):
    def __init__(self, status_code: int, message: str, detail: Optional[dict] = None):
        super().__init__(status_code=status_code, detail={"message": message, **(detail or {})})


def not_found(message: str = "Resource not found") -> AppHTTPException:
    return AppHTTPException(status.HTTP_404_NOT_FOUND, message)


def unauthorized(message: str = "Unauthorized") -> AppHTTPException:
    return AppHTTPException(status.HTTP_401_UNAUTHORIZED, message)


def forbidden(message: str = "Forbidden") -> AppHTTPException:
    return AppHTTPException(status.HTTP_403_FORBIDDEN, message)


def bad_request(message: str = "Bad request") -> AppHTTPException:
    return AppHTTPException(status.HTTP_400_BAD_REQUEST, message)


def conflict(message: str = "Conflict") -> AppHTTPException:
    return AppHTTPException(status.HTTP_409_CONFLICT, message)
