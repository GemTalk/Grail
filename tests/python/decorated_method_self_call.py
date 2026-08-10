# Regression fixture: `self.m()` must see a decorated method's WRAPPER.
#
# A decorated def has two distinct entities: the compiled Smalltalk method
# (the RAW, undecorated function) and the class-dict entry (the decorator's
# RESULT).  CallAst's self-send fast path emitted a direct selector send,
# which reached the RAW function -- so `self.m()` silently bypassed the
# decorator while EVERY other call shape honoured it:
#
#     self.cm()              -> PythonGenerator      (wrong)
#     f = self.cm; f()       -> _GeneratorCM         (right)
#     getattr(self,'cm')()   -> _GeneratorCM         (right)
#     other.cm()             -> _GeneratorCM         (right)
#
# The visible symptom was `with self.cm() as v:` raising
# "'PythonGenerator' object does not support the context manager protocol".

import contextlib

RESULTS = {}


class A:
    @contextlib.contextmanager
    def cm(self):
        yield 'inside'

    # Every shape below must produce the DECORATED object.
    def via_self_call(self):
        return type(self.cm()).__name__

    def via_local_then_call(self):
        f = self.cm
        return type(f()).__name__

    def via_getattr(self):
        return type(getattr(self, 'cm')()).__name__

    def via_other_receiver(self):
        return type(A().cm()).__name__

    # The shape that actually failed in datetimetester.
    def via_with(self):
        with self.cm() as v:
            return v


_a = A()
_shapes = type(_a.via_self_call()).__name__ if False else None
_names = {
    'self_call': _a.via_self_call(),
    'local_then_call': _a.via_local_then_call(),
    'getattr': _a.via_getattr(),
    'other_receiver': _a.via_other_receiver(),
    'outside': type(_a.cm()).__name__,
}
# All five must name the SAME wrapper type, whatever contextlib calls it.
_wrapper = _names['outside']
for _k, _v in _names.items():
    RESULTS['wrapper_via_' + _k] = (_v == _wrapper)
RESULTS['wrapper_is_not_raw_generator'] = ('Generator' not in _wrapper
                                           or 'CM' in _wrapper
                                           or 'ContextManager' in _wrapper)

# The with-statement through self must actually enter the block.
RESULTS['with_through_self'] = (_a.via_with() == 'inside')


# A plain (undecorated) method must keep working through the fast path.
class B:
    def plain(self, x):
        return x * 2

    def zero(self):
        return 'z'

    def use(self):
        return (self.plain(3), self.zero())


RESULTS['undecorated_fast_path'] = (B().use() == (6, 'z'))


# A user-defined decorator, not just contextlib.
def _tag(fn):
    def wrapper(self, *a, **k):
        return 'tagged:' + str(fn(self, *a, **k))
    return wrapper


class C:
    @_tag
    def val(self):
        return 7

    def use(self):
        return self.val()


RESULTS['user_decorator_through_self'] = (C().use() == 'tagged:7')
