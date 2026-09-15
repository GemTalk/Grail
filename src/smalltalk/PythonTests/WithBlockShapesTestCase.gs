! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WithBlockShapesTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WithBlockShapesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WithBlockShapesTestCase - what __exit__ is told, on every with-statement shape
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WithBlockShapesTestCase removeAllMethods.
WithBlockShapesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WithBlockShapesTestCase
tearDown
	"Leave no trace of the IR arm's import: the sys.modules key AND the
	canonical registries the load wrote, and put the IR flag back to reading
	the env var."

	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'with_block_shapes_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'with_block_shapes_ir'.
	irModule := nil.
%

category: 'Grail-Private'
method: WithBlockShapesTestCase
___textResults___
	"The fixture through whichever path the session is configured for."

	| mod |
	(importlib @env1:modules) removeKey: #'with_block_shapes' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_block_shapes.py')
		name: 'with_block_shapes'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Private'
method: WithBlockShapesTestCase
___irResults___
	"The same fixture with the direct-to-IR seam FORCED ON, under a second
	module name so it cannot collide with the text arm's instance.

	Forcing matters: the defect this pins exists only on the IR path, so a
	plain flag-off suite run would pass with the bug still in place -- the
	vacuous kind of green."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_block_shapes_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'with_block_shapes_ir'.
	irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/with_block_shapes.py')
		name: 'with_block_shapes_ir'.
	^ irModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Private'
method: WithBlockShapesTestCase
___shapeNames___
	^ #('normal' 'with_return' 'propagates' 'suppressed' 'with_break'
	    'with_continue' 'nested' 'multi_item' 'as_target' 'exit_raises')
%

category: 'Grail-Private'
method: WithBlockShapesTestCase
___disagreeingIn___: results
	| bad |
	bad := OrderedCollection new.
	self ___shapeNames___ do: [:key |
		((results @env1:__getitem__: key) = true) ifFalse: [bad add: key]].
	^ bad
%

category: 'Grail-Tests - with statement'
method: WithBlockShapesTestCase
testEveryWithShapeTellsExitTheTruth
	"What __exit__ is told about how its body ended, on the path this session
	is configured for.  The fixture self-verifies under CPython, so each
	expectation is CPython's behaviour and not Grail's opinion of it."

	| bad |
	bad := self ___disagreeingIn___: self ___textResults___.
	self assert: bad isEmpty
		description: 'with-statement shapes disagreeing with CPython: '
			, bad asArray printString
%

category: 'Grail-Tests - with statement'
method: WithBlockShapesTestCase
testEveryWithShapeTellsExitTheTruthUnderIR
	"The same answers with the direct-to-IR seam FORCED ON.

	IR and the text path split a with-statement differently -- the text tests a
	``== true'' sentinel after on:do:, IR uses an ensure: block guarded by a
	___handled___ flag, because IR compiles ``return'' to a real ``^'' that
	bypasses the handler.  ensure: runs on EVERY unwind though, and a Smalltalk
	error is not a BaseException, so it never reached the handler: the manager
	was told __exit__(None, None, None) -- that the body finished cleanly --
	while an error was unwinding through it.

	unittest's assertRaisesRegex wraps its call in exactly that shape, and its
	__exit__, told there was no exception, RAISES from inside the ensure: block
	and replaces the original error.  That was test.test_codecs' whole flag-on
	delta (ERROR 65 -> 66), surfacing as a clean `TypeError not raised' several
	layers from the cause.

	``with_return'' is the case the ensure: exists for, so it is the one a
	careless fix breaks; ``exit_raises'' pins the other direction.

	FORCED rather than inherited, because the defect is IR-only: a flag-off
	suite run would pass with the bug still in place."

	| bad |
	bad := self ___disagreeingIn___: self ___irResults___.
	self assert: bad isEmpty
		description: 'with-statement shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - with statement'
method: WithBlockShapesTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard.  Correct answers prove nothing if the seam quietly
	fell back to text -- the IR arm would then be re-testing the text path and
	passing for the wrong reason.  So assert a NON-ZERO denominator, not just
	the absence of failures.

	On a platform without IR support (3.7.x) the forced flag is correctly a
	no-op, and there is nothing to assert."

	| stats |
	self ___irResults___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the '
			, 'text path; compiled = ' , (stats at: #compiled) printString
%
