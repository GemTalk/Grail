! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CopyregTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CopyregTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CopyregTestCase category: 'SUnit'
%

! ===============================================================================
! CopyregTestCase - Tests for Python copyreg module
! ===============================================================================
!
! Phase 4d added these tests as part of the copyreg conversion. Before Phase 4d
! the copyreg module had ZERO test coverage. The legacy block-form `pickle`
! implementation was effectively untested except indirectly via the `re`
! module's `copyreg.pickle(Pattern, _pickle, _compile)` call site.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CopyregTestCase removeAllMethods.
CopyregTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Module Registration'
method: CopyregTestCase
testCopyregModuleIsAvailable
	"Test that copyreg module is registered and importable."

	| modules |
	modules := importlib @env1:modules.
	self assert: (modules includesKey: #copyreg)
%

category: 'Tests - dispatch_table'
method: CopyregTestCase
testDispatchTableExists
	"After initialize, dispatch_table is a non-nil dictionary."

	| reg dt |
	reg := copyreg @env1:instance.
	dt := reg @env1:dispatch_table.
	self assert: dt notNil.
	self assert: (dt isKindOf: KeyValueDictionary)
%

category: 'Tests - pickle: 2-arg'
method: CopyregTestCase
testPickleTwoArgRegisters
	"copyreg.pickle(ob_type, pickle_function) records the mapping in
	dispatch_table. Uses the new fixed-arity 2-arg fast path
	(`pickle:_:`)."

	| reg dt key fn |
	reg := copyreg @env1:instance.
	dt := reg @env1:dispatch_table.
	key := #'_grail_p4d_copyreg_test_2arg'.
	fn := [:obj | 'pickled_2arg'].
	"Pre-clean any prior leftover."
	dt @env0:removeKey: key ifAbsent: [].
	reg @env1:pickle: key _: fn.
	self assert: (dt @env0:at: key) identical: fn.
	"Clean up."
	dt @env0:removeKey: key ifAbsent: []
%

category: 'Tests - pickle: 3-arg'
method: CopyregTestCase
testPickleThreeArgRegisters
	"copyreg.pickle(ob_type, pickle_function, constructor) records the
	(ob_type → pickle_function) mapping in dispatch_table, ignoring
	the constructor argument. Uses the new fixed-arity 3-arg fast
	path (`pickle:_:_:`).

	This is the call shape used by the `re` module:
	`copyreg.pickle(Pattern, _pickle, _compile)`."

	| reg dt key fn ctor |
	reg := copyreg @env1:instance.
	dt := reg @env1:dispatch_table.
	key := #'_grail_p4d_copyreg_test_3arg'.
	fn := [:obj | 'pickled_3arg'].
	ctor := [:state | #constructed].
	dt @env0:removeKey: key ifAbsent: [].
	reg @env1:pickle: key _: fn _: ctor.
	"Constructor is currently ignored; only the pickle_function is recorded."
	self assert: (dt @env0:at: key) identical: fn.
	"Clean up."
	dt @env0:removeKey: key ifAbsent: []
%

category: 'Tests - Phase 4d Attribute Calls'
method: CopyregTestCase
testEvalCopyregPickleTwoArg
	"Phase 4d: `copyreg.pickle(t, fn)` from Python source. Exercises
	the attribute-call fast path on the converted copyreg module."

	| reg dt key |
	"Use eval to drive the call through the codegen path. We use
	`int` and `str` (Python type names) as the arguments — `int` is
	exposed as a global, and `str` is a builtin function name that
	resolves to a BoundMethod via Phase-4 first-class function reads.
	The actual values don''t matter for this test; we just need to
	verify that the call records *something* in dispatch_table."
	self eval: '
import copyreg
copyreg.pickle(int, str)
'.
	"Verify the registration landed in dispatch_table under int."
	reg := copyreg @env1:instance.
	dt := reg @env1:dispatch_table.
	key := Integer.
	self assert: (dt @env0:includesKey: key).
	"Clean up — the test side-effects on the global dispatch_table."
	dt @env0:removeKey: key ifAbsent: []
%

category: 'Tests - Phase 4d Attribute Calls'
method: CopyregTestCase
testEvalCopyregDispatchTableAccess
	"Phase 4d: `copyreg.dispatch_table` attribute read from Python
	source returns the same dictionary as the Smalltalk-side
	`@env1:dispatch_table`."

	| result reg |
	result := self eval: '
import copyreg
copyreg.dispatch_table
'.
	reg := copyreg @env1:instance.
	self assert: result identical: (reg @env1:dispatch_table)
%
