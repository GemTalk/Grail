# Grail flask.cli — hand-rolled minimal shim.
#
# Upstream flask/cli.py is ~1100 lines that build the ``flask''
# CLI entry-point (``flask run'', ``flask shell'', ``flask routes''
# etc.).  The full module-init runs:
#
#   - ``@click.command'' / ``@click.option'' decorator chains on
#     module-level defs (Grail's codegen doesn't apply the chain
#     at module scope, leaving the underlying function visible as
#     a BoundMethod with no ``.params'').
#   - ``run_command.params.insert(...)`` style mutations that
#     depend on the decorator chain above.
#
# The M7 demo path exercises Flask through ``app.test_client()'',
# not the CLI.  This shim re-exports the names ``flask/app.py'' /
# ``flask/__init__.py'' import from this module:
#
#   AppGroup, FlaskGroup       (used by Flask.__init__'s self.cli)
#   show_server_banner         (called from Flask.run)
#   load_dotenv                (called from Flask.run)
#   ScriptInfo                 (referenced for typing only)
#   NoAppException             (an Exception class)
#   with_appcontext            (no-op decorator)
#
# When the codegen gap closes, swap this for the upstream source
# (preserved at ``cli_upstream.py.bak'').

from __future__ import annotations

import click


class NoAppException(click.UsageError):
    """Raised when an app cannot be located, loaded, or instantiated."""


class ScriptInfo:
    """Stub — placeholder for ``flask.app.Flask.__init__''."""

    def __init__(self, app_import_path=None, create_app=None,
                 set_debug_flag=True):
        self.app_import_path = app_import_path
        self.create_app = create_app
        self.set_debug_flag = set_debug_flag
        self.data = {}
        self._loaded_app = None

    def load_app(self):
        if self._loaded_app is None and self.create_app is not None:
            self._loaded_app = self.create_app()
        return self._loaded_app


class AppGroup(click.Group):
    """Stub — Flask uses this for its CLI registration root.
    No-op for the test-client demo path."""

    def __init__(self, name=None, commands=None, **kwargs):
        super().__init__(name=name, commands=commands, **kwargs)


class FlaskGroup(AppGroup):
    """Stub — the actual ``flask`` CLI entry-point's root group.
    Not exercised by the test-client demo path."""

    def __init__(self, add_default_commands=True, create_app=None,
                 add_version_option=True, load_dotenv=True,
                 set_debug_flag=True, **extra):
        super().__init__(**extra)
        self.create_app = create_app
        self.load_dotenv = load_dotenv
        self.set_debug_flag = set_debug_flag


def with_appcontext(f):
    """``@with_appcontext'' decorator stub — no-op pass-through.
    Real implementation would wrap the callback to push an
    ``app_context()'' before invocation; in the test-client demo
    path the caller is responsible for pushing a context itself."""
    return f


def load_dotenv(path=None, load_defaults=True):
    """Stub — Grail has no ``.env'' loader.  Real implementation
    reads ``.env'' / ``.flaskenv'' into os.environ before the app
    boots.  Test-client path doesn't need it."""
    return False


def show_server_banner(debug, app_import_path):
    """Stub — banner printed when the dev server boots.  Grail
    doesn't ship the dev server, so the banner is silent."""
    return None


pass_script_info = lambda f: f


# Allow ``flask.cli.cli'' / ``flask.cli.run_command'' references
# from code that introspects the module surface.  Both are stubs
# that raise NotImplementedError if invoked.
cli = FlaskGroup(name='flask')


def run_command(*args, **kwargs):
    raise NotImplementedError(
        'flask.cli.run_command is not implemented in the Grail shim.  '
        'Use app.test_client() for in-process WSGI testing.'
    )


def shell_command(*args, **kwargs):
    raise NotImplementedError('flask.cli.shell_command (stub)')


def routes_command(*args, **kwargs):
    raise NotImplementedError('flask.cli.routes_command (stub)')


def main(as_module=False):
    raise NotImplementedError('flask.cli.main (stub)')
