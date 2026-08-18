# Grail: only the pager half of CPython's _pyrepl package is ported.  pydoc
# imports get_pager / pipe_pager / plain_pager / tempfile_pager / tty_pager /
# plain from here -- they lived in pydoc.py itself until 3.13 moved them out,
# and pydoc still re-exports them under their old names (getpager, pipepager,
# ...), so they are public API reached through pydoc.
#
# The REPL proper (reader, console, simple_interact, ...) is not ported: it
# drives a terminal, which Grail has no equivalent of.
