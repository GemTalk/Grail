# Consumer module: a class whose method reads module-level globals
# that were injected at runtime (DYN_OP_A, DYN_OP_B) plus one
# statically-declared one (STATIC_OP).  Before the fix this would
# CompileError on the dynamic names because NameAst's class-method
# free-variable path emits a bare identifier when the name isn't a
# declared module instVar — and the Smalltalk compiler rejects
# bare uppercase identifiers that don't resolve through the symbol
# list.

from ._source import *


class Classifier:
    def is_static(self, op):
        return op == STATIC_OP

    def is_dyn_a(self, op):
        return op == DYN_OP_A

    def is_dyn_b(self, op):
        return op == DYN_OP_B

    def kind(self, op):
        if op is DYN_OP_A:
            return 'a'
        if op is DYN_OP_B:
            return 'b'
        if op is STATIC_OP:
            return 'static'
        return 'unknown'
