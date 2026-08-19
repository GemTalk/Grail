# Minimal Grail stub of CPython's internal ``_colorize'' module.
#
# Grail renders tracebacks as plain text -- it never emits ANSI colour -- so
# COLORIZE is False and can_colorize() returns False.  Only the handful of
# attributes the vendored test suites touch are provided; the ANSI values in
# default_theme.traceback match CPython's default theme so any module-level
# ``colors'' dict a test builds from it is well-formed.  (The full CPython
# module is a 355-line dataclass tree that pulls in more machinery than Grail
# needs here.)

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
    def __init__(self, traceback):
        self.traceback = traceback


# CPython's ANSI values, key for key.  The ORDER matters as much as the values:
# test_traceback builds its ``colors'' dict by first letter --
# ``{k[0].lower(): v}`` with three overrides -- so ``type`` is 't', ``message``
# is 'm', ``line_no`` is 'l', ``frame`` is 'f', and of the two names starting
# ``error_`` the override pins ``error_highlight`` to 'E', leaving 'e' for
# ``error_range''.  A missing key does not fail loudly: the dict comprehension
# simply has no entry, and ``expected(**colors)`` then reports a missing
# POSITIONAL argument, which is how the absent ``type`` / ``message`` surfaced.
default_theme = _Theme(_ThemeSection({
    'type': '\x1b[1;35m',
    'message': '\x1b[35m',
    'filename': '\x1b[35m',
    'line_no': '\x1b[35m',
    'frame': '\x1b[35m',
    'error_highlight': '\x1b[1;31m',
    'error_range': '\x1b[31m',
    'reset': '\x1b[0m',
}))

# Every key present and EMPTY, so a caller can interpolate a theme
# unconditionally and get plain text.  This is what lets traceback.py have one
# code path instead of a colorize branch at every emit site -- and it is why
# get_theme has to honour force_no_color rather than always answering the
# coloured theme, which is what it used to do.  With the flags ignored, plain
# ``format()'' would have started emitting ANSI the moment the emit sites began
# consulting a theme at all.
no_colour_theme = _Theme(_ThemeSection(
    dict((k, '') for k in default_theme.traceback)))


def get_theme(*, tty_file=None, force_color=False, force_no_color=False):
    if force_no_color:
        return no_colour_theme
    if force_color:
        return default_theme
    return default_theme if can_colorize(file=tty_file) else no_colour_theme
