# GRAIL minimal inspect stub.
#
# CPython's inspect is large (~3000 lines) and pokes deep into
# CPython frame internals.  Grail needs a handful of predicate
# functions that downstream packages call at runtime.  Defaults
# err on the side of False so callers fall into their non-special
# paths.  Expand on demand.


# CPython's code-object flag bits, exposed here because that is where Python
# code reads them from (``from inspect import CO_COROUTINE``).  The values are
# CPython's and are part of the language surface, not an implementation
# detail -- test.test_builtin imports CO_COROUTINE and masks co_flags with it.
#
# Grail compiles ``async def`` to a plain function and its PyCode carries no
# flags word, so a code object here reports co_flags == 0: the NAMES resolve
# and the masks evaluate, but nothing sets the bits.  Code that asks "is this
# a coroutine?" should use iscoroutinefunction(), which Grail does answer.
CO_OPTIMIZED = 0x0001
CO_NEWLOCALS = 0x0002
CO_VARARGS = 0x0004
CO_VARKEYWORDS = 0x0008
CO_NESTED = 0x0010
CO_GENERATOR = 0x0020
CO_NOFREE = 0x0040
CO_COROUTINE = 0x0080
CO_ITERABLE_COROUTINE = 0x0100
CO_ASYNC_GENERATOR = 0x0200
CO_HAS_DOCSTRING = 0x4000000
CO_METHOD = 0x8000000


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


class _empty:
    """CPython's ``Parameter.empty`` / ``Signature.empty`` -- the marker for
    "there is no default" and "there is no annotation".

    A MODULE-level sentinel rather than None, and that distinction is the whole
    point: ``Parameter('module', KEYWORD_ONLY, default=None)`` means the default
    IS None, and rendered as ``module=None``.  Grail used None as the marker, so
    that parameter rendered as a bare ``module`` -- indistinguishable from one
    with no default at all.  Defined before Parameter so it can be the actual
    default expression of __init__ rather than something patched in after."""


class Parameter:
    POSITIONAL_ONLY = _ParameterKind('POSITIONAL_ONLY')
    POSITIONAL_OR_KEYWORD = _ParameterKind('POSITIONAL_OR_KEYWORD')
    VAR_POSITIONAL = _ParameterKind('VAR_POSITIONAL')
    KEYWORD_ONLY = _ParameterKind('KEYWORD_ONLY')
    VAR_KEYWORD = _ParameterKind('VAR_KEYWORD')

    empty = _empty

    def __init__(self, name, kind, default=_empty, annotation=_empty):
        self.name = name
        self.kind = kind
        self.default = default
        self.annotation = annotation

    def __repr__(self):
        return '<Parameter "%s">' % (self,)

    def __str__(self):
        text = self.name
        if self.kind is Parameter.VAR_POSITIONAL:
            text = '*' + text
        elif self.kind is Parameter.VAR_KEYWORD:
            text = '**' + text
        annotated = self.annotation is not Parameter.empty
        if annotated:
            text = text + ': ' + formatannotation(self.annotation)
        if self.default is not Parameter.empty:
            text = text + (' = ' if annotated else '=') + repr(self.default)
        return text

    def __eq__(self, other):
        """CPython compares the four fields, which is what makes an expected
        Signature built by hand compare equal to an introspected one -- and
        without it two Parameters compared by IDENTITY, so no such comparison
        could ever succeed (test_enum's test_inspect_signatures builds exactly
        that expectation)."""
        if not isinstance(other, Parameter):
            return NotImplemented
        return (self.name == other.name
                and self.kind is other.kind
                and self.default == other.default
                and self.annotation == other.annotation)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash((self.name, id(self.kind)))


_KINDS = (Parameter.POSITIONAL_ONLY, Parameter.POSITIONAL_OR_KEYWORD,
          Parameter.VAR_POSITIONAL, Parameter.KEYWORD_ONLY,
          Parameter.VAR_KEYWORD)


