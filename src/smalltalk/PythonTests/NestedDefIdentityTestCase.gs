! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedDefIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedDefIdentityTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedDefIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedDefIdentityTestCase
!
! Every execution of a ``def'' must produce a DISTINCT function object.  CPython
! does, and Python code depends on it.
!
! GemStone reuses a CLEAN block -- one referencing no self, instance variable,
! enclosing temp or thisContext -- as a compile-time literal, so a nested def
! whose body captures nothing answered the SAME ExecBlock on every execution.
! Everything keyed on that object was therefore shared across invocations: user
! attributes, a __name__ / __doc__ written by functools.update_wrapper, and the
! memoized __annotations__ dict.  A def that DOES capture was always correct,
! which is what made this so easy to miss -- and why the tests below run their
! inner def TWICE.  On a first execution the bug is invisible.
!
! FunctionDefAst fixes it by sending ``shallowCopy'' as the last cascade message
! at the def site, so the copy is the value of the whole def expression and the
! assignment / decorator pipeline binds a fresh object.  Two properties of that
! copy are load-bearing and each has a test here:
!
!   * ``method'' is preserved, so the def-time stamps -- which write the
!     DEF-SITE slot table keyed by ``method'' -- are still found through the
!     copy (testDefSiteMetadataSurvivesTheCopy).
!   * the captured home context is preserved rather than snapshotted, so
!     closures and two nested defs sharing one enclosing binding still see each
!     other's writes (testSharedEnclosingCellStaysShared).
!
! The alternative -- forcing the block to be non-clean with a marker -- was
! rejected on measurement: the marker has to be a USED reference (the compiler
! eliminates a discarded one) and so runs on every invocation, +2ns per CALL,
! and it made every def evaluation write a per-OBJECT side-table entry, which
! exhausted temporary object memory at ~100k evaluations.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedDefIdentityTestCase removeAllMethods.
NestedDefIdentityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NestedDefIdentityTestCase
setUp
	"Reload tests/python/nested_def_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_def_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/nested_def_identity.py')
		name: 'nested_def_identity'.
%

! --- the bug itself ---

category: 'Grail-Tests - identity'
method: NestedDefIdentityTestCase
testAttributesAreNotSharedAcrossExecutions
	"The original report.  ``inner.stamp = tag'' on one execution must not be
	visible to the next, so both executions see 'ABSENT'.  With the block
	shared, the second saw 'first'."

	self assert: testModule @env1:attrs_not_shared asArray
		equals: #( 'ABSENT' 'ABSENT' ).
%

category: 'Grail-Tests - identity'
method: NestedDefIdentityTestCase
testEachExecutionYieldsADistinctObject
	"``a is not b'' for two executions, and ``a is a'' still holds within one --
	the copy is taken once per def execution, not once per reference."

	self assert: testModule @env1:distinct_objects asArray
		equals: #( true true ).
%

category: 'Grail-Tests - identity'
method: NestedDefIdentityTestCase
testDocOverrideDoesNotLeak
	"__doc__ is stamped at the def SITE, and a runtime write lands in the
	per-object table which shadows it.  With one shared object that write was
	permanent, so the second execution read 'changed' as its docstring."

	self assert: testModule @env1:doc_override_does_not_leak asArray
		equals: #( 'original' 'original' ).
%

category: 'Grail-Tests - identity'
method: NestedDefIdentityTestCase
testAnnotationsMemoDoesNotLeak
	"PEP 649 computes __annotations__ on read and memoizes the dict PER
	OBJECT.  Mutating one execution's dict must not contaminate the next --
	this is the shape test_functools TestWraps.test_update_wrapper_annotations
	trips on, where the same method body runs twice in one process because
	TestWraps subclasses TestUpdateWrapper."

	| both |
	both := testModule @env1:annotations_memo_does_not_leak asArray.
	self assert: both size equals: 2.
	self assert: (both at: 1) @env1:keys asArray asSortedCollection asArray
		equals: #( 'a' ).
	self assert: (both at: 2) @env1:keys asArray asSortedCollection asArray
		equals: #( 'a' ).
