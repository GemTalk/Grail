import hmac


def basic_sha256(key, msg):
    return hmac.new(key, msg, 'sha256').hexdigest()


def streaming(key, parts):
    """Build the HMAC across multiple update() calls."""
    m = hmac.new(key, digestmod='sha256')
    for part in parts:
        m.update(part)
    return m.hexdigest()


def constant_time_eq(a, b):
    return hmac.compare_digest(a, b)


def single_shot(key, msg):
    """``hmac.digest(key, msg, name)`` — shortcut form."""
    return hmac.digest(key, msg, 'sha256')