def formatannotation(annotation, base_module=None):
    """Render an annotation as CPython does in a signature string.

    A class prints as its NAME (``int``, not ``<class 'int'>``); anything else
    prints as its repr -- so a string annotation prints WITH quotes, which is
    also what CPython does for one.

    Grail maps some builtins to a method handle rather than a class, so the
    test is "does it have a __name__" rather than isinstance(x, type): ``str``
    is a BoundMethod here and would otherwise have printed as its repr.
    """
    name = getattr(annotation, '__name__', None)
    if isinstance(name, str):
        return name
    return repr(annotation)


def _annotations_for_render(func):
    """The annotations to print in a signature, never raising.

    VALUE first, since that is what CPython renders.  An annotation naming
    something unbound raises NameError there -- but a signature is usually
    being printed to DIAGNOSE such code, so fall back to the source text
    rather than making the repr itself fail.
    """
    try:
        import annotationlib
        return annotationlib.get_annotations(func)
    except NameError:
        try:
            import annotationlib
            return annotationlib.get_annotations(
                func, format=annotationlib.Format.STRING)
        except BaseException:
            return {}
    except BaseException:
        return {}


def _unwrap(obj):
    """Follow the __wrapped__ chain, as signature(follow_wrapped=True) does.

    functools.wraps sets it, so ``signature(lru_cache(f))`` reports f's
    parameters rather than the wrapper's ``(*args, **kwargs)``.  Bounded in
    case a wrapper ever points at itself.
    """
    seen = 0
    while seen < 32:
        nxt = getattr(obj, '__wrapped__', None)
        if nxt is None or nxt is obj:
            return obj
        obj = nxt
        seen += 1
    return obj


def _signature_from_spec(func):
    """Build a Signature from the def-time parameter spec, or None.

    FunctionDefAst stamps ``__signature_spec__`` -- a tuple of
    ``(name, kind-index, default-source-text-or-None)`` in declaration order --
    on every def.  Grail has no code object to introspect, and the corpus never
    reads ``co_varnames``/``co_argcount`` anyway, so the compiler records what
    it already knows instead.
    """
    spec = getattr(func, '__signature_spec__', None)
    if not spec:
        return None
    ann = _annotations_for_render(func)
    params = []
    for entry in spec:
        name = entry[0]
        kind = _KINDS[entry[1]]
        # Two elements means "no default" -- see emitSignatureEntryFor:.
        default = entry[2] if len(entry) > 2 else None
        params.append(Parameter(
            name, kind,
            default=_DefaultText(default) if default is not None else _empty,
            annotation=ann.get(name, _empty)))
    return Signature(parameters=params,
                     return_annotation=ann.get('return', _empty))


class _DefaultText:
    """A default rendered from its SOURCE TEXT rather than its value.

    CPython prints ``repr(default)``.  Grail prints the text the def wrote,
    because the default is evaluated exactly once -- at def-time, into the
    wrapper block FunctionDefAst already emits -- and re-emitting the
    expression here to get a value would evaluate it a SECOND time, which is
    observable for a mutable or side-effecting default.  The two agree for the
    literals that make up almost every real signature (``c=True``, ``n=0``,
    ``s=''``) and differ only where the text is not already its own repr
    (``x=1+1`` prints ``1+1`` where CPython prints ``2``).
    """

    def __init__(self, text):
        self._text = text

    def __repr__(self):
        return self._text

    def __eq__(self, other):
        """Equal to another text, and equal to a VALUE that renders as that
        text.

        The second half is what lets an introspected signature compare equal to
        the same one built by hand: CPython's Parameter.__eq__ compares defaults
        by value, and an expected signature is written with values
        (``default=1``) while an introspected one carries the source text
        (``'1'``).  Comparing by rendered form is the faithful bridge -- and the
        only one available, since re-evaluating the text to get a value is
        exactly what this class exists to avoid.

        So it agrees wherever the text is already its own repr, which is every
        literal, and disagrees where it is not (``x=1+1`` holds '1+1', which no
        value renders as) -- the same boundary __repr__ has."""
        if isinstance(other, _DefaultText):
            return other._text == self._text
        try:
            return repr(other) == self._text
        except BaseException:
            return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(self._text)


