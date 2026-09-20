"""A module function must be an OBJECT, not just something you can call.

Grail reads a module attribute by PERFORMING the Smalltalk method behind it,
unless the method's category says it is a function -- in which case the read
answers a BoundMethod instead. That list of function categories is what makes
`from random import random` bind the function rather than a float.

Roughly thirty zero-argument module functions were filed in AD-HOC categories
(`os.getcwd` in 'Grail-File and Directory Operations', `hashlib.md5` in
'Grail-Constructors', `_thread.get_ident` in 'Grail-Threading'), so the read
performed them and handed back the RESULT:

    hashlib.md5()          a hash object   -- worked
    f = hashlib.md5; f()   TypeError       -- CPython gives a hash object

Only the call form worked, and by coincidence: a zero-argument call and an
attribute read compile to the same unary send, so performing the method WAS
calling it. The name was never a first-class function.

WHAT IS AND IS NOT A FUNCTION HERE WAS DECIDED BY READING EVERY CANDIDATE, not
by its name, because the categories had already been shown untrustworthy. Two
groups were deliberately left alone:

  * `sys.excepthook` and friends are `^ self at: #excepthook` -- DICTIONARY
    READS returning a stored hook. CPython has them as data attributes holding
    a function, so performing is already right; making them "functions" would
    wrap the accessor instead of answering the hook.
  * `builtins.__dir__` is the `__dir__` PROTOCOL method that `dir()` calls
    internally, not a module-level function.

CPython was used to narrow the candidates -- which names it exposes as callable
non-classes -- but not to decide, since it flags `sys.excepthook` too.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _call_through_a_reference(fn):
    """Bind the attribute FIRST, then call it -- the shape that was broken."""
    f = fn
    return f()


# ---------------------------------- a module function is first-class now

def _first_class():
    import os
    import hashlib
    import secrets
    import _thread
    out = {}
    out['os.getcwd'] = isinstance(_call_through_a_reference(os.getcwd), str)
    out['os.getpid'] = isinstance(_call_through_a_reference(os.getpid), int)
    out['os.cpu_count'] = isinstance(_call_through_a_reference(os.cpu_count), int)
    out['hashlib.md5'] = hasattr(_call_through_a_reference(hashlib.md5), 'hexdigest')
    out['hashlib.sha256'] = hasattr(_call_through_a_reference(hashlib.sha256), 'hexdigest')
    out['secrets.token_hex'] = isinstance(_call_through_a_reference(secrets.token_hex), str)
    out['_thread.get_ident'] = isinstance(_call_through_a_reference(_thread.get_ident), int)
    return {k: v for k, v in out.items() if v is not True}


check('a_module_function_survives_being_bound', _first_class(), {})


# ------------------------- and is still callable the ordinary way

def _still_callable():
    import os
    import hashlib
    import secrets
    out = {}
    out['os.getcwd'] = isinstance(os.getcwd(), str)
    out['os.getpid'] = isinstance(os.getpid(), int)
    out['os.cpu_count'] = isinstance(os.cpu_count(), int)
    out['hashlib.md5'] = hasattr(hashlib.md5(), 'hexdigest')
    out['hashlib.sha256'] = hasattr(hashlib.sha256(), 'hexdigest')
    out['secrets.token_hex'] = isinstance(secrets.token_hex(), str)
    return {k: v for k, v in out.items() if v is not True}


check('and_is_still_callable_directly', _still_callable(), {})


# ------------------- the two spellings must agree, which is the point

def _spellings_agree():
    import os
    import hashlib
    direct = os.getcwd()
    viaref = _call_through_a_reference(os.getcwd)
    h1 = hashlib.md5().hexdigest()
    h2 = _call_through_a_reference(hashlib.md5).hexdigest()
    return (direct == viaref, h1 == h2)


check('both_spellings_give_the_same_answer', _spellings_agree(), (True, True))


# --------- functions can be PASSED, which is what first-class means

def _usable_as_a_value():
    import hashlib
    # the shape real code uses: a table of constructors
    algos = {'md5': hashlib.md5, 'sha256': hashlib.sha256}
    return sorted(name for name, ctor in algos.items()
                  if hasattr(ctor(), 'hexdigest'))


check('a_function_can_be_stored_and_called_later',
      _usable_as_a_value(), ['md5', 'sha256'])


# ------------------------------- what was deliberately NOT changed

def _accessors_untouched():
    """`sys.__excepthook__` holds a callable; it is a DATA attribute in CPython
    too, so reading it must answer the hook rather than a bound accessor."""
    import sys
    return (callable(sys.__excepthook__), callable(sys.__displayhook__))


check('hook_accessors_are_untouched', _accessors_untouched(), (True, True))
