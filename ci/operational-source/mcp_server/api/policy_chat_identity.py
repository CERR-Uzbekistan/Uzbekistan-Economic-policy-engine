"""Exact Policy Chat identities; no trimming, case folding, or Unicode normalization."""

import base64
import binascii
import json
import unicodedata

IDENTITY_CONTRACT = "policy-chat-identity-v1"
MAX_SUBJECT_BYTES = 1024


class IdentityInvalid(ValueError):
    pass


def validate_subject(subject):
    if not isinstance(subject, str) or not subject or subject != subject.strip():
        raise IdentityInvalid("invalid_identity")
    if any(unicodedata.category(c) in {"Cc", "Cs", "Zl", "Zp"} for c in subject):
        raise IdentityInvalid("invalid_identity")
    if len(subject.encode("utf-8")) > MAX_SUBJECT_BYTES:
        raise IdentityInvalid("invalid_identity")
    return subject


def identity_owner(subject, *, encoding=None, issuer=None, expected_issuer=""):
    if encoding is not None:
        if encoding != "utf-8-base64url":
            raise IdentityInvalid("invalid_identity")
        try:
            raw = subject.encode("ascii")
            if len(raw) > 1366:
                raise ValueError("Encoded identity too long")
            decoded = base64.b64decode(raw + b"=" * (-len(raw) % 4), altchars=b"-_", validate=True)
            subject = decoded.decode("utf-8")
            if base64.urlsafe_b64encode(decoded).decode("ascii").rstrip("=") != raw.decode("ascii"):
                raise ValueError("Noncanonical encoding")
        except (ValueError, UnicodeError, binascii.Error) as error:
            raise IdentityInvalid("invalid_identity") from error
    elif not subject.isascii():
        # HTTP headers are not a Unicode transport; require explicit UTF-8 encoding.
        raise IdentityInvalid("invalid_identity")
    subject = validate_subject(subject)
    if expected_issuer:
        if issuer != expected_issuer:
            raise IdentityInvalid("invalid_identity")
        validate_subject(issuer)
        return "identity-v1:" + json.dumps(
            {"issuer": issuer, "subject": subject},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    if issuer is not None:
        raise IdentityInvalid("identity_issuer_not_configured")
    if subject.startswith("identity-v1:"):
        raise IdentityInvalid("invalid_identity")
    return subject


def validate_owner(owner):
    """Validate the exact storage key, including its issuer when present."""
    if isinstance(owner, str) and owner.startswith("identity-v1:"):
        try:
            value = json.loads(owner[len("identity-v1:") :])
            if set(value) != {"issuer", "subject"}:
                raise ValueError("Invalid owner shape")
            issuer = validate_subject(value["issuer"])
            subject = validate_subject(value["subject"])
            expected = "identity-v1:" + json.dumps(
                {"issuer": issuer, "subject": subject},
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            if owner != expected:
                raise ValueError("Noncanonical owner")
        except (ValueError, TypeError, KeyError) as error:
            raise IdentityInvalid("invalid_identity") from error
        return owner
    return validate_subject(owner)
