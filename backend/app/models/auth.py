from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=4, max_length=128)


class UserOut(BaseModel):
    id: str
    username: str
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    token: str
    user: UserOut


class MessageResponse(BaseModel):
    message: str
