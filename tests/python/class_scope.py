# Fixture for ClassScopeTestCase — exercises class-method free-variable
# resolution against module globals (LEGB skipping the class scope) and
# @property dispatch through AttributeAst's class-function fast path.

# --- Module-level constants the class methods will reference ---
MULTIPLIER = 10
THRESHOLD = 100

def shared_helper(x):
    """A module-level free name a class method should resolve."""
    return x * 2

# --- A class whose methods read module-level names as bare references.
# CPython's LEGB resolution skips the class scope for bare names, so
# `MULTIPLIER` and `shared_helper` inside Foo's methods resolve to the
# module globals.  Grail's NameAst codegen emits a runtime fetch off the
# enclosing module's singleton (see commit d46965e). ---
class Foo:
    def __init__(self, base):
        self.base = base

    def amplify(self):
        return self.base * MULTIPLIER

    def helped(self):
        return shared_helper(self.base)

    def gated(self):
        if self.base > THRESHOLD:
            return 'big'
        return 'small'

# --- Class method whose NAME shadows a module-level NAME.  Python's
# bare-name lookup still resolves to the module global; the class
# method is only reachable via `self.error` syntax. ---
def error(msg):
    return 'module error: ' + msg

class CsToken:
    def __init__(self, value):
        self.value = value

    def error(self, msg):
        # Bare `error` here should resolve to the *module-level* function,
        # not to this class method.  Returning their concatenation lets
        # the test distinguish.
        outer = error(msg)
        return 'tokenizer wrapping: ' + outer

# --- @property dispatch: `self.size` inside another method should call
# the property method, not read an inst var (there is no `size` inst var). ---
class Box:
    def __init__(self, items):
        self._items = items

    @property
    def size(self):
        return len(self._items)

    def describe(self):
        # `self.size` is a method call (property getter).  Without the
        # AttributeAst class-function fallback in commit d46965e, this
        # would try to read a non-existent `size` inst var.
        if self.size > 0:
            return 'has ' + str(self.size)
        return 'empty'

# --- Module-level results ---
foo_amplify_result = Foo(5).amplify()
foo_helped_result  = Foo(7).helped()
foo_gated_big      = Foo(200).gated()
foo_gated_small    = Foo(5).gated()
cstok_error_result   = CsToken('t').error('oops')
box_describe_full  = Box([1, 2, 3]).describe()
box_describe_empty = Box([]).describe()
box_size_full      = Box([1, 2, 3]).size
