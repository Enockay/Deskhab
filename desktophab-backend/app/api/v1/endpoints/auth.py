from fastapi import APIRouter, Depends

from app.schemas.auth import LoginRequest, AuthResponse

router = APIRouter()


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
  # TODO: delegate to auth_service.login
  return AuthResponse(access_token="demo", refresh_token="demo", token_type="bearer")


@router.post("/auth/register", response_model=AuthResponse)
async def register(payload: LoginRequest) -> AuthResponse:
  # TODO: implement real registration flow
  return AuthResponse(access_token="demo", refresh_token="demo", token_type="bearer")


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh() -> AuthResponse:
  # TODO: implement token refresh
  return AuthResponse(access_token="demo", refresh_token="demo", token_type="bearer")


@router.post("/auth/logout")
async def logout() -> dict:
  # TODO: implement logout / token revocation
  return {"success": True}

