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
	"Subclassing a sealed kernel class raises catchable TypeError
	instead of the uncatchable ImproperOperation.  bool is the probe:
	CPython itself forbids subclassing bool, while int subclassing now
	WORKS via the AbstractPyInt routing (see
	testIntSubclassViaAbstractPyInt)."

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

category: 'Grail-Tests - functools'
method: DunderNewTestCase
testLruCacheMemoizes
	"lru_cache REALLY memoizes now (results interned by positional +
	sorted-kw key; unbounded).  Without it, recursive memoized
	functions are exponential -- test_functools' fib test never
	finished.  cache_info counts and cache_clear resets."

	self assert: (self eval: 'import functools
calls = []
@functools.lru_cache(maxsize=None)
def fib(n):
    calls.append(n)
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
r = fib(40)
info = fib.cache_info()
fib.cache_clear()
[r, len(calls), info[3], fib.cache_info()[3]]
') @env1:__repr__ equals: '[102334155, 41, 41, 0]'
%

category: 'Grail-Tests - closures'
method: DunderNewTestCase
testStaticmethodClosureOverMethodSelf
	"A @staticmethod inside a METHOD-LOCAL class referencing the outer
	method's ``self``: the receiver-bound self must emit Smalltalk
	self (not the undeclared ``_self`` transport) -- the shape killed
	test_functools' lru_cache_weakrefable at compile time.  (True
	closure capture across compiled methods is a separate known
	limitation; this pins the compile.)"

	self assert: (self fixture @env1:CLOSURE_RESULT) equals: 4
%

category: 'Grail-Tests - int subclass'
method: DunderNewTestCase
testIntSubclassViaAbstractPyInt
	"``class MyInt(int)`` routes its storage base to AbstractPyInt
	(Class>>___subclass___ substitutes the sealed Integer): instances
	construct through int's conversion (incl. the string+base form),
	degrade to plain int under arithmetic (CPython operator
	semantics), index sequences via __index__ (guards chain-walk now),
	interoperate as dict keys, keep their own methods, and satisfy
	isinstance/issubclass against int."

	self assert: (self fixture @env1:INT_SUB_RESULTS) @env1:__repr__
		equals: '[8, 8, ''SmallInteger'', True, True, 5, 20, ''x'', ''v=9'', True]'
%

