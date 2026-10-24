Class {
	#name : 'UnittestTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
UnittestTestCase >> loadFixture: fixtureName [
	"Same caching pattern as FlaskScaffoldingTestCase >> loadFixture:."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods at: fullName asSymbol ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	(mods includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName

]

{ #category : 'Grail-Tests' }
UnittestTestCase >> testAddTypeEqualityFuncDispatchesOnTheExactType [

	"CPython's TestCase.addTypeEqualityFunc: assertEqual hands two operands of
	exactly the registered type to the registered function.  test_email's
	TestEmailBase registers a Message comparator in its __init__, and every
	test_email module stopped there with an AttributeError."

	self assert: (self eval: 'import unittest
calls = []
class Box:
    def __init__(self, v): self.v = v
class T(unittest.TestCase):
    def __init__(self, name):
        super().__init__(name)
        self.addTypeEqualityFunc(Box, self.compare_boxes)
    def compare_boxes(self, a, b, msg=None):
        calls.append((a.v, b.v))
        if a.v != b.v:
            self.fail("boxes differ")
    def runTest(self): pass
t = T("runTest")
t.assertEqual(Box(1), Box(1))
t.assertEqual(3, 3)
try:
    t.assertEqual(Box(1), Box(2))
    raised = False
except AssertionError:
    raised = True
calls == [(1, 1), (1, 2)] and raised')

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testAssertionMessages [
	"Individual assertions raise AssertionError; an assertRaises block
	that does NOT raise produces a 'not raised' failure."

	| mod out |
	mod := self loadFixture: 'unittest_fixture'.
	out := mod @env1:run_assertion_failures.
	self assert: (out @env1:__getitem__: 0) equals: 'assertTrue'.
	self assert: (out @env1:__getitem__: 1) equals: 'assertIn'.
	self assert: (out @env1:__getitem__: 2) equals: 'assertIsInstance'.
	self assert: (out @env1:__getitem__: 3) equals: 'assertGreater'.
	self assert: ((out @env1:__getitem__: 4) includesString: 'ValueError not raised')

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testFailureAndErrorMessages [
	"Failure carries the custom message; error carries the exception
	class name and text; the right tests are attributed.

	THE NAMES ARE FULLY QUALIFIED, because str(TestCase) is
	``%s (%s.%s)'' over unittest.case.strclass -- module, qualname, then the
	method again.  This test used to expect ``test_fails (SampleTests)'', which
	was the shim's own spelling from when it rendered a case with a bare
	``type(self).__name__''; CPython 3.14 running this very fixture answers
	``test_fails (pkg_scaffolding.unittest_fixture.SampleTests.test_fails)'',
	verified directly.  Dropping the module made a captured-locals traceback
	disagree with CPython on a ``self = <...>'' line, which is how it surfaced."

	| mod facts |
	mod := self loadFixture: 'unittest_fixture'.
	facts := mod @env1:run_sample.
	self assert: ((facts @env1:__getitem__: 'fail_msg') includesString: 'one is not two').
	self assert: ((facts @env1:__getitem__: 'error_msg') includesString: 'RuntimeError').
	self assert: ((facts @env1:__getitem__: 'error_msg') includesString: 'kaboom').
	self assert: (facts @env1:__getitem__: 'skip_msg') equals: 'not today'.
	self assert: ((facts @env1:__getitem__: 'fail_names') @env1:__getitem__: 0)
		equals: 'test_fails (pkg_scaffolding.unittest_fixture.SampleTests.test_fails)'.
	self assert: ((facts @env1:__getitem__: 'error_names') @env1:__getitem__: 0)
		equals: 'test_errors (pkg_scaffolding.unittest_fixture.SampleTests.test_errors)'

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testLoaderAndOutcomes [
	"TestLoader discovers the 6 test_ methods (not the helper); the run
	produces 1 failure + 1 error + 1 skip + 3 passes; setUp/tearDown
	run per test (skip via skipTest still runs tearDown)."

	| mod facts |
	mod := self loadFixture: 'unittest_fixture'.
	facts := mod @env1:run_sample.
	self assert: (facts @env1:__getitem__: 'count') equals: 6.
	self assert: (facts @env1:__getitem__: 'run') equals: 6.
	self assert: (facts @env1:__getitem__: 'failures') equals: 1.
	self assert: (facts @env1:__getitem__: 'errors') equals: 1.
	self assert: (facts @env1:__getitem__: 'skipped') equals: 1.
	self deny: (facts @env1:__getitem__: 'ok').
	self assert: (facts @env1:__getitem__: 'setups') equals: 6.
	self assert: (facts @env1:__getitem__: 'teardowns') equals: 6

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testModuleDiscovery [
	"loadTestsFromModule finds the TestCase subclass via dir+issubclass."

	| mod |
	mod := self loadFixture: 'unittest_fixture'.
	self assert: mod @env1:run_module_discovery equals: 6

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testResultClassesLookLikeCPythons [
	"TextTestRunner answers a TextTestResult whose repr names its CPython home
	-- ``<unittest.runner.TextTestResult run=2 errors=0 failures=0>'', which
	test_statistics' doctest shows -- and unittest.result / unittest.runner
	resolve to the same classes.  tests/python/unittest_result_repr.py holds
	the checks, each agreeing with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unittest_result_repr' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_result_repr.py')
		name: 'unittest_result_repr'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - unittest' }
UnittestTestCase >> testTextRunner [
	"TextTestRunner writes the summary to a supplied stream."

	| mod result |
	mod := self loadFixture: 'unittest_fixture'.
	result := mod @env1:run_text_runner.
	self assert: (result @env1:__getitem__: 0) equals: 6.
	self assert: (result @env1:__getitem__: 1).
	self assert: (result @env1:__getitem__: 2)

]
