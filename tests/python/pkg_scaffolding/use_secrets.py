import secrets


def token_default():
    return secrets.token_bytes()


def token_bytes_n(n):
    return secrets.token_bytes(n)


def token_hex_n(n):
    return secrets.token_hex(n)


def token_urlsafe_n(n):
    return secrets.token_urlsafe(n)


def choice_from(seq):
    return secrets.choice(seq)


def randbelow_n(n):
    return secrets.randbelow(n)


def randbits_k(k):
    return secrets.randbits(k)


def compare_equal(a, b):
    return secrets.compare_digest(a, b)


def two_tokens_differ():
    return secrets.token_bytes(16) != secrets.token_bytes(16)
