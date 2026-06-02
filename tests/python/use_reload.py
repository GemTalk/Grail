# Fixture for ImportlibReloadTestCase — drives importlib.reload(module) from
# Python so the test exercises the real public API (not the Smalltalk loader
# directly).  The test writes/rewrites a probe module on disk between calls.


def reload_mod(mod):
    import importlib
    return importlib.reload(mod)


def get_VALUE(mod):
    return mod.VALUE


def call_greet(mod):
    return mod.greet()


def make_stat_reloader(path, name):
    from werkzeug._reloader import StatReloader
    return StatReloader([(path, name)])


def reloader_changed(reloader):
    return reloader.changed_modules()


def run_reloader_cycle_test(app_path, v2_path, name):
    """Drive werkzeug._reloader.run_with_reloader through two build cycles: the
    factory builds the app from `name`, and after cycle 1 we swap a v2 source
    into the watched file (via os.rename, since Grail has no open()) so the
    reloader detects the change, reloads, and rebuilds with the new code.
    Returns [[cycle, MARKER, bound], ...]."""
    import importlib
    import os
    from werkzeug._reloader import run_with_reloader

    captured = []

    def on_serving(server, cycle):
        mod = importlib.import_module(name)
        captured.append([cycle, mod.MARKER, server.server_port > 0])
        if cycle == 1:
            os.rename(v2_path, app_path)   # swap the v2 source into place

    run_with_reloader(name + ":create_app", [(app_path, name)],
                      port=0, max_cycles=2, on_serving=on_serving)
    return captured
