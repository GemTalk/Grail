# GRAIL: `dis` exists so that importing it succeeds, and nothing more.
#
# Every function here raises.  That is the whole design, and it is not
# laziness: Grail compiles Python to Smalltalk METHODS and keeps no bytecode
# anywhere, so there is no instruction stream to disassemble.  A code object
# in Grail is metadata -- name, filename, line, argument counts -- which is
# also why builtins.exec() refuses one as its first argument.  Anything this
# module could return would be invented, and a plausible-looking fake
# instruction list is far worse than an error: a test comparing opnames would
# report a conformance result about a bytecode Grail does not have.
#
# The reason it exists at all is that a single unsatisfied `import dis` at
# module scope costs a WHOLE module's score.  test_positional_only_arg has 28
# tests and touches dis in exactly one of them (test_annotations, via
# dis.get_instructions); without this file that one import scored the module
# IMPORTERROR and measured none of the other 27.
#
# So: import works, use raises, and the one test that really needs a
# disassembler errors on its own rather than taking its module with it.
# Grow this file the day Grail grows something to disassemble.

__all__ = [
    "code_info",
    "dis",
    "disassemble",
    "distb",
    "disco",
    "findlinestarts",
    "findlabels",
    "get_instructions",
    "show_code",
    "stack_effect",
    "Bytecode",
    "Instruction",
]

_MSG = (
    "Grail compiles Python to Smalltalk methods and keeps no bytecode, so "
    "dis.%s() has nothing to disassemble"
)


def _unsupported(name):
    raise NotImplementedError(_MSG % name)


def code_info(x):
    _unsupported("code_info")


def dis(x=None, *, file=None, depth=None, show_caches=False, adaptive=False):
    _unsupported("dis")


def disassemble(co, lasti=-1, *, file=None, show_caches=False, adaptive=False):
    _unsupported("disassemble")


def distb(tb=None, *, file=None, show_caches=False, adaptive=False):
    _unsupported("distb")


def disco(co, lasti=-1, *, file=None, show_caches=False, adaptive=False):
    _unsupported("disco")


def findlinestarts(code):
    _unsupported("findlinestarts")


def findlabels(code):
    _unsupported("findlabels")


def get_instructions(x, *, first_line=None, show_caches=False, adaptive=False):
    _unsupported("get_instructions")


def show_code(co, *, file=None):
    _unsupported("show_code")


def stack_effect(opcode, oparg=None, *, jump=None):
    _unsupported("stack_effect")


class Instruction:
    """CPython's Instruction is a namedtuple of bytecode fields.  Present so
    ``dis.Instruction`` resolves for an isinstance check or an annotation;
    constructing one is refused, since there is no instruction to describe."""

    def __init__(self, *args, **kwargs):
        _unsupported("Instruction")


class Bytecode:
    """CPython's Bytecode wraps a code object as an iterable of Instruction.
    Same story as Instruction above."""

    def __init__(self, *args, **kwargs):
        _unsupported("Bytecode")
