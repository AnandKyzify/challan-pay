from pydantic import BaseModel, Field


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=4, max_length=128)


class UserListItem(BaseModel):
    id: str
    username: str
    role: str
    password: str
    created_at: str
