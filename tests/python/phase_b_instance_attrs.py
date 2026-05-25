# Phase B fixture: instance attributes via dynamicInstVarAt: storage.
#
# Same shape as the Phase A `dynamic_globals.py` red light, applied
# to PythonInstance attributes instead of module globals.  Today,
# `del obj.x` is unsupported (AttributeAst del raises an error) or
# nils the static instVar slot; either way the binding persists and
# hasattr(obj, 'x') still reports True.  After Phase B, `del obj.x`
# truly removes the binding from the instance's dynamic-instVar
# storage and hasattr correctly reports False.


class Container:
    def __init__(self, x):
        self.x = x


_obj = Container(42)

# Sanity: the attribute is set at construction time and reads back.
initial_value = _obj.x
present_before_del = hasattr(_obj, 'x')

# Phase B red light: del must truly unbind.
del _obj.x
present_after_del = hasattr(_obj, 'x')

# After del, setattr from outside should re-bind cleanly.
_obj.x = 100
present_after_rebind = hasattr(_obj, 'x')
rebound_value = _obj.x
