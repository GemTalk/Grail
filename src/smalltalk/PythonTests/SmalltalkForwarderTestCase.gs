! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- GrailForwarderTarget: a plain Smalltalk class whose env-0
! methods are the forwarding targets for the @smalltalk fixture.  Registered as
! a Python name below so the fixture can subclass it.
expectvalue /Class
doit
Object subclass: 'GrailForwarderTarget'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

set compile_env: 0

category: 'Grail-Forwarder-Target'
method: GrailForwarderTarget
pong
	^ 'pong'
%

category: 'Grail-Forwarder-Target'
method: GrailForwarderTarget
bump: n
	^ n + 1
%

category: 'Grail-Forwarder-Target'
method: GrailForwarderTarget
combine: a with: b
	^ a + b
%

category: 'Grail-Forwarder-Target'
method: GrailForwarderTarget
giveNil
	"Answers Smalltalk nil so the forwarder's nil -> None coercion can be
	exercised."
	^ nil
%

! Class-side (env-0) methods: forwarding targets for @staticmethod
! forwarders, whose Smalltalk receiver is the class.
category: 'Grail-Forwarder-Target'
classmethod: GrailForwarderTarget
beacon
	^ 'beacon'
%

category: 'Grail-Forwarder-Target'
classmethod: GrailForwarderTarget
triple: n
	^ n * 3
%

! ------------------- Register GrailForwarderTarget as a Python name so
! ``class Widget(GrailForwarderTarget)'' resolves in the fixture.
run
Python at: #'GrailForwarderTarget' put: GrailForwarderTarget.
%

! ------------------- Class definition for SmalltalkForwarderTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SmalltalkForwarderTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SmalltalkForwarderTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
SmalltalkForwarderTestCase removeAllMethods.
SmalltalkForwarderTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Setup
! ===============================================================================

category: 'Grail-Setup'
method: SmalltalkForwarderTestCase
setUp
	"Clear the module cache and load the @smalltalk-forwarder fixture."
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'smalltalk_forwarder' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/smalltalk_forwarder.py')
		name: 'smalltalk_forwarder'.
%

! ===============================================================================
! Happy-path tests
! ===============================================================================

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testBareDerivedUnary
	"Bare @smalltalk derives the target selector from the method name +
	arity: ``def pong(self)'' forwards to ``self pong'' (env 0)."

	self assert: (testModule @env1:r_derived_unary) equals: 'pong'.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testExplicitUnarySelector
	"@smalltalk('pong') forwards to the named unary selector even though the
	Python method name (greet) differs from the target."

	self assert: (testModule @env1:r_explicit_unary) equals: 'pong'.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testKeywordSelectorOneArg
	"@smalltalk('bump:') forwards a single-argument keyword send."

	self assert: (testModule @env1:r_keyword_one_arg) equals: 42.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testKeywordSelectorTwoArgs
	"@smalltalk('combine:with:') forwards a two-argument keyword send, with
	arguments delivered in order."

	self assert: (testModule @env1:r_keyword_two_args) equals: 42.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testNilResultBecomesNone
	"A native method that answers Smalltalk nil is coerced to Python None."

	self assert: (testModule @env1:r_nil_is_none) equals: true.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testExplicitBinarySelectorTrue
	"@smalltalk('==') forwards a 1-arg binary send; the Smalltalk Boolean
	result flows back to Python (same object -> True)."

	self assert: (testModule @env1:r_binary_same) equals: true.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testExplicitBinarySelectorFalse
	"Distinct receiver/argument -> the binary send answers False."

	self assert: (testModule @env1:r_binary_diff) equals: false.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testClassmethodForwarder
	"A @classmethod @smalltalk forwarder dispatches on the class itself as
	the Smalltalk receiver."

	self assert: (testModule @env1:r_classmethod_same) equals: true.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testStaticmethodDerivedForwarder
	"A @staticmethod @smalltalk forwarder (bare) dispatches a derived
	selector on the class as the Smalltalk receiver."

	self assert: (testModule @env1:r_static_derived) equals: 'beacon'.
%

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testStaticmethodKeywordForwarder
	"A @staticmethod @smalltalk('triple:') forwarder forwards its argument
	to a class-side keyword selector."

	self assert: (testModule @env1:r_static_keyword) equals: 42.
%

! ===============================================================================
! Guard: forwarders must be fixed-arity
! ===============================================================================

category: 'Grail-Tests - @smalltalk forwarder'
method: SmalltalkForwarderTestCase
testVarargsForwarderRaises
	"A @smalltalk forwarder with a non-fixed-arity signature (here a default
	argument) is rejected at compile time."
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'smalltalk_forwarder_varargs' ifAbsent: [].
	self should: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/smalltalk_forwarder_varargs.py')
			name: 'smalltalk_forwarder_varargs'
	] raise: Error.
%
