# Fixture for KwargsSplatTestCase.
#
# Python: ``def f(*args, **kwargs): g(*args, **kwargs)'' must forward
# all positional + keyword arguments to ``g'' unchanged.  ``g'' can
# then extract individual named parameters by their string name
# (``def g(node, store_as_param=False, **rest):''), and the kwarg
# must be reachable via ``rest['name']'' or ``rest.get('name')''.
#
# Pre-fix, Grail's CallAst built the call-site kwargs dict with
# Symbol keys (IdentityKeyValueDictionary).  ``g'' extracted by
# Symbol too — so direct calls worked.  But the user's ``**kwargs''
# block-temp received an IdentityKeyValueDictionary, then
# ``rest.get('name')'' (String key) missed.  And when the user
# splat-forwarded ``g(*args, **kwargs)'', the forwarded kwargs
# stayed Symbol-keyed — fine for callee extraction by Symbol but
# brittle the moment the callee tries a string-key lookup.
#
# Fix: ALL kwargs are String-keyed (Python ``str''), backed by a
# value-comparison KeyValueDictionary (not IdentityKeyValueDictionary
# — String literals aren't interned).  CallAst, FunctionDefAst
# (positional + kwonly extraction), and Smalltalk-side kwarg
# consumers (json_module, statistics, random, datetime, str, builtins)
# all use the same convention.


def receiver(node, store_as_param=False, **rest):
    """Receiver that extracts a named param + leftover kwargs."""
    return (store_as_param, rest.get('extra', 'MISSING'))


def via_splat(node, *args, **kwargs):
    """Forwarder — must propagate args + kwargs untouched."""
    return receiver(node, *args, **kwargs)


def with_kwonly(node, *, must_pass, also='default'):
    """Keyword-only args: only callable via kwargs."""
    return (must_pass, also)


def with_kwonly_splat(node, *args, **kwargs):
    """Forwarder targeting a kwonly callee — kwargs must reach
    the keyword-only-arg extraction site."""
    return with_kwonly(node, *args, **kwargs)


# --- Direct receiver call ---
direct_basic = receiver('n', store_as_param=True, extra='hi')
direct_default = receiver('n')                     # (False, 'MISSING')


# --- Forwarded via splat ---
splat_basic = via_splat('n', store_as_param=True, extra='hi')
splat_default = via_splat('n')


# --- User kwargs.get with string key ---
def collect(**kwargs):
    return (kwargs.get('a', 'A?'), kwargs.get('b', 'B?'))


collect_present = collect(a=1, b=2)
collect_missing = collect(a=1)


# --- Splat through to kwonly callee ---
kwonly_via_splat = with_kwonly_splat('n', must_pass=42, also='custom')


# --- kwargs as Python dict (string keys) ---
def keys_of(**kwargs):
    return sorted(list(kwargs.keys()))


keys_check = keys_of(zeta=1, alpha=2, mid=3)
