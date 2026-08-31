# Minimal Grail stub of CPython's internal ``_colorize'' module.
#
# Grail renders tracebacks as plain text -- it never emits ANSI colour -- so
# COLORIZE is False and can_colorize() returns False.  Only the handful of
# attributes the vendored test suites touch are provided; the ANSI values in
# default_theme.traceback match CPython's default theme so any module-level
# ``colors'' dict a test builds from it is well-formed.  (The full CPython
# module is a 355-line dataclass tree that pulls in more machinery than Grail
# needs here.)
#
# Two theme SECTIONS exist, ``traceback'' and ``argparse'', because those are
# the two modules that read one.  CPython's Theme also carries ``syntax'' and
# ``unittest'' sections; nothing in Grail asks for them, and a section that
# exists here has to carry CPython's exact key set to be worth anything, so
# they are left out rather than guessed at.

COLORIZE = False


def can_colorize(*, file=None):
    return False


class _ThemeSection(dict):
    """CPython's ThemeSection is a dataclass; the tests only need ``.items()''
    and attribute access, so a dict with attribute fallthrough suffices."""

    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


class _Theme:
    def __init__(self, traceback, argparse):
        self.traceback = traceback
        self.argparse = argparse


# CPython's ANSI values, key for key.  The ORDER matters as much as the values:
# test_traceback builds its ``colors'' dict by first letter --
# ``{k[0].lower(): v}`` with three overrides -- so ``type`` is 't', ``message``
# is 'm', ``line_no`` is 'l', ``frame`` is 'f', and of the two names starting
# ``error_`` the override pins ``error_highlight`` to 'E', leaving 'e' for
# ``error_range''.  A missing key does not fail loudly: the dict comprehension
# simply has no entry, and ``expected(**colors)`` then reports a missing
# POSITIONAL argument, which is how the absent ``type`` / ``message`` surfaced.
# ``argparse'' is CPython's _colorize.Argparse section, key for key and value
# for value.  argparse.HelpFormatter reads it by ATTRIBUTE (``t.heading'',
# ``self._theme.summary_long_option''), so a missing key is an AttributeError
# in the middle of rendering --help, not a colour that comes out wrong.
default_theme = _Theme(_ThemeSection({
    'type': '\x1b[1;35m',
    'message': '\x1b[35m',
    'filename': '\x1b[35m',
    'line_no': '\x1b[35m',
    'frame': '\x1b[35m',
    'error_highlight': '\x1b[1;31m',
    'error_range': '\x1b[31m',
    'reset': '\x1b[0m',
}), _ThemeSection({
    'usage': '\x1b[1;34m',
    'prog': '\x1b[1;35m',
    'prog_extra': '\x1b[35m',
    'heading': '\x1b[1;34m',
    'summary_long_option': '\x1b[36m',
    'summary_short_option': '\x1b[32m',
    'summary_label': '\x1b[33m',
    'summary_action': '\x1b[32m',
    'long_option': '\x1b[1;36m',
    'short_option': '\x1b[1;32m',
    'label': '\x1b[1;33m',
    'action': '\x1b[1;32m',
    'reset': '\x1b[0m',
}))

# Every key present and EMPTY, so a caller can interpolate a theme
# unconditionally and get plain text.  This is what lets traceback.py have one
# code path instead of a colorize branch at every emit site -- and it is why
# get_theme has to honour force_no_color rather than always answering the
# coloured theme, which is what it used to do.  With the flags ignored, plain
# ``format()'' would have started emitting ANSI the moment the emit sites began
# consulting a theme at all.
no_colour_theme = _Theme(
    _ThemeSection(dict((k, '') for k in default_theme.traceback)),
    _ThemeSection(dict((k, '') for k in default_theme.argparse)))


def get_theme(*, tty_file=None, force_color=False, force_no_color=False):
    if force_no_color:
        return no_colour_theme
    if force_color:
        return default_theme
    return default_theme if can_colorize(file=tty_file) else no_colour_theme


# CPython builds ColorCodes by walking ANSIColors.__dict__; the set is what
# decolor() strips.  Spelled out here because Grail has no ANSIColors class to
# walk -- nothing reads the named constants -- and because the SET is the whole
# contract: decolor's job is to measure a coloured string's PRINTED width, and
# a code it does not know about is a column argparse then miscounts.
#
# The bold/plain foreground codes below are every code the two theme sections
# above can emit, plus RESET.  CPython's fuller list (backgrounds, intense
# variants) has no source in Grail, and adding entries decolor can never meet
# would be decoration.
ColorCodes = frozenset([
    '\x1b[0m',
    '\x1b[30m', '\x1b[31m', '\x1b[32m', '\x1b[33m',
    '\x1b[34m', '\x1b[35m', '\x1b[36m', '\x1b[37m', '\x1b[90m',
    '\x1b[1m',
    '\x1b[1;30m', '\x1b[1;31m', '\x1b[1;32m', '\x1b[1;33m',
    '\x1b[1;34m', '\x1b[1;35m', '\x1b[1;36m', '\x1b[1;37m',
])


def decolor(text):
    """Remove ANSI color codes from a string -- CPython's decolor, verbatim."""
    for code in ColorCodes:
        text = text.replace(code, "")
    return text
