"""Every generated method carries a PYTHON POSITION MAP, and it resolves an ip
to the PEP 657 span CPython blames.

Grail compiles Python to Smalltalk and then has to answer, for a raise, "which
Python expression was that?".  Until now it answered by TEXT-SCANNING the
``___curPos___'' store the codegen emits once per statement, so the span was
the whole statement -- ``1 / 0 + 5'' underlined the addition, not the division.

GemStone already knows the other half of the journey: for any ip,
``_previousStepPointForIp:'' then ``_sourceOffsetsAt:'' give the SMALLTALK
source offset of the send in flight, and it lands on the SELECTOR of the send
that raised.  What was missing is Smalltalk offset -> Python node, and only the
emitter knows that.  So while it emits, it records each node's Smalltalk extent
against its Python position, and appends the table to the method source as a
trailing comment.  A reader takes the SMALLEST recorded range containing the
step point: the innermost Python node the send belongs to.

THE NUMBERS BELOW ARE CPYTHON'S, asserted here so they cannot drift.  The
Smalltalk side (PythonOffsetMapTestCase) asserts that Grail's map answers the
same four numbers for the same raise, one shape per compile path -- a module
function, an instance method, a @classmethod, a @staticmethod, a property
getter, a property deleter, and the module body itself, which are seven
different routes from Python source to a compiled Smalltalk method.

``in_an_f_string'' is the one documented divergence, and it is here to keep the
guard honest rather than to claim a win: an f-string replacement field is
parsed by a CHILD parser over ``(expr)'' alone, so every node inside it says
line 1, column 1.  Those positions are marked at parse time and kept out of the
map -- without that a line-1 span nests inside the true one and WINS the
innermost-node contest, and the traceback blames line 1 of the file.  Grail
therefore reports the whole f-string: the right line, a wider caret.
"""

import traceback


def span_of(fn):
    """(lineno, colno, end_lineno, end_colno) of the frame that raised."""
    try:
        fn()
    except (ZeroDivisionError, NameError) as exc:
        fs = traceback.TracebackException.from_exception(exc).stack[-1]
        return (fs.lineno, fs.colno, fs.end_lineno, fs.end_colno)
    return None


def span_of_exception(exc):
    fs = traceback.TracebackException.from_exception(exc).stack[-1]
    return (fs.lineno, fs.colno, fs.end_lineno, fs.end_colno)


class Shapes:
    def instance_method(self):
        return 1 / 0 + 5

    @classmethod
    def class_method(cls):
        return [1, 2][1 / 0]

    @staticmethod
    def static_method():
        return 1 / 0 or 2.0

    @property
    def getter(self):
        return 1 / 0

    @getter.deleter
    def getter(self):
        return 2.0 and 1 / 0


def module_function():
    return len("ab") + 1 / 0


def undefined_global():
    return missing_name_xyz + 1


def in_an_f_string():
    return f"a{1 / 0}b"


def call_getter():
    return Shapes().getter


def call_deleter():
    del Shapes().getter


MODULE_BODY_EXC = None
try:
    _UNUSED = [7, 8, 9][0] + 1 / 0
except ZeroDivisionError as _exc:
    MODULE_BODY_EXC = _exc


def an_instance_method_blames_the_division():
    return span_of(Shapes().instance_method) == (54, 15, 54, 20)


def a_classmethod_blames_the_subscript_operand():
    return span_of(Shapes.class_method) == (58, 22, 58, 27)


def a_staticmethod_blames_the_first_operand():
    return span_of(Shapes.static_method) == (62, 15, 62, 20)


def a_property_getter_blames_the_division():
    return span_of(call_getter) == (66, 15, 66, 20)


def a_property_deleter_blames_the_second_operand():
    return span_of(call_deleter) == (70, 23, 70, 28)


def a_module_function_blames_the_division():
    return span_of(module_function) == (74, 23, 74, 28)


def an_undefined_global_blames_the_name():
    return span_of(undefined_global) == (78, 11, 78, 27)


def the_module_body_blames_the_division():
    return span_of_exception(MODULE_BODY_EXC) == (95, 29, 95, 34)


def an_f_string_field_blames_the_division():
    """CPython 3.12+ gives the field's own span; Grail gives the whole
    f-string (see the module docstring).  The Smalltalk side asserts Grail's
    coarser answer, and that it is on the RIGHT LINE."""
    return span_of(in_an_f_string) == (82, 15, 82, 20)


CHECKS = [
    an_instance_method_blames_the_division,
    a_classmethod_blames_the_subscript_operand,
    a_staticmethod_blames_the_first_operand,
    a_property_getter_blames_the_division,
    a_property_deleter_blames_the_second_operand,
    a_module_function_blames_the_division,
    an_undefined_global_blames_the_name,
    the_module_body_blames_the_division,
    an_f_string_field_blames_the_division,
]


# Module-level entry points for the Smalltalk side, which drives the raises
# through ``perform:'' on the module and so needs a plain function per shape.
def call_instance_method():
    return Shapes().instance_method()


def call_class_method():
    return Shapes.class_method()


def call_static_method():
    return Shapes.static_method()


# Grail-internal: a body whose only expression is a bare parameter read emits
# no send at all, so its map must come out EMPTY and the method must carry no
# marker.  Not checked under CPython -- there is nothing here CPython does.
def only_a_local(a):
    return a



if __name__ == '__main__':
    for _fn in CHECKS:
        print('%-4s %s' % ('OK' if _fn() is True else 'FAIL', _fn.__name__))
