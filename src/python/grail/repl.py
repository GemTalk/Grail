"""REPL-level execution helpers.

`eval_source` and `run_file` are coroutines handed to
`_GemStoneModule._start`, which wraps them into a task and pumps the
asyncio loop. Both swallow `SystemExit` as the sentinel string
`"__grail_exit__"` and surface Python exceptions as
`f"{type.__name__}: {message}"` — the REPL side prints these verbatim.
"""

import asyncio as _asyncio
import code as _code
import sys as _sys
import traceback as _traceback
from ast import PyCF_ALLOW_TOP_LEVEL_AWAIT as _TLA


def _format_exc(e):
    return type(e).__name__ + ": " + str(e)


async def _run_catching(coro):
    try:
        return await coro
    except SystemExit:
        return "__grail_exit__"
    except Exception as e:
        return _format_exc(e)


async def _eval_inner(source, repl_globals):
    try:
        code = compile(source, "<repl>", "eval", flags=_TLA)
    except SyntaxError:
        code = compile(source, "<repl>", "exec", flags=_TLA)
        result = eval(code, repl_globals)
        if _asyncio.iscoroutine(result):
            await result
        return ""
    result = eval(code, repl_globals)
    if _asyncio.iscoroutine(result):
        result = await result
    return "" if result is None else repr(result)


async def eval_source(source, repl_globals):
    return await _run_catching(_eval_inner(source, repl_globals))


class _AsyncConsole(_code.InteractiveConsole):
    """InteractiveConsole adapted for our async I/O.

    `write` buffers error output (syntax errors, tracebacks) for async flush via the gemstone bridge.
    Expression values reach `out_buffer` via sys.displayhook.
    """

    def __init__(self, locals):
        super().__init__(locals=locals, filename="<repl>")
        self.compile.compiler.flags |= _TLA
        self.pending = None
        self.out_buffer = []
        self.err_buffer = []

    def runcode(self, code_obj):
        "Stashes the compiled code object so the outer loop can execute it"
        self.pending = code_obj

    def write(self, data):
        self.err_buffer.append(data)

    def _excepthook(self, typ, value, tb):
        "Mirrors _pyrepl.console.InteractiveColoredConsole to force ANSI colorization; _showtraceback dispatches here for both tracebacks and syntax errors."
        lines = _traceback.format_exception(
            typ, value, tb,
            colorize=True,
            limit=_traceback.BUILTIN_EXCEPTION_LIMIT,
        )
        self.write("".join(lines))


async def run():
    """Interactive REPL loop. I/O is routed through the gemstone bridge
    so GemStone owns stdin/stdout/stderr. Buffer management, syntax
    errors, and traceback formatting are delegated to InteractiveConsole."""

    import builtins
    import gemstone

    console = _AsyncConsole(locals={
        "__builtins__": __builtins__,
        "__name__": "__repl__",
        "gemstone": gemstone,
    })

    def _displayhook(value):
        if value is None:
            return

        builtins._ = value
        console.out_buffer.append(repr(value) + "\n")

    async def flush():
        if console.out_buffer:
            await gemstone.write("".join(console.out_buffer))
            console.out_buffer.clear()

        if console.err_buffer:
            await gemstone.write_err("".join(console.err_buffer))
            console.err_buffer.clear()

    saved_displayhook = _sys.displayhook
    _sys.displayhook = _displayhook
    try:
        version = _sys.version.split()[0]
        await gemstone.write("Grail Python REPL: Python " + version + "\n")
        await gemstone.write("Type 'exit()' or 'quit()' to quit.\n")

        while True:
            prompt = "... " if console.buffer else ">>> "
            line = await gemstone.read_line(prompt)
            if line is None:
                await gemstone.write("Bye.\n")
                return

            console.push(line.rstrip("\n"))
            await flush()

            if console.pending is not None:
                code_obj, console.pending = console.pending, None
                try:
                    result = eval(code_obj, console.locals)
                    if _asyncio.iscoroutine(result):
                        await result
                except SystemExit:
                    await gemstone.write("Bye.\n")
                    return
                except BaseException:
                    console.showtraceback()
                await flush()
    finally:
        _sys.displayhook = saved_displayhook


async def run_file(path, extra_path=None):
    import os as _os
    file_dir = _os.path.dirname(_os.path.abspath(path))
    for p in ([extra_path, file_dir] if extra_path else [file_dir]):
        if p and p not in _sys.path:
            _sys.path.insert(0, p)

    with open(path, encoding="utf-8") as f:
        source = f.read()

    script_globals = {
        "__name__": "__main__",
        "__file__": path,
        "__builtins__": __builtins__,
    }

    async def _body():
        code = compile(source, path, "exec", flags=_TLA)
        result = eval(code, script_globals)
        if _asyncio.iscoroutine(result):
            await result
        return ""

    return await _run_catching(_body())
