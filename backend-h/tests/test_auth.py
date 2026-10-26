import pytest
from backend_h.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    raw_password = "SuperSecurePassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_token_creation_and_decoding():
    user_id = 42
    extra = {"username": "health_user", "email": "user@healthmitra.com"}
    token = create_access_token(subject=user_id, extra_claims=extra)

    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["username"] == "health_user"
    assert payload["email"] == "user@healthmitra.com"
    assert "exp" in payload
    assert "iat" in payload


def test_invalid_jwt_token():
    invalid_token = "invalid.bearer.token"
    payload = decode_access_token(invalid_token)
    assert payload is None