%

! --- what the fix must not break ---

category: 'Grail-Tests - closures'
method: NestedDefIdentityTestCase
testClosuresStillCapture
	"A capturing def was already correct (distinct objects, working closure).
	shallowCopy preserves the captured home context, so counter(10) and
	counter(100) keep their own ``start''."

	self assert: testModule @env1:closures_still_capture asArray
		equals: #( 11 101 true ).
%

category: 'Grail-Tests - closures'
method: NestedDefIdentityTestCase
testSharedEnclosingCellStaysShared
	"Two nested defs over one enclosing binding must see each other's writes.
	A copy that SNAPSHOTTED the home context instead of sharing it would
	answer 0 here."

	self assert: testModule @env1:shared_enclosing_cell_stays_shared
		equals: 12.
%

category: 'Grail-Tests - closures'
method: NestedDefIdentityTestCase
testDefaultCaptureStillPerExecution
	"A def with defaults compiles to an outer block run immediately (so
	def-time defaults resolve in the enclosing scope); the cascade -- and so
	the copy -- applies to the INNER block it returns."

	self assert: testModule @env1:default_capture_still_per_execution asArray
		equals: #( 1 2 true ).
%

category: 'Grail-Tests - metadata'
method: NestedDefIdentityTestCase
testDefSiteMetadataSurvivesTheCopy
	"All five def-time stamps resolve through the copy, because they are keyed
	by ``method'' and shallowCopy preserves it.  If the copy had a fresh
	identity the stamps could not reach, __name__ would answer the
	``<closure>'' placeholder and signature() would answer ``()''."

	| r |
	r := testModule @env1:def_site_metadata_survives asArray.
	self assert: (r at: 1) equals: 'annotated'.
	self assert: (r at: 2) equals: 'doc here'.
	self assert: (r at: 3) equals: true.
	self assert: (r at: 4) equals: true.
	self assert: (r at: 5) equals: '(x: int, y: int = 3) -> bool'.
%

category: 'Grail-Tests - metadata'
method: NestedDefIdentityTestCase
testUpdateWrapperAppliesPerExecution
	"functools.wraps writes __name__ and __annotate__ onto the wrapper.  Both
	executions must report the wrapped function's name and annotations from
	their OWN wrapper object."

	| both |
	both := testModule @env1:update_wrapper_applies_per_execution asArray.
	self assert: (both at: 1) asArray equals: #( 'inner' true ).
	self assert: (both at: 2) asArray equals: #( 'inner' true ).
%

category: 'Grail-Tests - metadata'
method: NestedDefIdentityTestCase
testDecoratedNestedDefIsFresh
	"Decoration composes with the copy: the decorator receives the fresh
	object, the rebind stores the decorator's result, and the wrapper still
	reads the wrapped function's __name__."

	| r |
	r := testModule @env1:decorated_nested_def_is_fresh asArray.
	self assert: (r at: 1) equals: 6.
	self assert: (r at: 2) equals: 8.
	self assert: (r at: 3) equals: true.
	self assert: (r at: 4) asArray equals: #( 'work' 'work' ).
%

! --- control flow that reads the def's own binding ---

category: 'Grail-Tests - control flow'
method: NestedDefIdentityTestCase
testRecursionByNameResolves
	"A nested def calling itself reads the enclosing binding, which now holds
	the COPY rather than the block the literal answers -- so a copy the name
	did not point at would recurse into the wrong object or not terminate."

	self assert: testModule @env1:recursion_by_name_resolves equals: 120.
%

category: 'Grail-Tests - control flow'
method: NestedDefIdentityTestCase
testGeneratorNestedDefWorks
	"A generator def wraps its body in extra machinery; the copy is still the
	callable that machinery drives."

	self assert: testModule @env1:generator_nested_def_works asArray
		equals: #( 0 1 2 ).
%