def _signature_from_callable(obj, *, follow_wrapped=True, globals=None,
                             locals=None, eval_str=False,
                             annotation_format=None, sigcls=None):
    """CPython-private constructor behind signature()."""
    return signature(obj, follow_wrapped=follow_wrapped)


def signature(obj, *args, **kwargs):
    """Return a Signature for ``obj``.

    Resolution order, most specific first:

      1. an explicit ``__signature__``;
      2. the def-time parameter SPEC the compiler stamped on the function --
         real parameter names, kinds and defaults (see _signature_from_spec),
         reached through the ``__wrapped__`` chain so a decorated function
         reports the signature of what it wraps rather than
         ``(*args, **kwargs)``;
      3. the CPython ``__text_signature__`` convention, for callables that
         advertise one (operator.attrgetter/itemgetter/methodcaller, and the
         C-implemented functools helpers);
      4. an empty Signature.

    Step 2 is what makes ``.parameters`` non-empty and ``str(sig)`` real;
    before it, every Python-defined callable landed on step 4.
    """
    sig = getattr(obj, '__signature__', None)
    if isinstance(sig, Signature):
        return sig

    target = _unwrap(obj) if kwargs.get('follow_wrapped', True) else obj
    from_spec = _signature_from_spec(target)
    if from_spec is not None:
        return from_spec

    if isinstance(obj, type):
        text = getattr(obj, '__text_signature__', None)
    else:
        text = getattr(obj, '__call_signature__', None)
        if not isinstance(text, str):
            call = getattr(type(obj), '__call__', None)
            text = getattr(call, '__text_signature__', None) if call is not None else None
    if isinstance(text, str):
        return Signature(text=text)
    return Signature()


class Signature:
    empty = Parameter.empty

    def __init__(self, parameters=None, *, return_annotation=_empty, text=None):
        """CPython's first positional argument is PARAMETERS, and this took
        ``text'' there -- a Grail-only shortcut for a signature already rendered
        as a string.  So ``Signature([Parameter(...), ...])'', the spelling
        every caller writing an expected signature by hand uses, stashed the
        LIST as the rendered text; __str__ handed it back unrendered and
        __repr__ then concatenated a string with a list:

            TypeError: unsupported operand type(s) for +:
                       'Unicode7' and 'OrderedCollection'

        The text form is still here, now keyword-only, which is how the one
        internal caller passes it."""
        self._text = text
        self._params = list(parameters) if parameters else []
        self.return_annotation = return_annotation

    @classmethod
    def from_callable(cls, obj, **kwargs):
        """CPython's ``Signature.from_callable(obj)`` -- the constructor
        test_functools uses throughout, and the reason this classmethod has to
        exist rather than callers going through ``signature()``."""
        return signature(obj, **kwargs)

    @property
    def parameters(self):
        """Ordered mapping name -> Parameter, as CPython's is.  A plain dict:
        Grail dicts preserve insertion order, which is all the ordering
        guarantee callers rely on."""
        out = {}
        for p in self._params:
            out[p.name] = p
        return out

    def __str__(self):
        """Render as CPython does: ``(a, /, b, c=True)``, with ``/`` closing
        the positional-only group, a bare ``*`` opening keyword-only
        parameters when there is no ``*args``, ``x: int = 5`` (spaces) when a
        parameter is annotated but ``x=5`` when it is not, and a trailing
        ``-> ann``."""
        if self._text is not None:
            return self._text

        rendered = []
        prev_kind = None
        for p in self._params:
            if (prev_kind is Parameter.POSITIONAL_ONLY
                    and p.kind is not Parameter.POSITIONAL_ONLY):
                rendered.append('/')
            if (p.kind is Parameter.KEYWORD_ONLY
                    and prev_kind is not Parameter.KEYWORD_ONLY
                    and prev_kind is not Parameter.VAR_POSITIONAL):
                rendered.append('*')

            text = p.name
            if p.kind is Parameter.VAR_POSITIONAL:
                text = '*' + text
            elif p.kind is Parameter.VAR_KEYWORD:
                text = '**' + text

            annotated = p.annotation is not Parameter.empty
            if annotated:
                text = text + ': ' + formatannotation(p.annotation)
            if p.default is not Parameter.empty:
                text = text + (' = ' if annotated else '=') + repr(p.default)
            rendered.append(text)
            prev_kind = p.kind

        if prev_kind is Parameter.POSITIONAL_ONLY:
            rendered.append('/')

        out = '(' + ', '.join(rendered) + ')'
        if self.return_annotation is not Parameter.empty:
            out = out + ' -> ' + formatannotation(self.return_annotation)
        return out

    def __repr__(self):
        return '<Signature ' + self.__str__() + '>'

    def __eq__(self, other):
        """Compare by PARAMETERS and return annotation, as CPython does, so a
        signature built by hand compares equal to an introspected one.  Without
        it the comparison was by identity and always False.

        A text-only signature has no parameter list to compare, so it falls
        back to comparing what it renders as -- which is the only thing it
        knows about itself."""
        if not isinstance(other, Signature):
            return NotImplemented
        if self._text is not None or other._text is not None:
            return str(self) == str(other)
        return (self._params == other._params
                and self.return_annotation == other.return_annotation)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(str(self))

    def bind(self, *args, **kwargs):
        return _BoundArguments()

    def bind_partial(self, *args, **kwargs):
        return _BoundArguments()


