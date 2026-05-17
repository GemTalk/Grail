# Fixture for ClassDecoratorTestCase.  Verifies that class
# decorators are applied at class-creation time and the decorator's
# return value rebinds the class name (Python semantics).
#
# Decorators here read class state and produce side effects via a
# module-level container.  Dynamic class-attribute writes from
# inside a decorator (``cls.X = ...``) aren't supported yet — that
# needs a DNU/__dict__ fallback on the class side; see TODO.md.

_log = []

def record_simple(cls):
    """Decorator that records the class's BASE attribute."""
    _log.append('simple-' + str(cls.BASE))
    return cls

def record_param(name):
    """Decorator factory — returns a decorator that records `name`."""
    def deco(cls):
        _log.append('param-' + name)
        return cls
    return deco

def replace_with_int(cls):
    """Decorator that returns a different object entirely."""
    return 42

@record_simple
class Simple:
    BASE = 7

@record_param('alpha')
class Param:
    pass

@record_simple
@record_param('chained')
class Stacked:
    BASE = 9

@replace_with_int
class Replaced:
    pass

log_simple_7 = 'simple-7' in _log
log_param_alpha = 'param-alpha' in _log
log_param_chained = 'param-chained' in _log
log_simple_9 = 'simple-9' in _log
replaced_value = Replaced
simple_base_still = Simple.BASE
