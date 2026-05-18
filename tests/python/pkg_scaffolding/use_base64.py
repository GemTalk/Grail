import base64


def encode_standard(data):
    return base64.b64encode(data)


def decode_standard(data):
    return base64.b64decode(data)


def encode_urlsafe(data):
    return base64.urlsafe_b64encode(data)


def decode_urlsafe(data):
    return base64.urlsafe_b64decode(data)


def roundtrip(data):
    """Encode + decode should preserve original bytes."""
    enc = base64.b64encode(data)
    return base64.b64decode(enc) == data


def decode_from_str(s):
    """Decoder accepts str input (encodes to ASCII internally)."""
    return base64.b64decode(s)
