# Fixture for DictKwargsTestCase.
#
# Python: ``dict(a=1, b=2)'' constructs a dict whose keys are
# Python ``str''s.  Grail's CallAst varargs codegen builds the
# kwargs IdentityKeyValueDictionary with Symbol keys (for fast
# Smalltalk-side ``at: #name'' lookup); the boundary into
# ``dict(...)'' must convert those Symbol keys to Strings so
# subsequent string-literal lookups (``d['name']'') match.
#
# Pre-fix, ``dict(name='World')'' produced ``{#name → 'World'}''
# and ``d['name']'' raised KeyError because String 'name' ≠
# Symbol #name.  Jinja2's render-context lookup is exactly this
# shape — every interpolation in a rendered template would miss
# until the boundary converted.


def dict_from_kwargs():
    """dict(**kwargs) keys must be Python str, not Symbol."""
    d = dict(name='World', greeting='Hello')
    return (d['name'], d['greeting'])


def dict_kwargs_key_type():
    """Verify the key type matches Python str semantics — a key
    looked up by its String literal must hit."""
    d = dict(x=1)
    return 'x' in d


def dict_kwargs_iteration():
    """Iterating a kwargs-built dict's keys yields Python str values."""
    d = dict(a=1, b=2)
    return sorted(list(d.keys()))


def dict_kwargs_get_default():
    """dict.get('missing', default) on a missing string key returns
    the default — confirms the lookup uses string equality, not
    symbol identity."""
    d = dict(known='here')
    return d.get('missing', 'fallback')


def dict_kwargs_merged_with_positional():
    """dict({'a': 1}, b=2) merges positional dict + kwargs; the
    kwargs entry must end up with a string key alongside the
    pre-existing string key 'a'."""
    d = dict({'a': 1}, b=2)
    return (d['a'], d['b'])
