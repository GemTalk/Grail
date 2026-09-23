"""Support for template string literals (t-strings).

GRAIL: CPython implements Template and Interpolation in C and derives the two
names here from a t-string literal.  Grail's t-string literal compiles to a
call on this module, so the types are defined here in Python instead; the
behaviour (constructor checks, concatenation, read-only attributes, pickling)
follows CPython 3.14.
"""

__all__ = ["Template", "Interpolation", "convert"]

_CONVERSIONS = (None, "s", "r", "a")


class Interpolation:
    """Interpolation object"""

    __match_args__ = ("value", "expression", "conversion", "format_spec")

    def __init__(self, value, expression="", conversion=None, format_spec=""):
        if not isinstance(expression, str):
            raise TypeError(
                "Interpolation() argument 'expression' must be str, not "
                f"{type(expression).__name__}")
        if conversion not in _CONVERSIONS:
            raise ValueError(
                "Interpolation() argument 'conversion' must be one of "
                "'s', 'a' or 'r'")
        if not isinstance(format_spec, str):
            raise TypeError(
                "Interpolation() argument 'format_spec' must be str, not "
                f"{type(format_spec).__name__}")
        object.__setattr__(self, "_value", value)
        object.__setattr__(self, "_expression", expression)
        object.__setattr__(self, "_conversion", conversion)
        object.__setattr__(self, "_format_spec", format_spec)

    @property
    def value(self):
        return self._value

    @property
    def expression(self):
        return self._expression

    @property
    def conversion(self):
        return self._conversion

    @property
    def format_spec(self):
        return self._format_spec

    def __setattr__(self, name, value):
        raise AttributeError("readonly attribute")

    def __delattr__(self, name):
        raise AttributeError("readonly attribute")

    def __repr__(self):
        return (f"Interpolation({self._value!r}, {self._expression!r}, "
                f"{self._conversion!r}, {self._format_spec!r})")

    def __reduce__(self):
        return (Interpolation, (self._value, self._expression,
                                self._conversion, self._format_spec))


class Template:
    """Template object"""

    def __init__(self, *args, **kwargs):
        if kwargs:
            raise TypeError("Template.__new__ only accepts *args arguments")
        strings = []
        interpolations = []
        last_was_str = False
        for arg in args:
            if isinstance(arg, str):
                if last_was_str:
                    strings[-1] = strings[-1] + arg
                else:
                    strings.append(arg)
                last_was_str = True
            elif isinstance(arg, Interpolation):
                if not last_was_str:
                    strings.append("")
                interpolations.append(arg)
                last_was_str = False
            else:
                raise TypeError(
                    "Template.__new__ *args need to be of type 'str' or "
                    f"'Interpolation', got {type(arg).__name__}")
        if not last_was_str:
            strings.append("")
        object.__setattr__(self, "_strings", tuple(strings))
        object.__setattr__(self, "_interpolations", tuple(interpolations))

    @property
    def strings(self):
        return self._strings

    @property
    def interpolations(self):
        return self._interpolations

    @property
    def values(self):
        return tuple(i.value for i in self._interpolations)

    def __setattr__(self, name, value):
        raise AttributeError("readonly attribute")

    def __delattr__(self, name):
        raise AttributeError("readonly attribute")

    def __iter__(self):
        parts = []
        interpolations = self._interpolations
        for index, string in enumerate(self._strings):
            if string:
                parts.append(string)
            if index < len(interpolations):
                parts.append(interpolations[index])
        return iter(parts)

    def __add__(self, other):
        if isinstance(other, Template):
            return Template(*self, *other)
        if isinstance(other, str):
            raise TypeError(
                "can only concatenate string.templatelib.Template "
                f'(not "{type(other).__name__}") to string.templatelib.Template')
        return NotImplemented

    def __radd__(self, other):
        if isinstance(other, str):
            raise TypeError(
                'can only concatenate str (not "string.templatelib.Template") '
                "to str")
        return NotImplemented

    def __repr__(self):
        return (f"Template(strings={self._strings!r}, "
                f"interpolations={self._interpolations!r})")

    def __reduce__(self):
        return (_template_unpickle, (self._strings, self._interpolations))


def convert(obj, /, conversion):
    """Convert *obj* using formatted string literal semantics."""
    if conversion is None:
        return obj
    if conversion == 'r':
        return repr(obj)
    if conversion == 's':
        return str(obj)
    if conversion == 'a':
        return ascii(obj)
    raise ValueError(f'invalid conversion specifier: {conversion}')


def _from_literal(*parts):
    """GRAIL: what a t-string literal compiles to.

    Each part is a literal run (str) or a (value, expression, conversion,
    format_spec) tuple for one replacement field.
    """
    return Template(*[part if isinstance(part, str) else Interpolation(*part)
                      for part in parts])


def _template_unpickle(*args):
    import itertools

    if len(args) != 2:
        raise ValueError('Template expects tuple of length 2 to unpickle')

    strings, interpolations = args
    parts = []
    for string, interpolation in itertools.zip_longest(strings, interpolations):
        if string is not None:
            parts.append(string)
        if interpolation is not None:
            parts.append(interpolation)
    return Template(*parts)


Template.__module__ = Interpolation.__module__ = "string.templatelib"
