# GRAIL annotationlib (PEP 649 / PEP 749, new in CPython 3.14).
#
# Annotations are computed, not stored: every annotated def carries an
# ``__annotate__'' function that FunctionDefAst builds at def-time and that
# takes a Format and answers the annotation dict.  This module is the public
# face of that protocol -- it decides WHICH format to ask for, and repairs the
# one case the annotate function cannot express on its own (FORWARDREF).
#
# django.utils.inspect imports Format on its PY314 branch to ask
# inspect.signature for FORWARDREF-format annotations.


class Format:
    VALUE = 1
    VALUE_WITH_FAKE_GLOBALS = 2
    FORWARDREF = 3
    STRING = 4


# The marker ExecBlock >> ___annotationValue___:source:format: substitutes for
# an annotation that would not resolve under FORWARDREF.  Grail-internal: it
# exists only between the emitted annotate function and this module, and is
# converted to a ForwardRef before any of it is visible to Python.
_FORWARDREF_MARKER = '__grail_forwardref__'


class ForwardRef:
    """A reference to a name that was not bound when the annotation was read.

    CPython builds these by re-running the annotate function against fake
    globals that record every name it touches.  Grail instead evaluates each
    annotation independently and reports the ones that raised NameError, which
    reaches the same place: the resolvable annotations come back as values, and
    only the others arrive as ForwardRefs.
    """

    #: CPython's ForwardRef is slotted, and the slot NAMES are read as an API:
    #:
    #:     _FORWARD_REF_HAS_CLASS = "__forward_is_class__" in typing.ForwardRef.__slots__
    #:
    #: is typing_extensions line 161, and it is how a library version-detects
    #: this class without a version comparison.  pydantic_core reaches it the
    #: same way.  Declaring the tuple is therefore not decoration: without it
    #: both packages die on ``type object 'ForwardRef' has no attribute
    #: '__slots__'`` before their first definition.
    #:
    #: The names are CPython 3.14's, in CPython's order.  Grail does not
    #: enforce slots, so this is a declaration of the attribute set rather
    #: than a layout, and the ones this class does not itself populate
    #: (``__stringifier_dict__``, ``__globals__``) are the fake-globals
    #: machinery described above.
    __slots__ = ('__forward_is_argument__', '__forward_is_class__',
                 '__forward_module__', '__weakref__', '__arg__',
                 '__globals__', '__extra_names__', '__code__',
                 '__ast_node__', '__cell__', '__owner__',
                 '__stringifier_dict__', '__resolved_str_cache__')

    def __init__(self, arg, module=None, owner=None, is_class=False,
                 is_argument=True, **kwargs):
        """GRAIL: the keyword set is CPython's, not a subset.

        ``typing._make_forward_ref'' forwards whatever it was given
        (``is_argument='', ``parent_fwdref='' resolved to module/owner), so a
        signature narrower than CPython's does not degrade -- it raises
        TypeError from inside ``get_type_hints'', which is the single most
        common thing anyone asks typing to do.  ``**kwargs'' absorbs the
        purely-internal ones (``__cell__''-style plumbing for the fake-globals
        evaluation Grail does not perform) rather than letting them fail.
        """
        if not isinstance(arg, str):
            raise TypeError(
                'Forward reference must be a string -- got ' + repr(arg))
        self.__arg__ = arg
        self.__forward_is_class__ = is_class
        self.__forward_is_argument__ = is_argument
        self.__forward_module__ = module
        self.__owner__ = owner
        self.__globals__ = None
        self.__cell__ = None
        self.__extra_names__ = None
        self.__code__ = None
        self.__ast_node__ = None
        self.__resolved_str_cache__ = None

    @property
    def __forward_arg__(self):
        """The annotation source text.

        A PROPERTY over the ``__arg__`` slot, matching CPython, and not a
        second slot holding the same string.  Declaring ``__slots__`` above
        made the difference load-bearing: Grail enforces the declaration, so
        storing the text under a name the tuple does not list raises
        ``'ForwardRef' object has no attribute '__forward_arg__'`` -- which is
        exactly what pathspec then hit, having imported cleanly a moment
        before.  CPython lists ``__arg__`` and computes this one.
        """
        return self.__arg__

    @property
    def __forward_code__(self):
        """The annotation's source text.

        CPython compiles the string to a code object and caches it here;
        ``_make_forward_ref'' reads the attribute purely to force that
        compilation.  Grail evaluates the source directly in ``evaluate'',
        so the source IS the cached form and the eager read is a no-op that
        must nonetheless not raise.
        """
        return self.__forward_arg__

    def __eq__(self, other):
        """NotImplemented for a foreign operand, so Python tries the REFLECTED
        __eq__ -- which is the whole mechanism test.support's
        EqualToForwardRef relies on to compare equal to a real ForwardRef.
        Answering False here instead suppressed the reflection and made every
        such comparison unequal."""
        if not isinstance(other, ForwardRef):
            return NotImplemented
        return other.__forward_arg__ == self.__forward_arg__

    def __hash__(self):
        return hash(self.__forward_arg__)

    def __repr__(self):
        return 'ForwardRef(' + repr(self.__forward_arg__) + ')'

    def _evaluate(self, globalns, localns, type_params=None, *,
                  recursive_guard=frozenset()):
        """The old, private spelling of ``evaluate``.

        Deprecated upstream and still present in 3.14, because libraries call
        it -- and Grail's own StdlibLongTailTestCase has pinned its behaviour
        since before ``evaluate`` worked at all.  That behaviour is the
        fallback below: an unresolvable reference answers its own SOURCE TEXT
        rather than raising.  Guessing an object would be worse than answering
        the text, and a caller of the private method is by definition doing
        something introspective rather than type-checking.

        ``evaluate`` itself does NOT do this -- it lets NameError propagate,
        because ``get_type_hints`` needs to distinguish an unresolvable
        annotation from one that legitimately IS a string.
        """
        try:
            return self.evaluate(globals=globalns, locals=localns,
                                 type_params=type_params)
        except NameError:
            return self.__forward_arg__

    def evaluate(self, *, globals=None, locals=None, type_params=None,
                 owner=None, format=None):
        """Resolve the deferred annotation, or raise NameError.

        This is what ``typing.get_type_hints'' calls for every string
        annotation, so while it raised NotImplementedError, ``get_type_hints''
        on ANY function with a quoted annotation was unreachable -- and a
        quoted annotation is the ordinary way to write a forward or a cyclic
        reference.  pydantic, attrs and dataclasses all take that path.

        Namespaces are searched in CPython's order: explicit ``locals'', then
        explicit ``globals'', then the owner's own module globals, then the
        defining module's, then builtins.  ``type_params'' (PEP 695) are
        merged last-but-one so a type parameter shadows a module global of the
        same name, matching CPython.

        NameError is left to propagate.  ``get_type_hints'' converts it into
        its own message, and swallowing it here would turn an unresolvable
        annotation into a silently missing key.
        """
        import builtins
        import sys

        ns = {}
        module = self.__forward_module__
        if module is None and owner is None:
            owner = self.__owner__
        if module is None and owner is not None:
            module = getattr(owner, '__module__', None)
        if isinstance(module, str):
            module = sys.modules.get(module)
        if module is not None:
            ns.update(getattr(module, '__dict__', None) or {})
        if globals:
            ns.update(globals)
        if type_params:
            for tp in type_params:
                name = getattr(tp, '__name__', None)
                if name:
                    ns[name] = tp
        if locals:
            ns.update(locals)
        ns.setdefault('__builtins__', builtins)
        return eval(self.__forward_arg__, ns)


