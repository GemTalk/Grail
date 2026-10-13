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


# CPython's ANSIColors, verbatim.  doctest reads the named constants
# (ANSIColors.RED and RESET for a failure's divider, get_colors() for its
# summary), which is what brought the class in; before that nothing did, and
# ColorCodes below was spelled out by hand.
class ANSIColors:
    RESET = "\x1b[0m"

    BLACK = "\x1b[30m"
    BLUE = "\x1b[34m"
    CYAN = "\x1b[36m"
    GREEN = "\x1b[32m"
    GREY = "\x1b[90m"
    MAGENTA = "\x1b[35m"
    RED = "\x1b[31m"
    WHITE = "\x1b[37m"  # more like LIGHT GRAY
    YELLOW = "\x1b[33m"

    BOLD = "\x1b[1m"
    BOLD_BLACK = "\x1b[1;30m"  # DARK GRAY
    BOLD_BLUE = "\x1b[1;34m"
    BOLD_CYAN = "\x1b[1;36m"
    BOLD_GREEN = "\x1b[1;32m"
    BOLD_MAGENTA = "\x1b[1;35m"
    BOLD_RED = "\x1b[1;31m"
    BOLD_WHITE = "\x1b[1;37m"  # actual WHITE
    BOLD_YELLOW = "\x1b[1;33m"

    # intense = like bold but without being bold
    INTENSE_BLACK = "\x1b[90m"
    INTENSE_BLUE = "\x1b[94m"
    INTENSE_CYAN = "\x1b[96m"
    INTENSE_GREEN = "\x1b[92m"
    INTENSE_MAGENTA = "\x1b[95m"
    INTENSE_RED = "\x1b[91m"
    INTENSE_WHITE = "\x1b[97m"
    INTENSE_YELLOW = "\x1b[93m"

    BACKGROUND_BLACK = "\x1b[40m"
    BACKGROUND_BLUE = "\x1b[44m"
    BACKGROUND_CYAN = "\x1b[46m"
    BACKGROUND_GREEN = "\x1b[42m"
    BACKGROUND_MAGENTA = "\x1b[45m"
    BACKGROUND_RED = "\x1b[41m"
    BACKGROUND_WHITE = "\x1b[47m"
    BACKGROUND_YELLOW = "\x1b[43m"

    INTENSE_BACKGROUND_BLACK = "\x1b[100m"
    INTENSE_BACKGROUND_BLUE = "\x1b[104m"
    INTENSE_BACKGROUND_CYAN = "\x1b[106m"
    INTENSE_BACKGROUND_GREEN = "\x1b[102m"
    INTENSE_BACKGROUND_MAGENTA = "\x1b[105m"
    INTENSE_BACKGROUND_RED = "\x1b[101m"
    INTENSE_BACKGROUND_WHITE = "\x1b[107m"
    INTENSE_BACKGROUND_YELLOW = "\x1b[103m"


# CPython builds NoColors and ColorCodes by walking ANSIColors.__dict__.  A
# class's __dict__ is not where Grail keeps its class attributes, so walk the
# names instead: the result is the same set of codes, every one of them.
NoColors = ANSIColors()
ColorCodes = set()
for attr in dir(ANSIColors):
    if not attr.startswith("__"):
        ColorCodes.add(getattr(ANSIColors, attr))
        setattr(NoColors, attr, "")
ColorCodes = frozenset(ColorCodes)


def get_colors(colorize=False, *, file=None):
    """CPython's get_colors: the real codes when colouring, else NoColors."""
    if colorize or can_colorize(file=file):
        return ANSIColors()
    return NoColors


def decolor(text):
    """Remove ANSI color codes from a string -- CPython's decolor, verbatim."""
    for code in ColorCodes:
        text = text.replace(code, "")
    return text
