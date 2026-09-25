# Minimal `importlib.machinery` Python facade for Grail.  Re-exports the few
# names callers actually reach for from the parent ``importlib`` package, which
# is itself a stub over Grail's Smalltalk loader.
#
# ModuleSpec is deliberately the SAME object the parent package exposes -- the
# one Smalltalk ModuleSpec class (src/smalltalk/Python/ModuleSpec.gs).  The
# parent's own comment already promises this: "``from importlib.machinery import
# ModuleSpec``, ``spec_from_file_location`` and ``mod.__spec__`` therefore all
# answer the same type."  Defining a second class here would break exactly the
# isinstance() that comment is about.

from . import ModuleSpec, _ModuleSpec, _Loader

# Grail loads .py source and nothing else: there are no .pyc files and no C
# extension modules, so these two lists are EMPTY rather than absent.  That is
# what lets pydoc's ``filename.endswith(tuple(BYTECODE_SUFFIXES))`` and its
# EXTENSION_SUFFIXES twin answer False and fall through to the source loader,
# instead of raising AttributeError -- the branches those guard reach
# SourcelessFileLoader and ExtensionFileLoader, which Grail has no use for and
# this module therefore does not pretend to provide.
SOURCE_SUFFIXES = ['.py']
BYTECODE_SUFFIXES = []
EXTENSION_SUFFIXES = []


def all_suffixes():
    """Every module suffix this implementation recognises."""
    return SOURCE_SUFFIXES + BYTECODE_SUFFIXES + EXTENSION_SUFFIXES


__all__ = ['ModuleSpec', 'SOURCE_SUFFIXES', 'BYTECODE_SUFFIXES',
           'EXTENSION_SUFFIXES', 'all_suffixes']