def _is_forwardref_marker(value):
    """True for the two-element marker tuple the annotate function returns.

    Checked by shape rather than with isinstance, so a genuine string or
    two-tuple annotation is never mistaken for one -- the first element has to
    be the private marker string.
    """
    return (isinstance(value, tuple) and len(value) == 2
            and value[0] == _FORWARDREF_MARKER)


def get_annotations(obj, format=Format.VALUE, owner=None, **kwargs):
    """The annotations of a function, in the requested Format.

    VALUE is the default and the strict one: an annotation naming something
    that is still not bound raises NameError, exactly as reading
    ``obj.__annotations__'' does.  FORWARDREF asks for the same evaluation but
    substitutes a ForwardRef for each name that would have raised.  STRING
    never evaluates anything, so it works on any annotation at all.
    """
    annotate = getattr(obj, '__annotate__', None)
    if annotate is None:
        # No annotate function: either genuinely unannotated, or one of the
        # callables whose annotations Grail keeps elsewhere (a method's live on
        # its defining class).  __annotations__ covers both.
        return dict(getattr(obj, '__annotations__', {}) or {})

    if format == Format.VALUE:
        return dict(annotate(Format.VALUE))
    if format == Format.STRING:
        return dict(annotate(Format.STRING))
    if format == Format.FORWARDREF:
        result = {}
        for key, value in annotate(Format.FORWARDREF).items():
            if _is_forwardref_marker(value):
                value = ForwardRef(value[1], owner=owner or obj)
            result[key] = value
        return result
    raise NotImplementedError('unsupported annotation format: ' + repr(format))


def call_annotate_function(annotate, format, owner=None):
    """Call an annotate function and post-process it as get_annotations does."""

    if format == Format.FORWARDREF:
        result = {}
        for key, value in annotate(Format.FORWARDREF).items():
            if _is_forwardref_marker(value):
                value = ForwardRef(value[1], owner=owner)
            result[key] = value
        return result
    return dict(annotate(format))


def type_repr(value):
    """Convert a Python value to a format suitable for use with the STRING format.

    This is intended as a helper for tools that support the STRING format but do
    not have access to the code that originally produced the annotations.  It
    uses repr() for most objects.

    GRAIL: this is the *public* helper CPython's typing.py leans on for every
    generic alias it prints -- ``_GenericAlias.__repr__'' is a join of
    ``type_repr'' over ``__args__''.  Vendoring CPython's real typing.py
    without it meant ``repr(List[int])'' raised AttributeError while
    ``get_origin''/``get_args'' on the very same object worked: the alias was
    built correctly and could only not be shown.  A missing repr is easy to
    read as "generics are broken" and hard to read as "one helper is absent",
    which is why it is worth a comment.

    The template branch of CPython's version is omitted: PEP 750 t-strings are
    a compiler feature Grail's parser does not have, so no ``_Template'' can
    reach here.
    """
    import types
    if isinstance(value, (type, types.FunctionType, types.BuiltinFunctionType)):
        if value.__module__ == "builtins":
            return value.__qualname__
        return f"{value.__module__}.{value.__qualname__}"
    if value is ...:
        return "..."
    return repr(value)


def get_annotate_from_class_namespace(obj):
    """Retrieve the annotate function from a class namespace dictionary.

    Return None if the namespace does not contain an annotate function.

    GRAIL: reached from a metaclass ``__new__`` -- typing's ``NamedTupleMeta``
    and ``_TypedDictMeta`` both consult it to find a class's field types when
    the namespace carries no ``__annotations__``.  Grail's class namespaces do
    carry ``__annotations__``, so this normally answers None down the second
    branch and the caller takes its first; it must nonetheless EXIST, or the
    walrus that calls it raises AttributeError and the class statement dies.
    """
    try:
        return obj["__annotate__"]
    except KeyError:
        return obj.get("__annotate_func__", None)
