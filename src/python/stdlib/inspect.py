# GRAIL minimal inspect stub.
#
# CPython's inspect is large (~3000 lines) and pokes deep into
# CPython frame internals.  Grail needs a handful of predicate
# functions that downstream packages call at runtime.  Defaults
# err on the side of False so callers fall into their non-special
# paths.  Expand on demand.


def ismethod(obj):
    """True if obj is a bound method."""
    # Grail's BoundMethod is the closest analogue; treat the
    # Smalltalk class name as a heuristic so we don't have to
    # import the Smalltalk side.
    return type(obj).__name__ == 'BoundMethod'


def isfunction(obj):
    return type(obj).__name__ in ('function', 'ExecBlock')


def isclass(obj):
    return isinstance(obj, type)


def iscoroutinefunction(obj):
    # Grail compiles ``async def`` to a plain function, so there is no
    # intrinsic coroutine flag.  The only way an object tests true is
    # the explicit markcoroutinefunction() marker (asgiref's SyncToAsync
    # marks itself; Django's async adaptation machinery keys off this).
    try:
        return getattr(obj, '_is_coroutine_marker', False) is True
    except Exception:
        return False


def markcoroutinefunction(func):
    """Mark func as a coroutine function for iscoroutinefunction().

    CPython 3.12+ rewrites func.__code__.co_flags; Grail has no code
    objects, so set a plain attribute.  Callables that reject attribute
    stores (BoundMethod et al.) are left unmarked — they then test
    False, which keeps callers on their sync paths.
    """
    try:
        func._is_coroutine_marker = True
    except Exception:
        pass
    return func


def iscoroutine(obj):
    return False


def isasyncgenfunction(obj):
    return False


def isasyncgen(obj):
    return False


def isgeneratorfunction(obj):
    return False


def isgenerator(obj):
    return False


def isbuiltin(obj):
    return False


def isroutine(obj):
    return ismethod(obj) or isfunction(obj)


def getfullargspec(obj):
    """Return a 7-tuple-shaped object describing obj's signature.
    Stub: empty arg lists, no annotations."""
    return _FullArgSpec(args=[], varargs=None, varkw=None, defaults=None,
                        kwonlyargs=[], kwonlydefaults=None, annotations={})


class _FullArgSpec:
    def __init__(self, args, varargs, varkw, defaults, kwonlyargs,
                 kwonlydefaults, annotations):
        self.args = args
        self.varargs = varargs
        self.varkw = varkw
        self.defaults = defaults
        self.kwonlyargs = kwonlyargs
        self.kwonlydefaults = kwonlydefaults
        self.annotations = annotations


class _ParameterKind:
    """Stands in for inspect._ParameterKind enum members — distinct
    objects that compare by identity, which is all `param.kind ==
    inspect.Parameter.VAR_POSITIONAL`-style checks need."""

    def __init__(self, name):
        self._name = name

    def __repr__(self):
        return '<_ParameterKind: %s>' % self._name


class Parameter:
    POSITIONAL_ONLY = _ParameterKind('POSITIONAL_ONLY')
    POSITIONAL_OR_KEYWORD = _ParameterKind('POSITIONAL_OR_KEYWORD')
    VAR_POSITIONAL = _ParameterKind('VAR_POSITIONAL')
    KEYWORD_ONLY = _ParameterKind('KEYWORD_ONLY')
    VAR_KEYWORD = _ParameterKind('VAR_KEYWORD')

    class empty:
        pass

    def __init__(self, name, kind, default=None, annotation=None):
        self.name = name
        self.kind = kind
        self.default = default if default is not None else Parameter.empty
        self.annotation = annotation if annotation is not None else Parameter.empty


def _signature_from_callable(obj, *, follow_wrapped=True, globals=None,
                             locals=None, eval_str=False,
                             annotation_format=None, sigcls=None):
    """CPython-private constructor behind signature(); django.utils.
    inspect partials it with an annotation format.  Grail ignores
    every knob and returns the same stub signature() does."""
    return _Signature()


def signature(obj, *args, **kwargs):
    """Stub Signature with no parameters.  Accepts (and ignores) the
    extra positional/keyword args CPython 3.14 grew (globals=,
    locals=, eval_str=, annotation_format=) so keyword call sites in
    django.utils.inspect bind."""
    return _Signature()


class _Signature:
    parameters = {}

    def bind(self, *args, **kwargs):
        return _BoundArguments()

    def bind_partial(self, *args, **kwargs):
        return _BoundArguments()


class _BoundArguments:
    args = ()
    kwargs = {}
    arguments = {}

    def apply_defaults(self):
        pass


def getsource(obj):
    return ''


def getfile(obj):
    return '<unknown>'


def stack():
    return []


def currentframe():
    return None


def getattr_static(obj, name, default=None):
    """``inspect.getattr_static(obj, name)`` — CPython's
    descriptor-bypassing attribute lookup.  Grail has no descriptor
    machinery and getattr() already returns the underlying value
    rather than running descriptors, so the stub just delegates to
    builtin ``getattr`` with the same default-fallback semantics."""
    try:
        return getattr(obj, name)
    except AttributeError:
        return default


def cleandoc(doc):
    """``inspect.cleandoc(doc)'' — strip common leading whitespace
    from a multi-line docstring.  CPython's implementation walks
    each line, finds the minimum indent (excluding the first line),
    and removes that prefix from every subsequent line.  Empty
    docs pass through as ''."""
    if not doc:
        return ''
    # textwrap.dedent-style normalization, simplified for the
    # werkzeug docstring path.
    lines = doc.expandtabs().split('\n')
    # First line: only strip leading whitespace if it's all blank.
    if lines:
        lines[0] = lines[0].lstrip()
    # Find minimum indent of non-blank subsequent lines.
    min_indent = None
    for line in lines[1:]:
        stripped = line.lstrip()
        if stripped:
            indent = len(line) - len(stripped)
            if min_indent is None or indent < min_indent:
                min_indent = indent
    if min_indent:
        for i in range(1, len(lines)):
            if lines[i].strip():
                lines[i] = lines[i][min_indent:]
            else:
                lines[i] = ''
    # Strip leading/trailing blank lines.
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return '\n'.join(lines)


def unwrap(func, *, stop=None):
    """Follow the __wrapped__ chain (functools.wraps leaves it);
    Grail's wraps stub doesn't set __wrapped__, so this is usually
    the identity."""
    seen = set()
    while True:
        wrapped = getattr(func, "__wrapped__", None)
        if wrapped is None:
            return func
        if stop is not None and stop(func):
            return func
        marker = id(wrapped)
        if marker in seen:
            raise ValueError("wrapper loop when unwrapping {!r}".format(func))
        seen.add(marker)
        func = wrapped


def getmodule(obj, _filename=None):
    return None


def getdoc(obj):
    doc = getattr(obj, "__doc__", None)
    if isinstance(doc, str):
        return cleandoc(doc)
    return None


def getmembers(obj, predicate=None):
    """Return (name, value) pairs from dir(obj), optionally filtered."""
    results = []
    for name in dir(obj):
        try:
            value = getattr(obj, name)
        except AttributeError:
            continue
        if predicate is None or predicate(value):
            results.append((name, value))
    results.sort(key=lambda pair: pair[0])
    return results


def isdatadescriptor(obj):
    return False


def ismethoddescriptor(obj):
    return False


def isabstract(obj):
    return False


# Public name: `from inspect import Signature` (test_functools) -- the
# stub class doubles as the public type.
Signature = _Signature
