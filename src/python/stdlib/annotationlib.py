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

    def __init__(self, arg, module=None, owner=None, is_class=False):
        self.__forward_arg__ = arg
        self.__forward_is_class__ = is_class
        self.__forward_module__ = module
        self.__owner__ = owner

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

    def evaluate(self, **kwargs):
        raise NotImplementedError(
            'annotationlib.ForwardRef.evaluate is not supported in Grail')


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
