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
    traceback = _ThemeSection({
        'filename': '\x1b[35m',
        'line_no': '\x1b[35m',
        'frame': '\x1b[35m',
        'error_highlight': '\x1b[1;31m',
        'error_range': '\x1b[31m',
        'reset': '\x1b[0m',
    })


default_theme = _Theme()


def get_theme(*, tty_file=None, force_color=False, force_no_color=False):
    return default_theme
