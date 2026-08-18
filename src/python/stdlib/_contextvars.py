"""GRAIL: the C accelerator module ``_contextvars``, backed by pure Python.

In CPython the direction runs the other way: ``_contextvars`` is a C extension
and ``contextvars.py`` is a thin re-export of it.  Grail has no C extension, so
``contextvars`` holds the implementation and this module re-exports THAT --
which keeps both spellings working and, more importantly, keeps them the same
objects, so ``isinstance(v, _contextvars.ContextVar)`` holds for a var made
through either name.

Modules that reach for the underscore spelling are asking for the accelerator
specifically; _py_warnings does, for its context-local filter stack.

Note that ``_thread`` needs no such file: Grail already implements it natively
in Smalltalk (thread_module.gs), and a native module beats a .py of the same
name in the resolver -- so a re-export here would be dead code shadowing a real
implementation.
"""

from contextvars import Context, ContextVar, Token, copy_context

__all__ = ['Context', 'ContextVar', 'Token', 'copy_context']
