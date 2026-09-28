! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MockTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MockTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MockTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
MockTestCase removeAllMethods: 0.
MockTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - mock'
method: MockTestCase
testCallRecording
	| result |
	result := self eval: 'import mock
m = mock.Mock()
m(1, x=2)
m("again")
(m.called and m.call_count == 2
 and m.call_args == mock.call("again")
 and m.call_args_list[0] == mock.call(1, x=2))'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testReturnValue
	"Explicit constructor value, assigned value, and the implicit
	child-Mock default (stable identity across calls)."

	| result |
	result := self eval: 'import mock
a = mock.Mock(return_value=42)
b = mock.Mock()
b.return_value = "set"
c = mock.Mock()
first = c()
second = c()
a() == 42 and b() == "set" and first is second'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testSideEffect
	"Callable side effect supplies results; an exception class raises."

	| result |
	result := self eval: 'import mock
def doubler(x):
    return x * 2
m = mock.Mock(side_effect=doubler)
n = mock.Mock(side_effect=ValueError("boom"))
try:
    n()
    raised = False
except ValueError:
    raised = True
m(21) == 42 and raised'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testChildAttributesAutoCreate
	"Attribute access creates stable child Mocks; calls on children
	record like any Mock."

	| result |
	result := self eval: 'import mock
m = mock.Mock()
m.db.connect("host")
(m.db is m.db
 and m.db.connect.called
 and m.db.connect.call_args == mock.call("host"))'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testAssertHelpers
	| result |
	result := self eval: 'import mock
m = mock.Mock()
m(5, mode="x")
m.assert_called()
m.assert_called_once()
m.assert_called_once_with(5, mode="x")
m.assert_any_call(5, mode="x")
try:
    m.assert_called_with("wrong")
    bad = False
except AssertionError:
    bad = True
n = mock.Mock()
n.assert_not_called()
try:
    n.assert_called()
    missing = False
except AssertionError:
    missing = True
bad and missing'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testResetMock
	| result |
	result := self eval: 'import mock
m = mock.Mock()
m(1)
m.child(2)
m.reset_mock()
(not m.called and m.call_count == 0 and m.call_args is None
 and not m.child.called)'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testPatchModuleAttribute
	"patch() swaps a module attribute for the with-block and restores."

	| result |
	result := self eval: 'import mock
import json
with mock.patch("json.dumps") as fake:
    fn = getattr(json, "dumps")
    fn({"a": 1})
    was_mock = fn is fake
    fake.assert_called_once_with({"a": 1})
restored = json.dumps({"a": 1}) == ''{"a": 1}''
was_mock and restored'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testPatchObjectAndStartStop
	| result |
	result := self eval: 'import mock
box = mock.Mock()
box.value = "orig"
with mock.patch_object(box, "value", "patched"):
    inside = box.value
after = box.value
p = mock.patch_object(box, "value", "again")
p.start()
started = box.value
p.stop()
stopped = box.value
(inside == "patched" and after == "orig"
 and started == "again" and stopped == "orig")'.
	self assert: result
%

category: 'Grail-Tests - mock'
method: MockTestCase
testSentinelAndUnittestMockAlias
	| result |
	result := self eval: 'import mock
import sys
a = mock.sentinel.MISSING
b = mock.sentinel.MISSING
c = mock.sentinel.OTHER
alias = sys.modules["unittest.mock"] is sys.modules["mock"]
a is b and a is not c and repr(a) == "sentinel.MISSING" and alias'.
	self assert: result
%

category: 'Grail-Tests - MagicMock'
method: MockTestCase
testMagicMockDefaults
	"MagicMock answers CPython's defaults for magic methods nobody configured
	-- it used to be an alias of Mock, so ``for x in patched_fn()'' raised
	``'Mock' object is not iterable'' (test_gettext's FindTestCase).  The
	expected string is CPython 3.14's output for the same snippet."

	| result |
	result := self eval: 'from unittest import mock
m = mock.MagicMock()
repr((list(m), len(m), bool(m), 3 in m, int(m), float(m),
      type(m[0]).__name__, type(m + 1).__name__, type(-m).__name__,
      m.__exit__(None, None, None), type(m.child).__name__, type(m()).__name__))'.
	self assert: result asString
		equals: '([], 0, True, False, 1, 1.0, ''MagicMock'', ''MagicMock'', ''MagicMock'', False, ''MagicMock'', ''MagicMock'')'
%

category: 'Grail-Tests - MagicMock'
method: MockTestCase
testMagicMockConfiguredMagicWins
	"An ASSIGNED magic outranks the default, for that mock only; the
	comparisons stay unsupported, as CPython's NotImplemented makes them."

	| result |
	result := self eval: 'from unittest import mock
m = mock.MagicMock()
m.__iter__ = mock.Mock(return_value=iter([1, 2]))
m.__len__ = mock.Mock(return_value=5)
fresh = mock.MagicMock()
try:
    fresh < 1
    cmp = "no error"
except TypeError:
    cmp = "TypeError"
repr((list(m), len(m), len(fresh), cmp))'.
	self assert: result asString equals: '([1, 2], 5, 0, ''TypeError'')'
%

category: 'Grail-Tests - MagicMock'
method: MockTestCase
testPatchSubstitutesAMagicMock
	| result |
	result := self eval: 'from unittest import mock
class Box:
    def lookup(self):
        return ["real"]
b = Box()
with mock.patch.object(b, "lookup") as p:
    got = b.lookup()
    kinds = (type(p).__name__, list(got), len(got))
repr(kinds + (p.call_count, b.lookup()))'.
	self assert: result asString equals: '(''MagicMock'', [], 0, 1, [''real''])'
%
