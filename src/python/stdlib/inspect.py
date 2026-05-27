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
    return False


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


def signature(obj):
    """Stub Signature with no parameters."""
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
