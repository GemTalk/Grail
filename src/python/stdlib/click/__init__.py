# Minimal ``click'' stub for Grail.
#
# CPython's click (https://click.palletsprojects.com) is a CLI
# framework Flask uses for ``flask run'' / ``flask shell'' /
# ``flask routes''.  The test-client demo path doesn't need the
# CLI surface — only ``click.secho'' for a coloured warning
# printed when running the dev server (which Grail doesn't ship)
# and ``click.testing.CliRunner'' / ``Result'' for Flask's CLI
# test harness (which isn't exercised by ``app.test_client()'').
#
# Stubs make ``import click'' and ``from click.testing import
# CliRunner'' resolve cleanly without bringing in the full library.


def secho(message=None, fg=None, bg=None, bold=None, dim=None,
          underline=None, blink=None, reverse=None, reset=True,
          nl=True, err=False, color=None, file=None):
    """``click.secho'' — print a styled message.  Grail strips the
    styling and prints to stdout (or stderr if err=True)."""
    text = '' if message is None else str(message)
    end = '\n' if nl else ''
    print(text, end=end)


def echo(message=None, file=None, nl=True, err=False, color=None):
    text = '' if message is None else str(message)
    end = '\n' if nl else ''
    print(text, end=end)


def style(text, fg=None, bg=None, **kwargs):
    return text


class _FunctionWrapper:
    """Stub callable that carries the attribute surface a
    ``click.Command'' would expose (``params'', ``name'',
    ``callback'', ``help'').  Flask's CLI registration writes to
    ``.params'' on decorated functions at module-init even when
    the CLI never runs, so a wrapper has to be present even in
    the stub.

    Delegates calls to the wrapped function (so calling the
    decorated function still works) and forwards a couple of
    introspection attributes."""

    def __init__(self, func, **kwargs):
        self._func = func
        self.params = []
        self.name = kwargs.get('name') or getattr(func, '__name__', None)
        self.callback = func
        self.help = kwargs.get('help')
        self.short_help = kwargs.get('short_help')
        self.context_settings = kwargs.get('context_settings') or {}

    def __call__(self, *args, **kwargs):
        return self._func(*args, **kwargs)


# Decorator stubs so ``@click.command'' / ``@click.option'' don't
# explode at module-init.
def _identity_decorator(*args, **kwargs):
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return args[0]

    def _wrap(f):
        return f
    return _wrap


def _wrap_or_identity(*args, **kwargs):
    """``@click.command'' / ``@click.group'' — return a
    _FunctionWrapper so callers that read ``.params'' / ``.name''
    after the decorator runs still find them."""
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return _FunctionWrapper(args[0])

    def _wrap(f):
        return _FunctionWrapper(f, **kwargs)
    return _wrap


command = _wrap_or_identity
group = _wrap_or_identity
option = _identity_decorator
argument = _identity_decorator
pass_context = _identity_decorator
pass_obj = _identity_decorator


def make_pass_decorator(object_type, ensure=False):
    """Stub click.make_pass_decorator — returns a decorator that's
    a no-op (the wrapped function is returned unchanged).  Used by
    Flask's cli.py at module-init for ``pass_script_info''."""
    return _identity_decorator


def version_option(*args, **kwargs):
    """Stub click.version_option — returns the identity decorator."""
    return _identity_decorator


class Command:
    """Stub click.Command — exposed for isinstance checks."""

    def __init__(self, name=None, callback=None, params=None,
                 help=None, **kwargs):
        self.name = name
        self.callback = callback
        self.params = params or []
        self.help = help


class Group(Command):
    """Stub click.Group — collection of subcommands."""

    def __init__(self, name=None, commands=None, **kwargs):
        super().__init__(name=name, **kwargs)
        self.commands = commands or {}

    def add_command(self, cmd, name=None):
        self.commands[name or cmd.name] = cmd


class Option:
    """Stub click.Option."""

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs


class Argument:
    """Stub click.Argument."""

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs


class ParamType:
    """Stub click.ParamType — base for click type validators."""

    def __init__(self, *args, **kwargs):
        pass


class Path(ParamType):
    """Stub click.Path — file path validator.  Subclassed in
    flask.cli; needs to accept the constructor kwargs (exists,
    dir_okay, file_okay, resolve_path, ...)."""

    def __init__(self, exists=False, file_okay=True, dir_okay=True,
                 writable=False, readable=True, resolve_path=False,
                 allow_dash=False, path_type=None, executable=False):
        self.exists = exists
        self.file_okay = file_okay
        self.dir_okay = dir_okay
        self.writable = writable
        self.readable = readable
        self.resolve_path = resolve_path
        self.allow_dash = allow_dash
        self.path_type = path_type
        self.executable = executable


class STRING(ParamType):
    pass


class INT(ParamType):
    pass


class BOOL(ParamType):
    pass


class Parameter:
    """Stub click.Parameter — base for Option / Argument."""
    pass


class Context:
    """Stub click.Context."""

    def __init__(self, command, **kwargs):
        self.command = command
        self.obj = None
        self.parent = None


class UsageError(Exception):
    pass


class BadParameter(UsageError):
    pass


class Abort(RuntimeError):
    pass
