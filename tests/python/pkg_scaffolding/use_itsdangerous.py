import itsdangerous


def sign_round_trip():
    signer = itsdangerous.Signer("my-secret-key")
    signed = signer.sign("hello world")
    return signer.unsign(signed)


def signed_contains_payload():
    signer = itsdangerous.Signer("my-secret-key")
    signed = signer.sign("hello world")
    # Signed value is "<payload>.<base64-signature>".
    return signed.startswith(b"hello world.")


def validate_intact():
    signer = itsdangerous.Signer("my-secret-key")
    signed = signer.sign("payload")
    return signer.validate(signed)


def validate_tampered():
    signer = itsdangerous.Signer("my-secret-key")
    signed = signer.sign("payload")
    tampered = signed + b"x"
    return signer.validate(tampered)


def different_keys_dont_match():
    s1 = itsdangerous.Signer("key-one")
    s2 = itsdangerous.Signer("key-two")
    signed = s1.sign("data")
    return s2.validate(signed)


def class_attr_override_serializer_signer():
    # Per-class default_signer override (the ClassDefAst fix in play).
    s_base = itsdangerous.Serializer("k")
    s_timed = itsdangerous.TimedSerializer("k")
    return (
        s_base.default_signer is itsdangerous.Signer,
        s_timed.default_signer is itsdangerous.TimestampSigner,
    )