category: 'Grail-Tests - math'
method: DunderNewTestCase
testMathIsclose
	"math.isclose (PEP 485) -- test_math imports it at module scope."

	self assert: (self eval: 'import math
[math.isclose(1.0, 1.0 + 1e-10), math.isclose(1.0, 1.1),
 math.isclose(100, 100.00001, rel_tol=1e-3)]
') @env1:__repr__ equals: '[True, False, True]'
%

category: 'Grail-Tests - generators'
method: DunderNewTestCase
testGeneratorBodyExceptionPropagates
	"An exception raised INSIDE a generator body runs on the forked
	producer process; it must re-signal at the consumer's next()
	(CPython contract -- heapq.merge must not suppress an IndexError
	from its inputs).  Previously it escaped on the forked process and
	killed the whole session."

	self assert: (self eval: 'def gen():
    yield 1
    raise ValueError("boom")
g = gen()
first = next(g)
try:
    next(g)
    r = "no-error"
except ValueError as e:
    r = str(e)
[first, r]') @env1:__repr__ equals: '[1, ''boom'']'
%

category: 'Grail-Tests - iteration'
method: DunderNewTestCase
testLegacyGetitemIterationAndIteratorErrors
	"CPython's legacy sequence protocol: __getitem__-only classes
	iterate by successive indices until IndexError; __iter__-without-
	__next__ and iter(non-iterable) raise catchable TypeErrors (each
	was an uncatchable MNU that killed test_heapq)."

	self assert: (self fixture @env1:LEGACY_ITER_RESULT) @env1:__repr__
		equals: '[[3, 1, 2], [1, 2, 3], ''type-error'', ''type-error'']'
%

category: 'Grail-Tests - arithmetic'
method: DunderNewTestCase
testZeroDivisionAndNotCallable
	"Division/modulo by zero raise catchable ZeroDivisionError (the
	kernel ZeroDivide was uncatchable); calling a non-callable raises
	catchable TypeError."

	self assert: (self eval: 'r = []
for expr in ["3 // 0", "3 % 0", "divmod(3, 0)"]:
    try:
        eval(expr)
        r.append("no-error")
    except ZeroDivisionError:
        r.append("zde")
try:
    [1, 2, 3](4)
    r.append("no-error")
except TypeError:
    r.append("type-error")
r') @env1:__repr__ equals: '[''zde'', ''zde'', ''zde'', ''type-error'']'
%

category: 'Grail-Tests - codegen'
method: DunderNewTestCase
testRuntimeClassCompileFailureIsCatchable
	"A RUNTIME classdef whose method cannot compile (references a
	method-local sibling temp that string-compiled methods cannot
	close over) raises catchable NameError instead of aborting the
	module -- keeps whole CPython modules scoreable while the
	closure-cell gap remains open."

	self assert: (self fixture @env1:COMPILE_FAIL_RESULT) equals: 'name-error'
%

category: 'Grail-Tests - heapq'
method: DunderNewTestCase
testHeapqMaxApi
	"Python 3.14's public max-heap family (heapify_max & co.) --
	test_heapq exercises it in 26 places."

	self assert: (self eval: 'import heapq
h = [3, 1, 4, 1, 5, 9, 2, 6]
heapq.heapify_max(h)
top = h[0]
heapq.heappush_max(h, 100)
a = heapq.heappop_max(h)
b = heapq.heappop_max(h)
c = heapq.heappushpop_max(h, 0)
[top, a, b, c]') @env1:__repr__ equals: '[9, 100, 9, 6]'
%

category: 'Grail-Tests - protocol errors'
method: DunderNewTestCase
testProtocolFallbacksRaiseCatchableTypeErrors
	"PythonInstance item-protocol fallbacks (__getitem__/__setitem__/
	__delitem__ without a definition), iter(int), zero-arg call of a
	fixed-arity module function (BoundMethod no-match), and math-arg
	conversion (math.exp('x')) all raise CATCHABLE TypeErrors -- each
	was an uncatchable MNU that killed a CPython module run."

	self assert: (self fixture @env1:PROTOCOL_FALLBACK_RESULT) @env1:__repr__
		equals: '[''te'', ''te'', ''te'', ''te'', ''te'']'
%

category: 'Grail-Tests - overflow'
method: DunderNewTestCase
testIntegerOverflowIsCatchable
	"DELIBERATE DEVIATION: GemStone caps LargeInteger (~130k bits;
	CPython ints are unbounded).  factorial/** resignal the kernel
	NumericError as catchable OverflowError instead of killing the
	module run."

	self assert: (self eval: 'import math
try:
    math.factorial(100000)
    r = "no-error"
except OverflowError:
    r = "overflow"
r') equals: 'overflow'
%

category: 'Grail-Tests - decimal'
method: DunderNewTestCase
testDecimalStubFloatProtocol
	"The stdlib decimal.Decimal stub converts through __float__ (and
	the PythonInstance asFloat bridge), so math.isclose(Decimal(...),
	Decimal(...)) works (test_math IsCloseTests.test_decimals)."

	self assert: (self eval: 'import math
from decimal import Decimal
[math.isclose(Decimal("1.0"), Decimal("1.00000001"), rel_tol=1e-4),
 float(Decimal("2.5"))]') @env1:__repr__ equals: '[True, 2.5]'
%

category: 'Grail-Tests - math'
method: DunderNewTestCase
testMathFunctionBatch
	"copysign (incl. -0.0), ldexp, fma, hypot, dist, sumprod (incl.
	Python-Fraction operands through the env-1 dunder protocol), ulp
	-- test_math errored on every missing name (copysign alone 22x)."

	self assert: (self eval: 'import math
from fractions import Fraction as F
[math.copysign(3, -1), math.copysign(3.0, -0.0), math.ldexp(1.5, 3),
 math.fma(2, 3, 4), math.hypot(3, 4), math.dist((0, 0), (3, 4)),
 math.sumprod([1, 2, 3], [4, 5, 6]), str(math.sumprod([F(1, 2)], [F(2, 3)])),
 math.ulp(1.0) == 2.220446049250313e-16]
') @env1:__repr__ equals: '[-3.0, -3.0, 12.0, 10.0, 5.0, 5.0, 32, ''1/3'', True]'
%

category: 'Grail-Tests - builtins'
method: DunderNewTestCase
testSortedMinMaxExplicitKeyNone
	"An explicit key=None means no key (CPython) -- test_heapq passes
	key in [None, itemgetter(0), ...]."

	self assert: (self eval: '[sorted([3, 1, 2], key=None), min([3, 1, 2], key=None), max([3, 1, 2], key=None)]
') @env1:__repr__ equals: '[[1, 2, 3], 1, 3]'
%
