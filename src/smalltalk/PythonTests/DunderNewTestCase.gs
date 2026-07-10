! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DunderNewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DunderNewTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DunderNewTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing behavior from DunderNewTestCase
expectvalue /Metaclass3
doit
DunderNewTestCase removeAllMethods.
DunderNewTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Helpers'
method: DunderNewTestCase
fixture
	"Load (fresh each test) the descriptor-round fixture module: real
	class definitions cannot instantiate inside eval:."

	(importlib @env1:modules) @env0:removeKey: #'test.grail_dunder_check' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib @env1:___moduleNameToPath___: 'test.grail_dunder_check')
		name: 'test.grail_dunder_check'
%

category: 'Grail-Tests - __new__'
method: DunderNewTestCase
testUserNewRunsWithClsReceiver
	"Cls(args) runs a class-body def __new__(cls, ...) with cls bound
	to the class (object class>>___allocateInstance___:kw: routes it
	non-virtually; previously user __new__ was silently IGNORED).
	Covers: per-def self-param (cls), super(D, cls) finding object's
	class-side __new__, and a rebound `self` local in a cls-receiver
	method."

	self assert: (self fixture @env1:NEW_RESULT) equals: 8
%

category: 'Grail-Tests - __new__'
method: DunderNewTestCase
testUserNewWithSlots
	"__new__ + __slots__: slot stores made inside __new__ read back
	(the vendored fractions.Fraction construction shape)."

	self assert: (self fixture @env1:SLOT_RESULT) equals: 5
%

category: 'Grail-Tests - class-attr dunders'
method: DunderNewTestCase
testClassAttrOperatorClosuresDispatch
	"Binary operators stored as CLASS ATTRIBUTES (fractions'
	``__add__, __radd__ = _operator_fallbacks(...)``): the binOp
	protocol consults ___classAttrDunder___ before raising.  Also
	covers tuple-target class-body assignment and calling a
	CLASS-BODY def during class-body evaluation (UnboundMethod on the
	class under construction)."

	self assert: (self fixture @env1:OP_RESULT) equals: 7
%

category: 'Grail-Tests - self-param'
method: DunderNewTestCase
testNonSelfReceiverNameRebound
	"A method whose receiver param is NOT 'self' (jinja2's
	Context.call(__self, ...)) and which REBINDS that param: the
	rebind transport declares the param under its own name (only the
	pseudo-variable 'self' needs the underscore rename).  38 Flask
	tests regressed on this before the fix."

	self assert: (self fixture @env1:REBIND_RESULT) equals: true
%

category: 'Grail-Tests - sealed classes'
method: DunderNewTestCase
testSealedKernelSubclassRaisesTypeError
	"DELIBERATE DEVIATION: subclassing a sealed kernel class (int ->
	Integer) raises catchable TypeError instead of the uncatchable
	ImproperOperation that killed whole CPython module runs."

	self assert: (self fixture @env1:SEALED_RESULT) equals: 'type-error'
%

category: 'Grail-Tests - fractions'
method: DunderNewTestCase
testVendoredFractionEndToEnd
	"import fractions resolves to the vendored CPython fractions.py
	(the sys.modules seed for the kernel-Fraction binding was removed).
	Full stack: __new__ construction, slots, @property pair-reads,
	numbers.Rational ABC, class-attr operators, round protocol."

	self assert: (self eval: 'from fractions import Fraction as F
[repr(F(7, 3)), str(F(1, 2) + F(1, 3)), str(F(4, 2)), float(F(1, 4)),
 str(F("3/7")), F(1, 2) == F(2, 4), str(2 * F(5, 2)), round(F(7, 2)),
 isinstance(F(1, 2), __import__("numbers").Rational), F(7, 3).numerator]
') @env1:__repr__ equals: '[''Fraction(7, 3)'', ''5/6'', ''2'', 0.25, ''3/7'', True, ''5'', 4, True, 7]'
%
