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

category: 'Grail-Tests - PEP 695'
method: DunderNewTestCase
testTypeParamsParsedAndErased
	"PEP 695 generics: ``def f[T](...)`` / ``class C[T]:`` parse (the
	bracket group is discarded -- Grail erases generics).  test_functools
	could not even IMPORT before (SyntaxError at def f[T])."

	self assert: (self eval: 'def f[T](a):
    return a * 2
def g[T: (int, str), *Ts, **P](x):
    return x + 1
[f(21), g(1)]') @env1:__repr__ equals: '[42, 2]'.
	self assert: (self fixture @env1:PEP695_CLASS_RESULT) equals: 7
%

category: 'Grail-Tests - call sites'
method: DunderNewTestCase
testStarUnpackInCalls
	"``f(*args)`` splices at ANY call shape: bare-name calls,
	classmethod calls, attribute calls (the fixed-arity fast paths
	decline splatted calls and fall through to the value:value: form,
	whose argument emitter concatenates).  Fraction(0.5) constructs
	through cls._from_coprime_ints(*x.as_integer_ratio())."

	self assert: (self eval: 'def f(a, b, c):
    return a + b * c
args = (2, 3, 4)
f(*args)') equals: 14.
	self assert: (self eval: 'from fractions import Fraction as F
str(F(0.5))') equals: '1/2'
%

category: 'Grail-Tests - varargs dunders'
method: DunderNewTestCase
testVarargsOnlyDunderDispatch
	"A dunder compiled VARARGS-ONLY (``def __pow__(a, b, modulo=None)``)
	has no fixed ``__pow__:`` selector; both the DNU binOp probe and the
	reflected-operand probe must try the ``_<name>:kw:`` form."

	self assert: (self eval: 'from fractions import Fraction as F
[str(F(1, 2) ** 2), str(2 ** F(2, 1))]') @env1:__repr__ equals: '[''1/4'', ''4'']'
%

category: 'Grail-Tests - functools'
method: DunderNewTestCase
testPartialIsARealClass
	"functools.partial is a CLASS (CPython subclasses it at import in
	test_functools; the old closure-returning module function could
	not be).  Covers construction, invocation with merged kwargs,
	func/args/keywords attrs, nested-partial flattening, and
	isinstance."

	self assert: (self eval: 'import functools
from functools import partial
p = partial(int, base=2)
p2 = partial(p, "101")
[p("101"), p2(), p.args == (), sorted(p.keywords.items()),
 isinstance(p, functools.partial)]
') @env1:__repr__ equals: '[5, 5, True, [(''base'', 2)], True]'
%

category: 'Grail-Tests - functools'
method: DunderNewTestCase
testCmpToKey
	"functools.cmp_to_key wraps values so comparisons route through
	the comparator; keyword form and non-K operand TypeErrors match
	CPython."

	self assert: (self eval: 'import functools
def revcmp(a, b):
    return (b > a) - (b < a)
r1 = sorted([3, 1, 2], key=functools.cmp_to_key(revcmp))
k = functools.cmp_to_key(mycmp=revcmp)
try:
    k(3) > 1
    r2 = "no-error"
except TypeError:
    r2 = "type-error"
[r1, r2]') @env1:__repr__ equals: '[[3, 2, 1], ''type-error'']'
%

category: 'Grail-Tests - codegen'
method: DunderNewTestCase
testUnderscoreAsDefAndClassName
	"``def _(...)`` / ``class _:`` -- `_` is GemStone's legacy
	assignment token; the parser renames the binding to ___unused___
	(same rename NameAst reads always had).  singledispatch
	registration bodies in test_functools use both forms."

	self assert: (self eval: 'def outer():
    def _(obj):
        return obj + 1
    return _(5)
outer()') equals: 6
%

category: 'Grail-Tests - f-strings'
method: DunderNewTestCase
testFStringNestedSpecInterpolation
	"PEP 498 one-level spec nesting: f''{x:0{w}d}'' evaluates {w}
	inside the format spec at runtime (previously the literal brace
	text reached the format engine and raised ValueError)."

	self assert: (self eval: 'w = 5
x = 42
[f"{x:0{w}d}", f"{x:{w}}", f"{3.14159:.{3}f}"]
') @env1:__repr__ equals: '[''00042'', ''   42'', ''3.142'']'
%

category: 'Grail-Tests - type checks'
method: DunderNewTestCase
testNonClassTypeChecksRaiseTypeError
	"isinstance/issubclass with a non-class classinfo, class statements
	with a non-class base, and instantiating a sealed kernel class all
	raise CATCHABLE TypeErrors (each was an uncatchable Smalltalk error
	that killed the test_functools module run)."

	self assert: (self eval: 'import functools
try:
    isinstance(3, functools.reduce)
    r1 = "no-error"
except TypeError:
    r1 = "type-error"
try:
    type(lambda: 1)()
    r2 = "no-error"
except TypeError:
    r2 = "type-error"
[r1, r2]') @env1:__repr__ equals: '[''type-error'', ''type-error'']'
%

category: 'Grail-Tests - nested classes'
method: DunderNewTestCase
testNestedClassInClassBody
	"``class Outer: class A: ...`` -- nested classes now emit (stored
	in the outer class's per-class dynamic attrs) and a LATER class-body
	statement can instantiate them (``a = A()``), the
	test_functools TestPartialMethod shape."

	self assert: (self fixture @env1:NESTED_RESULT) equals: 11
%
