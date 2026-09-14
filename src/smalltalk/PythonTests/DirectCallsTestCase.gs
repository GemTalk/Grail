! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DirectCallsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DirectCallsTestCase'
  instVarNames: #( registrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DirectCallsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DirectCallsTestCase
!
! DIRECT KEYWORD SENDS FOR ATTRIBUTE CALLS (GRAIL_DIRECT_CALLS=1), stage 2 of the
! object-model refactor.  With the flag on, CallAst compiles ``recv.foo(a, b)''
! for a receiver it cannot resolve at compile time to the plain env-1 send
! ``(recv) foo: a _: b'' instead of the load-then-call
! ``((recv) ___pyAttrLoad___: #foo) value: {a. b} value: nil''; a miss reaches the
! doesNotUnderstand:args:envId: hooks on object / PythonInstance, which load the
! attribute and call it (object>>___directCallRecover___:args:).
!
! Drives tests/python/direct_calls.py, whose checks are plain Python call
! semantics (a method on a foreign receiver, stored callables, instance- and
! class-level shadowing of a compiled method, __getattr__ / property / nested
! class attributes, bound methods, arity TypeErrors, AttributeError naming,
! kernel receivers, a module through a rebound name, nested-function self
! capture, super(), classmethods, None receivers, class-level data attributes
! called through the class).  The fixture is SELF-RUNNING
! (scripts/check_python_fixtures.sh), so every expectation is measured against
! CPython.  The same checks run with the flag OFF (nothing may depend on the call
! shape) and with the flag on top of the IR backend.  The structural test then
! looks at generated source to confirm the flag actually changed the shape.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DirectCallsTestCase removeAllMethods.
DirectCallsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DirectCallsTestCase
setUp
	"Snapshot the canonical-class registry: the fixture is loaded once per flag
	state under distinct module names, and a class minted under one state must
	not be identity-reused under the other."

	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
%

category: 'Grail-Setup'
method: DirectCallsTestCase
tearDown
	importlib ___directCallsInvalidate___.
	importlib ___irCodegenEnabledInvalidate___.
	#('direct_calls_on' 'direct_calls_off' 'direct_calls_ir') do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
%

category: 'Grail-Private'
method: DirectCallsTestCase
loadFixtureWithFlag: aBoolean ir: irBoolean as: aName
	"tests/python/direct_calls.py, freshly compiled with GRAIL_DIRECT_CALLS
	forced to aBoolean (and GRAIL_IR_CODEGEN to irBoolean)."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	importlib ___directCallsForce___: aBoolean.
	importlib ___irCodegenForce___: irBoolean.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/direct_calls.py')
		name: aName
%

category: 'Grail-Private'
method: DirectCallsTestCase
assertAllChecksPassIn: aModule
	"``failures'' is the fixture's own import-time run of every check: the
	names that did not answer True, comma-joined, empty when all passed."

	self assert: (aModule @env1:___pyAttrLoad___: #check_count) equals: 24.
	self assert: (aModule @env1:___pyAttrLoad___: #failures) asString equals: ''.
%

category: 'Grail-Tests - Semantics'
method: DirectCallsTestCase
testAllChecksPassWithDirectCallsOn
	"THE TEST THIS EXISTS FOR: every call-semantics check holds when attribute
	calls compile to direct keyword sends with DNU recovery."

	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: true ir: false as: 'direct_calls_on').
%

category: 'Grail-Tests - Semantics'
method: DirectCallsTestCase
testAllChecksPassWithDirectCallsOff
	"The control: the same checks hold on the unchanged load-then-call shape,
	so the fixture pins Python semantics rather than a dispatch shape."

	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: false ir: false as: 'direct_calls_off').
%

category: 'Grail-Tests - Semantics'
method: DirectCallsTestCase
testAllChecksPassWithDirectCallsOnIR
	"The IR backend emits the same direct send (#attrDirect); skipped where the
	kernel cannot build IR at all."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: true ir: true as: 'direct_calls_ir').
%

category: 'Grail-Tests - Structure'
method: DirectCallsTestCase
testFlagChangesTheEmittedShape
	"``c.foo(i)'' on an unresolved receiver: load-then-call with the flag off,
	one keyword send with it on.  Asserted on the generated source so a silent
	fall-back to the legacy shape cannot pass as a semantic pass."

	| off on |
	importlib ___directCallsForce___: false.
	off := (importlib smalltalkForSource: 'c.foo(i)') asString.
	importlib ___directCallsForce___: true.
	on := (importlib smalltalkForSource: 'c.foo(i)') asString.
	self assert: (off includesString: '___pyAttrLoad___: #''foo''') description: off.
	self assert: (off includesString: 'value: nil') description: off.
	self assert: (on includesString: ' foo: (') description: on.
	self deny: (on includesString: '___pyAttrLoad___: #''foo''') description: on.
%
