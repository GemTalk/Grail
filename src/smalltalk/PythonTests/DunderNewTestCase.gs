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
	"A RUNTIME method-compile failure raises catchable NameError
	instead of aborting the module (___compileMethod:'s CompileError
	resignal).  The old fixture -- a class method referencing a
	method-local sibling -- now COMPILES thanks to closure cells, so
	the guard is probed directly with unparseable source."

	| cls |
	cls := PythonInstance @env1:___subclass___: #'___CompileFailProbe___'
		instVarNames: #() classInstVarNames: #(#'__module__' #'dynInstVars').
	self should: [cls @env1:___compileMethod: '][ bogus' category: 'Grail-Test']
		raise: NameError
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

category: 'Grail-Tests - closure cells'
method: DunderNewTestCase
testClassMethodClosureCells
	"Method-local classes whose METHOD bodies reference enclosing-
	function locals (their own name, sibling locals): string-compiled
	methods have no home context, so the classdef emission stores each
	captured VALUE on the class's per-class dynamic attrs and the
	method reads it back (object>>___classCell___:).  Capture is
	by-value at definition (documented deviation from CPython's
	by-reference cells).  Also pins: int subclasses register with the
	numbers tower, and the @property pair-read applies to
	AbstractPyInt-rooted classes (test_fractions' CustomInt)."

	self assert: (self fixture @env1:CLOSURE_CELL_RESULT) @env1:__repr__
		equals: '[''Local'', [1, 2, 3], ''13/5'', True]'
%

category: 'Grail-Tests - math'
method: DunderNewTestCase
testMathDomainErrors
	"sqrt/acos/asin/acosh/atanh/log/log10 raise CPython's
	ValueError('math domain error') outside their domains instead of
	kernel numeric errors or NaNs."

	self assert: (self eval: 'import math
r = []
for thunk in [lambda: math.sqrt(-1), lambda: math.acos(2), lambda: math.asin(-2),
              lambda: math.acosh(0.5), lambda: math.atanh(1), lambda: math.log(0),
              lambda: math.log10(-3)]:
    try:
        thunk()
        r.append("no-error")
    except ValueError:
        r.append("ve")
r + [math.sqrt(4), math.log(math.e)]
') @env1:__repr__ equals: '[''ve'', ''ve'', ''ve'', ''ve'', ''ve'', ''ve'', ''ve'', 2.0, 1.0]'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
phase2
	"PHASE2_RESULT dict from the fixture (fresh-loaded)."

	^ self fixture @env1:PHASE2_RESULT
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testChainedTupleUnpackAssign
	"``ka, va = ta = d.popitem()'' -- a chained assignment whose first
	target is a tuple pattern compiled to invalid Smalltalk before
	(AssignAst emitted ``(tuple...) := ___chain___''; test_dict's
	test_popitem could not even compile)."

	self assert: (self phase2 @env1:__getitem__: 'chained') equals: true
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testNoneOrderingRaisesTypeError
	"Sorting a list containing None raises catchable TypeError (both
	the env-0 #< sort-block send and the __lt__ dunder route)."

	self assert: (self phase2 @env1:__getitem__: 'none_lt') equals: 'TypeError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testSequenceKwargsConstructorsRaise
	"tuple(sequence=()) / list(sequence=[]) reject keyword arguments
	with TypeError instead of an uncatchable _new:kw: MNU."

	self assert: (self phase2 @env1:__getitem__: 'tuple_kw') equals: 'TypeError'.
	self assert: (self phase2 @env1:__getitem__: 'list_kw') equals: 'TypeError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testListExtendProtocol
	"extend(None) raises TypeError (was #do: MNU); extend(obj) with an
	__iter__/__next__ pair appends its items."

	self assert: (self phase2 @env1:__getitem__: 'extend_none') equals: 'TypeError'.
	self assert: (self phase2 @env1:__getitem__: 'extend_iter') equals: '[1, 1, 2]'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testNegativeStepSliceStores
	"Negative-step extended-slice assignment and deletion use the
	correct inclusive bound (hi is exclusive: hi+1 for st<0, previously
	hi-1 walked one past and raised uncatchable OffsetError)."

	self assert: (self phase2 @env1:__getitem__: 'neg_assign') equals: '[3, 2, 1, 0]'.
	self assert: (self phase2 @env1:__getitem__: 'neg_del') equals: '[0, 2, 3, 4]'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testHugeStepSliceClamped
	"sys.maxsize / 1<<333 slice steps are clamped to the collection
	size: same visited indices, and no LargeInteger reaches the inlined
	to:by:do: comparison (env-1 _nonZeroGte: MNU on LargeInteger)."

	self assert: (self phase2 @env1:__getitem__: 'big_step_set') equals: '[0, 0, 2, 3, 4]'.
	self assert: (self phase2 @env1:__getitem__: 'big_step_del') equals: '[0, 1, 2, 3, 4, 5, 6, 7, 8]'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testEvilIterableSliceAssignRaises
	"gh-120384: an iterable that mutates the target list during
	iteration makes extended-slice assignment raise ValueError (indices
	are computed AFTER materializing the values)."

	self assert: (self phase2 @env1:__getitem__: 'evil') equals: 'ValueError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testReprCycleGuards
	"Self-referential containers repr with CPython's cycle markers
	instead of recursing to AlmostOutOfStack."

	self assert: (self phase2 @env1:__getitem__: 'list_cycle') equals: '[0, 1, [...]]'.
	self assert: (self phase2 @env1:__getitem__: 'dict_cycle') equals: '{''k'': {...}}'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testReprDepthRaisesRecursionError
	"2000-deep nesting raises catchable RecursionError before the gem
	stack overflows (list_tests test_repr_deep uses 200k)."

	self assert: (self phase2 @env1:__getitem__: 'deep') equals: 'RecursionError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testSequenceRepeatMemoryGuard
	"[0] * 2**62 and *= raise MemoryError instead of exhausting the
	session's temporary object memory."

	self assert: (self phase2 @env1:__getitem__: 'mul_mem') equals: 'MemoryError'.
	self assert: (self phase2 @env1:__getitem__: 'imul_mem') equals: 'MemoryError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testIteratorReprPrintable
	"repr(iter(t)) works -- iterator __repr__ fed a raw SmallInteger
	identityHash to nextPutAll: before (uncatchable #do: MNU inside
	pickle.dumps of an iterator)."

	self assert: (self phase2 @env1:__getitem__: 'iter_repr') equals: true
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testDictUpdateProtocol
	"dict.update: None/int/[object()] raise TypeError (was #do: MNU);
	pair-lists and keys/__getitem__ mappings merge."

	self assert: (self phase2 @env1:__getitem__: 'upd_none') equals: 'TypeError'.
	self assert: (self phase2 @env1:__getitem__: 'upd_int') equals: 'TypeError'.
	self assert: (self phase2 @env1:__getitem__: 'upd_obj') equals: 'TypeError'.
	self assert: (self phase2 @env1:__getitem__: 'upd') equals: true
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testReversedDict
	"reversed(d) yields keys via dict>>__reversed__ instead of an
	uncatchable reverseDo: MNU."

	self assert: (self phase2 @env1:__getitem__: 'rev_dict') equals: '[''p'', ''q'']'
%

category: 'Grail-Tests - enum functional API'
method: DunderNewTestCase
testEnumFunctionalAPI
	"Enum('Name', names, **kw) builds a runtime enum class: string
	names (auto 1..n values), start=, (name, value) pairs, value/name
	lookup, iteration/len, empty base shape, and a real Flag class."

	| r |
	r := self fixture @env1:ENUM_FUNC_RESULT.
	self assert: (r @env1:__getitem__: 'names') equals: '[''who'', ''what'', ''when'']'.
	self assert: (r @env1:__getitem__: 'values') equals: '[1, 2, 3]'.
	self assert: (r @env1:__getitem__: 'lookup') equals: true.
	self assert: (r @env1:__getitem__: 'getitem') equals: true.
	self assert: (r @env1:__getitem__: 'len') equals: 3.
	self assert: (r @env1:__getitem__: 'start') equals: '[8, 9, 10]'.
	self assert: (r @env1:__getitem__: 'pairs') equals: '[10, 20]'.
	self assert: (r @env1:__getitem__: 'empty') equals: 0.
	self assert: (r @env1:__getitem__: 'flag') equals: 'R'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testSingleLineTrySuites
	"``try: stmt'' with except/else/finally continuations on their own
	single-line suites parses (the trailing NEWLINE of a single-line
	suite hid the continuation keyword; test_bytes line 2409)."

	self assert: (self eval: 'def f(a):
    try: a.append(1)
    except ValueError: pass
    return a

def g():
    try: (0)[1]
    except TypeError: return "caught"
    else: return "no"

def h():
    out = []
    try: out.append("t")
    finally: out.append("f")
    return out

(len(f([])), g(), h()[1])
') @env1:__repr__ equals: '(1, ''caught'', ''f'')'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
phase2b
	^ self fixture @env1:PHASE2B_RESULT
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testArrayModuleNoKernelCollision
	"import array must not shadow kernel Array: the module class is
	mangled to PyArray (importlib ___asSmalltalkClassName___ probes
	Globals), and array.array works via the _array alias."

	self assert: (self phase2b @env1:__getitem__: 'array') equals: true.
	self assert: (self phase2b @env1:__getitem__: 'kernel_intact') equals: true
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testCollectionsCountElements
	self assert: (self phase2b @env1:__getitem__: 'count_elements') equals: true.
	self assert: (self phase2b @env1:__getitem__: 'counter') equals: true
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testWithOnNonContextManagerRaises
	"``with <generator>:'' raises catchable TypeError via
	object>>__enter__ (was an uncatchable env-1 MNU that walled
	test_functools)."

	self assert: (self phase2b @env1:__getitem__: 'with_gen') equals: 'TypeError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testUncompilableMethodStubbed
	"A classdef method hitting a codegen gap (generator lambda) no
	longer aborts the classdef: the class defines, sibling methods
	work, and CALLING the bad method raises catchable NameError."

	self assert: (self phase2b @env1:__getitem__: 'good_still_works') equals: 42.
	self assert: (self phase2b @env1:__getitem__: 'bad_raises') equals: 'NameError'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testLazyMapFilterZip
	"map/filter/zip are LAZY iterators (CPython semantics): they must
	work over infinite sources -- the eager versions looped to OOM and
	killed whole scoring sessions (test_itertools) -- while finite
	behavior is unchanged."

	self assert: (self eval: 'from itertools import count

def take(n, it):
    out = []
    for x in it:
        out.append(x)
        if len(out) == n:
            break
    return out

a = take(3, map(lambda x: x * 2, count()))
b = take(3, filter(lambda x: x % 2 == 0, count()))
c = take(2, zip(count(), count(1)))
d = list(map(str, [1, 2]))
e = list(filter(None, [0, 1, 0, 2]))
f = list(zip("ab", [10, 20]))
g = list(zip())
(a, b, c, d, e, f, g)
') @env1:__repr__ equals: '([0, 2, 4], [0, 2, 4], [(0, 1), (1, 2)], [''1'', ''2''], [1, 2], [(''a'', 10), (''b'', 20)], [])'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testClassBodyIfAssignments
	"Top-level ``if'' statements in a class body run at class-definition
	time: taken-branch NAME = value assignments become class attributes
	(per-class dynamic store), untaken branches leave the name absent.
	The CPython dual-module pattern (``if c_functools: partial = ...'')
	guards 30+ attributes in test_functools alone."

	self assert: (self fixture @env1:CLASS_BODY_IF_RESULT) @env1:__repr__
		equals: '(True, 7, ''py'', False)'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testUnittestContextAndSubclassAsserts
	"TestCase.assertIsSubclass/assertNotIsSubclass/enterContext (3.11+)
	and warnings.catch_warnings(record=True) -- the kwargs form needs
	the _catch_warnings:kw: selector or the unary method auto-invokes
	on the attribute load and the CM instance itself gets called."

	self assert: (self fixture @env1:UNITTEST_SURFACE_RESULT) @env1:__repr__
		equals: '(1, 0, 0)'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testStaticSiblingRefInClassBody
	"A class-body value expression can reference an earlier sibling
	@staticmethod as a first-class function (NameAst emits a
	class-receiver BoundMethod; plain sibling defs already worked via
	the receiver-less form).  test_enum's functional-API classes pass
	_generate_next_value_ this way."

	self assert: (self fixture @env1:STATIC_SIBLING_RESULT) @env1:__repr__
		equals: '(''x'', 5)'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testSingledispatch
	"functools.singledispatch: MRO-aware dispatch, both register forms,
	builtin-type key normalization, and stable module-function identity
	(every module-attr wrap site now CACHES its BoundMethod in the
	dynamic slot, so two reads of the same function are ``is''-equal,
	and a decorator's rebinding wins over the original compiled def)."

	self assert: (self fixture @env1:SINGLEDISPATCH_RESULT) @env1:__repr__
		equals: '(''base'', ''integer'', ''string hi'', ''base'', ''A'', ''B'', ''A'', ''B'', True)'
%

category: 'Grail-Tests - phase2 conformance'
method: DunderNewTestCase
testFloatSubclassViaAbstractPyFloat
	"class MyFloat(float) substitutes the AbstractPyFloat Number-sibling
	(kernel Float is sealed).  Generality 80 -- above ints/fractions,
	below SmallDouble -- makes mixed arithmetic strip the wrapper in
	BOTH operand orders (1 + m retries as 1.0 + m; m + 1 forwards
	receiver-side), matching CPython float-subclass semantics.  This
	unblocked test_enum's import (class enum_type(float, Enum)):
	1077 tests now score."

	self assert: (self fixture @env1:FLOAT_SUBCLASS_RESULT) @env1:__repr__
		equals: '(2.5, 3.5, 3.5, 3.0, 5.0, True, True, True, 2, ''2.5'', ''MyFloat'', 2.0)'
%

category: 'Grail-Tests - enum internals'
method: DunderNewTestCase
testEnumInternals
	"The enum-internals round: (1) a method-local classdef whose BASE
	is a sibling method-local class evaluates the bases expression
	inline (it was hijacked into an unstored ___classCell___ read --
	539 test_enum errors); (2) _member_type_ (category Grail-Class
	Attrs so class-attr reads perform it); (3) auto() resolves to
	per-CLASS values, sequential for Enum and power-of-two for Flag;
	(4) metaclass __contains__; (5) Flag bitwise algebra with cached
	composite pseudo-members."

	| r |
	r := self fixture @env1:ENUM_INTERNALS_RESULT.
	self assert: (r @env1:__getitem__: 'local_bases') @env1:__repr__ equals: '(''hi'', 2)'.
	self assert: (r @env1:__getitem__: 'auto_values') @env1:__repr__ equals: '(1, 2, 3)'.
	self assert: (r @env1:__getitem__: 'member_type_plain') equals: true.
	self assert: (r @env1:__getitem__: 'member_type_int') equals: true.
	self assert: (r @env1:__getitem__: 'contains') @env1:__repr__ equals: '(True, False)'.
	self assert: (r @env1:__getitem__: 'flag_values') @env1:__repr__ equals: '(1, 2, 4)'.
	self assert: (r @env1:__getitem__: 'flag_or') @env1:__repr__ equals: '(3, ''<Perm.R|W: 3>'')'.
	self assert: (r @env1:__getitem__: 'flag_lookup') equals: '<Perm.R|X: 5>'.
	self assert: (r @env1:__getitem__: 'flag_in') @env1:__repr__ equals: '(True, False)'.
	self assert: (r @env1:__getitem__: 'flag_and_xor') @env1:__repr__ equals: '(True, True)'.
	self assert: (r @env1:__getitem__: 'flag_invert') equals: '<Perm.W|X: 6>'.
	self assert: (r @env1:__getitem__: 'flag_bool') @env1:__repr__ equals: '(True, False)'.
	self assert: (r @env1:__getitem__: 'flag_auto') @env1:__repr__ equals: '(1, 2, 4)'
%

category: 'Grail-Tests - enum internals'
method: DunderNewTestCase
testMiFlagEnums
	"class E(int, Flag): the enum secondary-base merge copies BOTH the
	metaclass protocol (universal-root no-op defaults like object's
	___pyClassDefined___: must not block the copy -- members were never
	built) AND Flag's instance algebra (operand-tolerant across storage
	roots).  auto() markers also resolve through the functional API's
	dict/pairs forms with per-class numbering."

	self assert: (self fixture @env1:MI_FLAG_RESULT) @env1:__repr__
		equals: '(1, 2, 4, 3, 5, True, True, 1, ''R'', 1, 2, True)'
%
