import markupsafe
from markupsafe import _native


def import_attributes_exist():
    # The top-level module exposes the public surface we expect from
    # the upstream MarkupSafe drop-in.
    return (
        hasattr(markupsafe, "escape"),
        hasattr(markupsafe, "Markup"),
        hasattr(markupsafe, "escape_silent"),
        hasattr(markupsafe, "soft_str"),
    )


def escape_inner_round_trip():
    # The pure-Python `_escape_inner` is what MarkupSafe falls back to
    # when the C speedups extension is not available.  Grail never
    # ships the C extension, so this is the codepath escape() takes.
    return _native._escape_inner("<a href='&'>\"x\"</a>")


def escape_inner_no_specials():
    return _native._escape_inner("plain text 123")


def markup_subclasses_str():
    return issubclass(markupsafe.Markup, str)


def builtin_hasattr_on_plain_string():
    # hasattr() didn't exist before this session; lock it in.
    return (hasattr("hi", "upper"), hasattr("hi", "__no_such_attr__"))


def builtin_getattr_on_plain_string():
    return getattr("hi", "upper")()


def escape_returns_populated_markup():
    # The full escape() round-trip — exercises NameAst's
    # base-of-classdef fix, CharacterCollection __new__: self-typing,
    # and ClassDefAst's str-subclass instantiation path that routes
    # Markup("text") through str.__new__(Markup, "text").
    return str(markupsafe.escape("<hello>"))


def escape_preserves_safe_html():
    return str(markupsafe.escape("plain & simple"))


def markup_carries_string_content():
    # Direct Markup(value) call (no escape) — the str-subclass
    # instantiation path must produce a Markup whose characters are
    # the input string.
    m = markupsafe.Markup("hello world")
    return (str(m), len(m), type(m) is markupsafe.Markup)