# The old private name, kept because Grail code and third-party call sites
# both reference it.
_Signature = Signature


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


def getmro(cls):
    """The class's __mro__ as a tuple -- CPython's inspect.getmro."""
    try:
        return tuple(cls.__mro__)
    except AttributeError:
        return (cls,)


def getmembers(obj, predicate=None):
    """Return (name, value) pairs from dir(obj), optionally filtered.

    CPython's version does two things beyond walking ``dir()``, and both exist
    for attributes ``dir()`` alone cannot reach:

    * a name that ``dir()`` offers but ``getattr()`` refuses is looked up in the
      MRO's ``__dict__``s rather than dropped.  A descriptor may decline to
      produce a value while still being a real member -- CPython's comment is
      "some descriptors don't return meaningful values and are only implemented
      for the sake of __dir__".

    * every ``DynamicClassAttribute`` in a base's ``__dict__`` is ADDED to the
      candidate names.  Such a descriptor deliberately hides itself from the
      class (it routes class access to the metaclass) so ``dir()`` never offers
      it -- ``Enum.name`` and ``Enum.value`` are the canonical pair, which is
      why ``inspect.getmembers(SomeEnum)`` reports them in CPython.

    Grail did neither, so a class attribute reachable only through those two
    paths was simply absent.
    """
    # Imported here, not at module scope: types reaches enum for
    # DynamicClassAttribute, and inspect is imported early enough that the
    # module-level cycle bites.
    import types

    is_class = isinstance(obj, type)
    mro = ((obj,) + tuple(getmro(obj))) if is_class else ()
    names = list(dir(obj))
    # DynamicClassAttributes hide from dir(), so collect them off the bases.
    try:
        for base in obj.__bases__:
            for k, v in base.__dict__.items():
                if isinstance(v, types.DynamicClassAttribute):
                    names.append(k)
    except AttributeError:
        pass
    results = []
    processed = set()
    for name in names:
        try:
            value = getattr(obj, name)
            # A name reached twice (dir() and the sweep above) takes the
            # __dict__ route, so the descriptor itself is reported.
            if name in processed:
                raise AttributeError(name)
        except AttributeError:
            for base in mro:
                try:
                    d = base.__dict__
                except AttributeError:
                    continue
                if name in d:
                    value = d[name]
                    break
            else:
                # A missing slot, or a __dir__ offering a name nothing backs.
                continue
        if predicate is None or predicate(value):
            results.append((name, value))
        processed.add(name)
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
