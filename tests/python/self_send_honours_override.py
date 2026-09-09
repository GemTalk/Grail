"""``self.m(...)'' inside a method must honour an override of ``m''.

Grail compiles a self-send to a plain Smalltalk send, which consults neither
the instance nor the class -- so monkey-patching a method had no effect on the
object's own internal calls, in ANY form: ``C.m = f'', ``patch.object(C, 'm')''
and ``c.m = f'' all changed what an outside caller got and nothing about what
``self.m()'' ran.  Grail was even inconsistent with itself: ``self.m(*args)''
compiles to a guarded attribute load and honoured all three.

The fix replaces the compiled method a self-send resolves to, at the moment
something is stored over its name, so unpatched code keeps the bare send.

The super()/unbound cases below are CONTROLS, and they are the reason the
dispatcher goes on the receiver's own class: ``super().m()'' deliberately
starts past that class and must keep reaching the parent's method.
"""

import unittest.mock as mock


class Base:
    def label(self):
        return 'Base'

    def greet(self, who):
        return 'Base greets ' + who


class Widget(Base):
    def label(self):
        return 'Widget'

    def describe(self):
        return self.label()

    def describe_starred(self):
        return self.label(*())

    def via_super(self):
        return super().label()

    # A default argument makes this compile as a varargs body, so the plain
    # positional ``self.greet('you')'' below is emitted as ``_greet:kw:'' --
    # the OTHER of the two selectors a def compiles to, and the one a
    # fixed-arity-only interception would miss.
    def greet(self, who, punct='!'):
        return 'Widget greets ' + who + punct

    def describe_greeting(self):
        return self.greet('you')

    # Plain positional defs, which compile to the FIXED-ARITY selectors ``scale:''
    # and ``add:_:'' -- the spelling a self-send uses whenever the callee has no
    # defaults.  Every check above happens to reach either a zero-argument
    # selector or the varargs one, so nothing here noticed when the selector
    # matcher rejected every keyword selector.
    def scale(self, k):
        return 'orig:' + str(k)

    def describe_scale(self):
        return self.scale(4)

    def add(self, x, y):
        return 'orig:' + str(x + y)

    def describe_add(self):
        return self.add(2, 3)

    # ``tag'' and ``_tag'' together: the varargs selector of ``tag'' is spelled
    # ``_tag:kw:'', so a first-keyword-only match reads it as belonging to the
    # def ``_tag''.  ``describe_tag'' calls with a keyword, which is exactly
    # the call shape that reaches that selector.
    def tag(self, kind='plain'):
        return 'tag:' + kind

    def _tag(self):
        return '_tag'

    def describe_tag(self):
        return self.tag(kind='x')


def a_class_assignment_reaches_the_self_send():
    class W(Widget):
        pass
    w = W()
    W.label = lambda self: 'patched'
    return w.describe() == 'patched'


def an_instance_assignment_reaches_the_self_send():
    class W(Widget):
        pass
    w = W()
    w.label = lambda: 'instance'
    return w.describe() == 'instance'


def an_unpatched_instance_is_unaffected_by_another_instances_patch():
    class W(Widget):
        pass
    patched, plain = W(), W()
    patched.label = lambda: 'instance'
    return patched.describe() == 'instance' and plain.describe() == 'Widget'


def the_starred_self_send_agrees_with_the_plain_one():
    class W(Widget):
        pass
    w = W()
    w.label = lambda: 'instance'
    return w.describe() == w.describe_starred() == 'instance'


def an_external_call_still_sees_the_override():
    class W(Widget):
        pass
    w = W()
    w.label = lambda: 'instance'
    return w.label() == 'instance'


def super_still_reaches_the_parent_past_an_instance_shadow():
    class W(Widget):
        pass
    w = W()
    w.label = lambda: 'instance'
    return w.via_super() == 'Base'


def an_unbound_parent_call_still_reaches_the_parent():
    class W(Widget):
        pass
    w = W()
    w.label = lambda: 'instance'
    return Base.label(w) == 'Base'


def a_defaulted_method_reached_by_the_varargs_selector_is_patchable():
    class W(Widget):
        pass
    w = W()
    w.greet = lambda who, punct='!': 'patched ' + who
    return w.describe_greeting() == 'patched you'


def a_defaulted_method_is_unaffected_when_nothing_is_patched():
    class W(Widget):
        pass
    return W().describe_greeting() == 'Widget greets you!'


def a_one_argument_fixed_arity_self_send_is_patchable():
    class W(Widget):
        pass
    w = W()
    w.scale = lambda k: 'patched:' + str(k)
    return w.describe_scale() == 'patched:4'


def a_two_argument_fixed_arity_self_send_is_patchable():
    class W(Widget):
        pass
    w = W()
    w.add = lambda x, y: 'patched:' + str(x + y)
    return w.describe_add() == 'patched:5'


def unpatched_fixed_arity_self_sends_are_unchanged():
    class W(Widget):
        pass
    w = W()
    return w.describe_scale() == 'orig:4' and w.describe_add() == 'orig:5'


def patching_an_underscore_name_leaves_the_plain_one_alone():
    class W(Widget):
        pass
    w = W()
    w._tag = lambda: '_patched'
    return w.describe_tag() == 'tag:x' and w._tag() == '_patched'


def patch_object_records_the_internal_call_exactly_once():
    class W(Widget):
        pass
    w = W()
    with mock.patch.object(w, 'label', wraps=w.label) as spy:
        got = w.describe()
    return spy.call_count == 1 and got == 'Widget'


def the_original_returns_when_the_patch_exits():
    class W(Widget):
        pass
    w = W()
    with mock.patch.object(w, 'label', wraps=w.label):
        pass
    return w.describe() == 'Widget'


CHECKS = [
    a_class_assignment_reaches_the_self_send,
    an_instance_assignment_reaches_the_self_send,
    an_unpatched_instance_is_unaffected_by_another_instances_patch,
    the_starred_self_send_agrees_with_the_plain_one,
    an_external_call_still_sees_the_override,
    super_still_reaches_the_parent_past_an_instance_shadow,
    an_unbound_parent_call_still_reaches_the_parent,
    a_defaulted_method_reached_by_the_varargs_selector_is_patchable,
    a_defaulted_method_is_unaffected_when_nothing_is_patched,
    a_one_argument_fixed_arity_self_send_is_patchable,
    a_two_argument_fixed_arity_self_send_is_patchable,
    unpatched_fixed_arity_self_sends_are_unchanged,
    patching_an_underscore_name_leaves_the_plain_one_alone,
    patch_object_records_the_internal_call_exactly_once,
    the_original_returns_when_the_patch_exits,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
