! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinsTestCase - Tests for Python builtins module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
BuiltinsTestCase removeAllMethods: 0.
BuiltinsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function — Phase-2 fast-path direct method dispatch.

	After the dispatch rewrite, `builtins>>abs:` is a real env-1 method
	that takes a number directly. This test exercises that method, which
	is what the codegen now emits for `abs(x)` call sites."

	| b result |
	b := builtins ___instance___.

	result := b @env1:abs: 5.
	self assert: result equals: 5.

	result := b @env1:abs: -5.
	self assert: result equals: 5.

	result := b @env1:abs: 0.
	self assert: result equals: 0.

	result := b @env1:abs: -3.14.
	self assert: (result - 3.14) abs < 0.0001
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testAbsViaEval
	"Test that `abs(x)` Python source compiles to the Phase-2 fast path
	and produces the right answers for the same inputs as testAbs."

	self assert: (self eval: 'abs(5)') equals: 5.
	self assert: (self eval: 'abs(-5)') equals: 5.
	self assert: (self eval: 'abs(0)') equals: 0.
	self assert: ((self eval: 'abs(-3.14)') - 3.14) abs < 0.0001
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testAbsAsValue
	"Test that abs can be used as a first-class value via the BoundMethod
	path. The reference `f = abs` materializes a BoundMethod at compile
	time; calling `f(-5)` forwards through `BoundMethod>>value:value:` to
	the underlying `builtins>>abs:` method."

	| result |
	result := self eval: '
f = abs
f(-5)'.
	self assert: result equals: 5.

	result := self eval: '
g = abs
g(0)'.
	self assert: result equals: 0
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testAbsShadowed
	"Test that a local named `abs` shadows the builtin. The codegen must
	NOT apply the BoundMethod special case when the name is declared as
	a local in any enclosing scope."

	| result |
	result := self eval: '
abs = 42
abs'.
	self assert: result equals: 42
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testLambdaBasic
	"Test that basic lambda expressions compile and execute correctly."

	self assert: (self eval: '
f = lambda x: x + 1
f(5)
') equals: 6
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testLambdaTwoArgs
	"Test that lambda with two arguments works."

	self assert: (self eval: '
f = lambda x, y: x * y
f(3, 4)
') equals: 12
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testImportBuiltinsDoesNotBreak
	"Test that `import builtins` does not break builtin calls. The
	codegen now emits `(Python at: #builtins) instance` instead of
	`builtins instance`, so the local variable shadow is harmless."

	self assert: (self eval: '
import builtins
abs(-5)') equals: 5
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testUnpackCountValidation
	"Tuple-unpacking assigns via the iterator protocol and enforces the value
	count like CPython (test_iter test_unpack_iter): an iterable-but-not-
	subscriptable class unpacks by __iter__, too many / too few values raise
	ValueError, a non-iterable raises TypeError, and a dict-values view unpacks
	by iteration.  Uses a loaded module because the fixture defines classes."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_unpack' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_unpack.py')
		name: 'grail_unpack'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testStrIteratorPickle
	"iter(str) round-trips through pickle at every protocol, resuming at the
	right character (test_iter test_iter_string).  str_iterator now answers
	_getstate (collection, position) like tuple_iterator/seq_iterator, so
	pickle.py's positional path reduces it to (iter, (str,), position) and
	BUILD re-applies the index.  Uses a loaded module to run the round-trip in
	a context where the stdlib pickle module is importable."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_str_iter_pickle' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_str_iter_pickle.py')
		name: 'grail_str_iter_pickle'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testNestedClassStringLiteralNewline
	"A string literal containing a newline, in a method of a class defined
	INSIDE a nested block (try/for/if), keeps its exact value.  ClassDefAst
	embeds each compiled method's source as a Smalltalk string literal, and
	writing it char-by-char through the pretty-printer spliced indentCount
	tabs after every newline -- so a newline embedded in the method's own
	string constants gained one stray tab per nesting level (test_iter
	test_writelines).  Uses a loaded module because the fixture defines
	classes."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_nested_class_strlit' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_nested_class_strlit.py')
		name: 'grail_nested_class_strlit'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testWritelinesIterableProtocol
	"file.writelines(x) iterates x via the Python protocol: a non-iterable
	(None/int) raises a catchable TypeError instead of a Smalltalk #do:
	MNU, a dict yields its KEYS, and a large custom iterator defined inside a
	try block writes every element in order (test_iter test_writelines).
	Uses a loaded module because the fixture defines classes and does file
	I/O."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_writelines' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_writelines.py')
		name: 'grail_writelines'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Backlog Fixes'
method: BuiltinsTestCase
testDictContainsHeterogeneousKeys
	"``key in d'' must not crash when d mixes hashable key types whose
	pairwise == is NotImplemented (a complex key beside str keys).  The
	linear NaN-identity fallback in dict>>__contains__ now iterates keysDo:
	instead of building a Set of the keys, whose = based dedup leaked the
	``___NotImplemented___'' sentinel into a Boolean context -- an
	uncatchable error 2085 (test_iter test_in_and_not_in: ``1 in {'one': 1,
	1j: 2j}'')."

	self deny: (self eval: '1 in {"one": 1, "two": 2, "three": 3, 1j: 2j}').
	self assert: (self eval: '1 not in {"one": 1, "two": 2, "three": 3, 1j: 2j}').
	self assert: (self eval: '1j in {"one": 1, 1j: 2j}').
	self assert: (self eval: '"one" in {"one": 1, 1j: 2j}').
	self deny: (self eval: '2 in {"a": 1, 3j: 4}').
	"the NaN-identity fallback (the reason the linear scan exists) still holds"
	self assert: (self eval: 'nan = float("nan")
nan in {nan: None}')
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testEvalPow3Arg
	"Phase 4b: pow(x, y, z) — varargs fast path. The 2-arg form goes
	through the fixed-arity `pow:_:` (Phase 4a); the 3-arg form lands in
	`_pow:kw:` (Phase 4b)."

	self assert: (self eval: 'pow(2, 3, 5)') equals: 3.
	self assert: (self eval: 'pow(10, 2, 7)') equals: 2.
	self assert: (self eval: 'pow(2, 3)') equals: 8
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testEvalPowModularInverse
	"pow(a, -1, m) (Python 3.8+) is the INTEGER modular inverse of a modulo
	m, and pow(a, -k, m) inverts a**k -- not the float a**-k.  A base that
	shares a factor with m raises ValueError.  fractions._hash_algorithm
	depends on this; the old code returned the float a**-1, breaking
	numeric-hash consistency."

	self assert: (self eval: 'pow(3, -1, 11)') equals: 4.   "3*4 == 1 (mod 11)"
	self assert: (self eval: 'pow(1, -1, 97)') equals: 1.
	self assert: (self eval: 'pow(3, -2, 11)') equals: 5.   "inverse of 9 (mod 11)"
	"the result is an int, not a float"
	self assert: (self eval: 'isinstance(pow(1, -1, 97), int)').
	"a non-invertible base raises ValueError (caught in Python here so the
	assertion does not depend on how ValueError surfaces to Smalltalk)"
	self assert: (self eval:
'def _mi():
    try:
        pow(2, -1, 6)
        return False
    except ValueError:
        return True
_mi()')
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testUnpackNonIndexableIterable
	"Tuple-unpacking assignment iterates the RHS (CPython's __iter__
	protocol): a non-indexable iterable -- map/zip/generator -- is
	materialized in iteration order rather than indexed with __getitem__
	(which map_iterator/zip/generator do not support).  test_fractions
	test_float_format_testfile: ``lhs, rhs = map(str.strip, ...)''."

	self assert: (self eval: 'a, b = map(str, [1, 2])
a == "1" and b == "2"').
	self assert: (self eval: 'a, b, c = (x*x for x in range(3))
(a, b, c) == (0, 1, 4)').
	self assert: (self eval: 'a, b = zip([1, 2], [3, 4])
a == (1, 3) and b == (2, 4)').
	"indexable sequences still unpack unchanged"
	self assert: (self eval: 'a, b = [10, 20]
a == 10 and b == 20')
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testContainsComparesElementFirst
	"``x in obj'' compares each ELEMENT against x element-first
	(CPython PySequence_Contains: RichCompareBool(element, x, EQ)), so an
	asymmetric __eq__ on the element decides the match: ALWAYS_EQ is NOT
	found in an iterable yielding NEVER_EQ (test_iter test_in_and_not_in).
	The generic object>>__contains__ fallback previously compared
	x.__eq__(element) -- the wrong order -- and reported a spurious match.
	Uses a loaded module because the fixture defines classes."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_contains_eq_order' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_contains_eq_order.py')
		name: 'grail_contains_eq_order'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testEvalRound2Arg
	"Phase 4b: round(x, n) — varargs fast path through `_round:kw:`."

	| result |
	result := self eval: 'round(3.14159, 2)'.
	self assert: (result - 3.14) abs < 0.0001.
	result := self eval: 'round(3.14159, 0)'.
	self assert: result equals: 3.
	self assert: (self eval: 'round(3.7)') equals: 4
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testEvalPrint
	"Phase 4b: print(...) — varargs fast path through `_print:kw:`.
	Just checks the call returns Python None (the side effect on Transcript
	is exercised but not asserted)."

	self assert: (self eval: 'print(1, 2, 3)') == None.
	self assert: (self eval: 'print()') == None.
	self assert: (self eval: 'print("hello")') == None
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testPrintAsValue
	"Phase 4b: print can be used as a first-class value. The BoundMethod
	indirect-call path must fall back to the `_print:kw:` varargs form
	when no fixed-arity match is found."

	self assert: (self eval: '
f = print
f(1, 2, 3)') == None
%

category: 'Grail-Tests - Phase 4b Varargs'
method: BuiltinsTestCase
testPow3ArgAsValue
	"Phase 4b: 3-arg pow() through a first-class function value.
	Exercises BoundMethod's varargs fallback for indirect calls."

	self assert: (self eval: '
f = pow
f(2, 3, 5)') equals: 3
%

category: 'Grail-Tests - Phase 4c Arity Errors'
method: BuiltinsTestCase
testAbsWrongArityRaisesTypeError
	"Phase 4c (Phase 3 replacement): calling a fixed-arity builtin with
	the wrong number of positional arguments raises a Python TypeError
	at runtime, not a GemStone `undefined symbol` compile error."

	self should: [self eval: 'abs(1, 2)'] raise: TypeError.
	self should: [self eval: 'abs(1, 2, 3)'] raise: TypeError.
	self should: [self eval: 'abs()'] raise: TypeError
%

category: 'Grail-Tests - Phase 4c Arity Errors'
method: BuiltinsTestCase
testFixedArityWithKwargsRaisesTypeError
	"Phase 4c: passing kwargs to a fixed-arity-only builtin raises
	TypeError. There is no `_abs:kw:` varargs form, so kwargs miss
	the fast path entirely and the known-builtin error branch fires."

	self should: [self eval: 'abs(x=5)'] raise: TypeError.
	self should: [self eval: 'len(s="hi")'] raise: TypeError
%

category: 'Grail-Tests - Phase 4c Arity Errors'
method: BuiltinsTestCase
testTwoArgWrongArityRaisesTypeError
	"Phase 4c: 2-arg builtins like `divmod` raise TypeError when called
	with wrong arity. The 1-arg case has no `divmod:` method, so it
	hits the known-builtin error branch."

	self should: [self eval: 'divmod(10)'] raise: TypeError.
	self should: [self eval: 'divmod(10, 3, 1)'] raise: TypeError
%


category: 'Grail-Tests - Aggregation Functions'
method: BuiltinsTestCase
testAll
	"Test all() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(true true true).
	result := b @env1:all: lst.
	self assert: result.

	lst := list withAll: #(true false true).
	result := b @env1:all: lst.
	self deny: result.

	lst := list withAll: #().
	result := b @env1:all: lst.
	self assert: result
%

category: 'Grail-Tests - Aggregation Functions'
method: BuiltinsTestCase
testAny
	"Test any() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(false false true).
	result := b @env1:any: lst.
	self assert: result.

	lst := list withAll: #(false false false).
	result := b @env1:any: lst.
	self deny: result.

	lst := list withAll: #().
	result := b @env1:any: lst.
	self deny: result
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testBin
	"Test bin() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:bin: 5.
	self assert: result equals: '0b101'.

	result := b @env1:bin: 8.
	self assert: result equals: '0b1000'.

	result := b @env1:bin: 0.
	self assert: result equals: '0b0'
%

category: 'Grail-Tests - Introspection'
method: BuiltinsTestCase
testCallable
	"Test callable() — Phase-4 fast-path direct method dispatch.

	The first assertion uses a BoundMethod (the Phase-4 first-class
	function value for `f = abs`) as the candidate to test, since the
	new dispatch model no longer puts dispatchable callables in the
	SymbolDictionary slot."

	| b result lst boundAbs |
	b := builtins ___instance___.

	"BoundMethod for abs is callable (responds to value:value:)."
	boundAbs := BoundMethod @env1:receiver: b selector: #abs.
	result := b @env1:callable: boundAbs.
	self assert: result.

	"Regular objects are not callable"
	result := b @env1:callable: 42.
	self deny: result.

	lst := list new.
	result := b @env1:callable: lst.
	self deny: result
%

category: 'Grail-Tests - String Functions'
method: BuiltinsTestCase
testChr
	"Test chr() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:chr: 65.
	self assert: result equals: 'A'.

	result := b @env1:chr: 97.
	self assert: result equals: 'a'.

	result := b @env1:chr: 48.
	self assert: result equals: '0'
%

category: 'Grail-Tests - Math Functions'
method: BuiltinsTestCase
testDivmod
	"Test divmod() — Phase-4 fast-path direct method dispatch."

	| b result quotient remainder |
	b := builtins ___instance___.

	result := b @env1:divmod: 10 _: 3.
	quotient := result @env1:__getitem__: 0.
	remainder := result @env1:__getitem__: 1.
	self assert: quotient equals: 3.
	self assert: remainder equals: 1.

	result := b @env1:divmod: 17 _: 5.
	quotient := result @env1:__getitem__: 0.
	remainder := result @env1:__getitem__: 1.
	self assert: quotient equals: 3.
	self assert: remainder equals: 2
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testEnumerate
	"Test enumerate() — Phase-4 fast-path direct method dispatch."

	| b result lst first second |
	b := builtins ___instance___.

	lst := list withAll: #('a' 'b' 'c').
	result := b @env1:enumerate: lst.

	first := result @env1:__next__.
	self assert: (first @env1:__getitem__: 0) equals: 0.
	self assert: (first @env1:__getitem__: 1) equals: 'a'.

	second := result @env1:__next__.
	self assert: (second @env1:__getitem__: 0) equals: 1.
	self assert: (second @env1:__getitem__: 1) equals: 'b'
%

category: 'Grail-Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalAbs
	"Test abs() via Python source"

	self assert: (self eval: 'abs(5)') equals: 5.
	self assert: (self eval: 'abs(-5)') equals: 5.
	self assert: (self eval: 'abs(0)') equals: 0.
%

category: 'Grail-Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalBin
	"Test bin() via Python source"

	self assert: (self eval: 'bin(5)') equals: '0b101'.
	self assert: (self eval: 'bin(0)') equals: '0b0'.
%

category: 'Grail-Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalChr
	"Test chr() via Python source"

	self assert: (self eval: 'chr(65)') equals: 'A'.
	self assert: (self eval: 'chr(97)') equals: 'a'.
%

category: 'Grail-Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalHex
	"Test hex() via Python source"

	self assert: (self eval: 'hex(255)') equals: '0xff'.
	self assert: (self eval: 'hex(0)') equals: '0x0'.
%

category: 'Grail-Tests - Eval - Type Functions'
method: BuiltinsTestCase
testEvalLen
	"Test len() via Python source"

	self assert: (self eval: 'len("hello")') equals: 5.
	self assert: (self eval: 'len([1, 2, 3])') equals: 3.
	self assert: (self eval: 'len("")') equals: 0.
%

category: 'Grail-Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalMax
	"Test max() via Python source"

	self assert: (self eval: 'max([5, 2, 8, 1, 9])') equals: 9.
%

category: 'Grail-Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalMin
	"Test min() via Python source"

	self assert: (self eval: 'min([5, 2, 8, 1, 9])') equals: 1.
%

category: 'Grail-Tests - Eval - Numeric Functions'
method: BuiltinsTestCase
testEvalOct
	"Test oct() via Python source"

	self assert: (self eval: 'oct(8)') equals: '0o10'.
	self assert: (self eval: 'oct(0)') equals: '0o0'.
%

category: 'Grail-Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalOrd
	"Test ord() via Python source"

	self assert: (self eval: 'ord("A")') equals: 65.
	self assert: (self eval: 'ord("a")') equals: 97.
%

category: 'Grail-Tests - Eval - Math Functions'
method: BuiltinsTestCase
testEvalPow
	"Test pow() via Python source"

	self assert: (self eval: 'pow(2, 3)') equals: 8.
	self assert: (self eval: 'pow(10, 0)') equals: 1.
%

category: 'Grail-Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalRepr
	"Test repr() via Python source"

	self assert: (self eval: 'repr(42)') equals: '42'.
%

category: 'Grail-Tests - Eval - Math Functions'
method: BuiltinsTestCase
testEvalRound
	"Test round() via Python source"

	self assert: (self eval: 'round(3.7)') equals: 4.
	self assert: (self eval: 'round(3.2)') equals: 3.
%

category: 'Grail-Tests - Eval - Sequence Functions'
method: BuiltinsTestCase
testEvalSorted
	"Test sorted() via Python source"

	| result |
	result := self eval: 'sorted([3, 1, 4, 1, 5])'.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 4) equals: 5.
%

category: 'Grail-Tests - Eval - Sequence Functions'
method: BuiltinsTestCase
testSortedReturnsList
	"Regression: sorted() must return a Python list, not a Smalltalk Array.
	builtins>>sorted: builds a list but returned `lst sort:`, and GemStone's
	OrderedCollection>>sort: yields a FRESH Array, so the list was discarded.
	An Array is not a list: isinstance/type checks fail, value equality against
	a list literal is False (Python sequence equality is type-aware), and
	list-only methods like append are unavailable."

	self assert: (self eval: 'type(sorted([3, 1, 2])) is list') equals: true.
	self assert: (self eval: 'isinstance(sorted([3, 1, 2]), list)') equals: true.
	self assert: (self eval: 'sorted([3, 1, 2]) == [1, 2, 3]') equals: true.
	"list-only behaviour must work on the result"
	self assert: (self eval: '
x = sorted([3, 1, 2])
x.append(4)
x == [1, 2, 3, 4]
') equals: true.
%

category: 'Grail-Tests - Eval - Sequence Functions'
method: BuiltinsTestCase
testSortedWithKwargsReturnsList
	"Same regression for the varargs path builtins>>_sorted:kw: (key=/reverse=),
	which Jinja2's compiler exercises via sorted(..., key=...)."

	self assert: (self eval: 'type(sorted([3, 1, 2], reverse=True)) is list') equals: true.
	self assert: (self eval: 'sorted([3, 1, 2], reverse=True) == [3, 2, 1]') equals: true.
	self assert: (self eval: 'sorted([-2, 1, -3], key=abs) == [1, -2, -3]') equals: true.
%

category: 'Grail-Tests - Eval - String Functions'
method: BuiltinsTestCase
testEvalStr
	"Test str() via Python source"

	self assert: (self eval: 'str(42)') equals: '42'.
	self assert: (self eval: 'str(True)') equals: 'True'.
%

category: 'Grail-Tests - Eval - Aggregation Functions'
method: BuiltinsTestCase
testEvalSum
	"Test sum() via Python source"

	self assert: (self eval: 'sum([1, 2, 3, 4, 5])') equals: 15.
	self assert: (self eval: 'sum([])') equals: 0.
%

category: 'Grail-Tests - Type Functions'
method: BuiltinsTestCase
testHash
	"Test hash() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:hash: 42.
	self assert: (result isKindOf: Integer).

	result := b @env1:hash: 'hello'.
	self assert: (result isKindOf: Integer)
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testHex
	"Test hex() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:hex: 255.
	self assert: result equals: '0xff'.

	result := b @env1:hex: 16.
	self assert: result equals: '0x10'.

	result := b @env1:hex: 0.
	self assert: result equals: '0x0'
%

category: 'Grail-Tests - Introspection'
method: BuiltinsTestCase
testId
	"Test id() — Phase-4 fast-path direct method dispatch."

	| b obj1 obj2 id1 id2 |
	b := builtins ___instance___.

	obj1 := list new.
	obj2 := list new.

	id1 := b @env1:id: obj1.
	id2 := b @env1:id: obj2.

	self assert: (id1 isKindOf: Integer).
	self assert: (id2 isKindOf: Integer).
	self deny: id1 == id2
%

category: 'Grail-Tests - Type Checking'
method: BuiltinsTestCase
testIsinstance
	"Test isinstance() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	result := b @env1:isinstance: 42 _: int.
	self assert: result.

	result := b @env1:isinstance: 'hello' _: str.
	self assert: result.

	lst := list new.
	result := b @env1:isinstance: lst _: list.
	self assert: result.

	result := b @env1:isinstance: 42 _: str.
	self deny: result
%

category: 'Grail-Tests - Type Functions'
method: BuiltinsTestCase
testLen
	"Test len() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	result := b @env1:len: 'hello'.
	self assert: result equals: 5.

	lst := list new.
	lst @env1:append: 1.
	lst @env1:append: 2.
	lst @env1:append: 3.
	result := b @env1:len: lst.
	self assert: result equals: 3
%

category: 'Grail-Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	| b |
	b := builtins ___instance___.

	self should: [b @env1:len: 42] raise: TypeError
%

category: 'Grail-Tests - Aggregation Functions'
method: BuiltinsTestCase
testMax
	"Test max() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(5 2 8 1 9).
	result := b @env1:max: lst.
	self assert: result equals: 9.

	lst := list withAll: #(-5 -2 -8).
	result := b @env1:max: lst.
	self assert: result equals: -2
%

category: 'Grail-Tests - Aggregation Functions'
method: BuiltinsTestCase
testMin
	"Test min() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(5 2 8 1 9).
	result := b @env1:min: lst.
	self assert: result equals: 1.

	lst := list withAll: #(-5 -2 -8).
	result := b @env1:min: lst.
	self assert: result equals: -8
%

category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testOct
	"Test oct() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:oct: 8.
	self assert: result equals: '0o10'.

	result := b @env1:oct: 64.
	self assert: result equals: '0o100'.

	result := b @env1:oct: 0.
	self assert: result equals: '0o0'
%

category: 'Grail-Tests - String Functions'
method: BuiltinsTestCase
testOrd
	"Test ord() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:ord: 'A'.
	self assert: result equals: 65.

	result := b @env1:ord: 'a'.
	self assert: result equals: 97.

	result := b @env1:ord: '0'.
	self assert: result equals: 48
%

category: 'Grail-Tests - String Functions'
method: BuiltinsTestCase
testOrdTypeError
	"Test that ord() raises TypeError for strings with length != 1"

	| b |
	b := builtins ___instance___.

	self should: [b @env1:ord: 'hello'] raise: TypeError.
	self should: [b @env1:ord: ''] raise: TypeError
%

category: 'Grail-Tests - Math Functions'
method: BuiltinsTestCase
testPow
	"Test pow() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:pow: 2 _: 3.
	self assert: result equals: 8.

	result := b @env1:pow: 5 _: 2.
	self assert: result equals: 25.

	result := b @env1:pow: 10 _: 0.
	self assert: result equals: 1
%

category: 'Grail-Tests - Math Functions'
method: BuiltinsTestCase
testPowWithModulo
	"Test pow(x, y, z) — Phase-4 varargs fast-path implementation."

	| b result |
	b := builtins ___instance___.

	result := b @env1:_pow: #(2 3 5) kw: nil.
	self assert: result equals: 3.

	result := b @env1:_pow: #(10 2 7) kw: nil.
	self assert: result equals: 2
%

category: 'Grail-Tests - System Functions'
method: BuiltinsTestCase
testExit
	"Test exit() — Phase-4 varargs fast-path alias for quit(). The
	implementation lives at `builtins>>_exit:kw:`. In CPython both quit
	and exit come from site.py as instances of `_sitebuiltins.Quitter`."

	| b exitMethod |
	b := builtins ___instance___.
	exitMethod := BoundMethod @env1:receiver: b selector: #exit.
	self assert: exitMethod notNil.
	self assert: (b @env1:callable: exitMethod)
%

category: 'Grail-Tests - System Functions'
method: BuiltinsTestCase
testQuit
	"Test quit() — Phase-4 varargs fast-path. The implementation lives at
	`builtins>>_quit:kw:`. The unary `quit` getter is gone in Phase 4c;
	to obtain a first-class value for `quit`, use a BoundMethod."

	| b quitMethod |
	b := builtins ___instance___.
	"BoundMethod for quit is callable (responds to value:value:)."
	quitMethod := BoundMethod @env1:receiver: b selector: #quit.
	self assert: quitMethod notNil.
	self assert: (b @env1:callable: quitMethod)
%

category: 'Grail-Tests - String Functions'
method: BuiltinsTestCase
testRepr
	"Test repr() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:repr: 'hello'.
	self assert: (result includesString: 'hello').

	result := b @env1:repr: 42.
	self assert: result equals: '42'
%

category: 'Grail-Tests - Math Functions'
method: BuiltinsTestCase
testRound
	"Test round() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:round: 3.7.
	self assert: result equals: 4.

	result := b @env1:round: 3.2.
	self assert: result equals: 3.

	result := b @env1:round: -2.8.
	self assert: result equals: -3
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testMap
	"map(func, iter) — applies func to each element of iter and
	returns a LAZY iterator (CPython semantics; the former eager list
	looped to OOM on infinite sources).  Materialize through the
	iterator protocol to check the values.  The callable is invoked
	Python-style: `value: positionalArray value: kwargs`, so the block
	destructures the positional array."

	| b result doubler materialized done |
	b := builtins ___instance___.
	doubler := [:positional :_kw | (positional at: 1) @env1:__mul__: 2].
	result := b @env1:map: doubler _: (list withAll: #(1 2 3)).
	materialized := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[materialized add: (result @env1:__next__)]
			on: StopIteration do: [:ex | done := true]].
	self assert: materialized asArray equals: #(2 4 6)
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testIterCallableSentinel
	"iter(callable, sentinel) — the two-argument form — returns a
	callable_iterator that calls callable() on each next() and stops
	(StopIteration) once a returned value equals (Python ==) the sentinel.
	The callable here is a Smalltalk block (an ExecBlock is callable and
	answers value:value:) closing over a counter; sentinel 3 stops after
	0, 1, 2.  Exhaustion is latched — a spent iterator keeps raising
	StopIteration without calling the callable again."

	| b counter it materialized done |
	b := builtins ___instance___.
	counter := 0.
	it := b @env1:iter: [:positional :_kw | | v | v := counter. counter := counter @env0:+ 1. v]
		_: 3.
	materialized := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[materialized add: (it @env1:__next__)]
			on: StopIteration do: [:ex | done := true]].
	self assert: materialized asArray equals: #(0 1 2).
	"Latched: still StopIteration, callable NOT called again (counter frozen)."
	self should: [it @env1:__next__] raise: StopIteration.
	self assert: counter equals: 4.
	"A non-callable first argument raises TypeError (like CPython)."
	self should: [b @env1:iter: 42 _: 3] raise: TypeError
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testIterReturnedNonIterator
	"iter(x) where x.__iter__() returns a non-iterator (an object with no
	real __next__) raises TypeError, matching CPython's PyObject_GetIter
	(test_iter's test_new_style_iter_class).  PythonInstance carries a
	catchable-TypeError __next__ FALLBACK on every instance, so a plain
	responds-to check would wrongly accept ``IterClass`` as an iterator;
	the fix asks ___hasProtocol___: whether __next__ is defined BELOW that
	fallback level.  A class that DOES define __next__ iterates normally.
	Uses a loaded module (not inline eval:) because the fixture defines
	classes."

	| mods mod |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_noniterator' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_noniterator.py')
		name: 'grail_noniterator'.
	self assert: (mod @env1:check)
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testIterTypeObjectNotIterable
	"iter(x) on a TYPE object (iter(list), iter(int)) raises
	``TypeError: 'type' object is not iterable'', matching CPython.  The
	type's class is a metaclass, so the ``not iterable'' fallback must
	report 'type' rather than crash sending env-1 __name__ to a kernel
	metaclass (test_iter's test_builtin_list/tuple/filter do
	assertRaises(TypeError, list, list))."

	| msg |
	self should: [self eval: 'iter(list)'] raise: TypeError.
	self should: [self eval: 'iter(int)'] raise: TypeError.
	self should: [self eval: 'list(list)'] raise: TypeError.
	self should: [self eval: 'tuple(str)'] raise: TypeError.
	"The message names the metaclass as 'type', as CPython does."
	msg := [self eval: 'iter(list)'. nil]
		on: TypeError
		do: [:ex | ex return: ex messageText].
	self assert: (msg includesString: '''type'' object is not iterable')
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testMemoryviewStub
	"memoryview(b) is a Grail stub that returns its argument unchanged
	(see builtins.gs for the rationale).  re/_compiler.py compiles
	successfully because the bare name resolves; the stub is fine for
	any pattern that doesn't hit `_bytes_to_codes`.  When that path
	matters, replace this stub with a real memoryview class and tighten
	the assertions accordingly."

	| b bytes result |
	b := builtins ___instance___.
	bytes := ByteArray withAll: #(1 2 3 4).
	result := b @env1:memoryview: bytes.
	self assert: result == bytes
%

category: 'Tests - Sequence Functions'
method: BuiltinsTestCase
testSorted
	"Test sorted() — Phase-4 fast-path direct method dispatch.
	Returns a new sorted list, leaving the original unchanged."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(3 1 4 1 5 9 2 6).
	result := b @env1:sorted: lst.

	"Verify the result is sorted"
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2.
	self assert: result size equals: 8.

	"Verify the original list is unchanged"
	self assert: (lst @env1:__getitem__: 0) equals: 3.
	self assert: (lst @env1:__getitem__: 1) equals: 1.
	self assert: (lst @env1:__getitem__: 2) equals: 4.
	self assert: lst size equals: 8
%

category: 'Grail-Tests - String Functions'
method: BuiltinsTestCase
testStr
	"Test str() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:str: 42.
	self assert: result equals: '42'.

	result := b @env1:str: 'hello'.
	self assert: result equals: 'hello'
%

category: 'Grail-Tests - Aggregation Functions'
method: BuiltinsTestCase
testSum
	"Test sum() — Phase-4 fast-path direct method dispatch."

	| b result lst |
	b := builtins ___instance___.

	lst := list withAll: #(1 2 3 4 5).
	result := b @env1:sum: lst.
	self assert: result equals: 15.

	lst := list withAll: #().
	result := b @env1:sum: lst.
	self assert: result equals: 0
%

category: 'Grail-Tests - Type Functions'
method: BuiltinsTestCase
testType
	"Test type() — Phase-4 fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:type: 42.
	self assert: (42 isKindOf: result).

	result := b @env1:type: 'hello'.
	self assert: ('hello' isKindOf: result).

	result := b @env1:type: list new.
	self assert: (list new isKindOf: result)
%

category: 'Grail-Tests - Sequence Functions'
method: BuiltinsTestCase
testZip
	"Test zip() — Phase-4 varargs fast-path direct method dispatch.
	The new method takes individual iterables as positional args, matching
	standard Python `zip(a, b)` semantics."

	| b result lst1 lst2 first |
	b := builtins ___instance___.

	lst1 := list withAll: #(1 2 3).
	lst2 := list withAll: #('a' 'b' 'c').

	result := b @env1:_zip: { lst1. lst2 } kw: nil.

	first := result @env1:__next__.
	self assert: (first @env1:__getitem__: 0) equals: 1.
	self assert: (first @env1:__getitem__: 1) equals: 'a'
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalArithmeticExpression
	"Python eval() evaluates a single expression and returns its value."

	self assert: (self eval: 'eval("1 + 2")') equals: 3.
	self assert: (self eval: 'eval("10 * 4")') equals: 40.
	self assert: (self eval: 'eval("\"hi\" + \"!\"")') equals: 'hi!'
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalWithGlobals
	"eval() reads names from the supplied globals dict."

	self assert: (self eval: 'eval("x * 2", {"x": 5})') equals: 10.
	self assert: (self eval: 'eval("a + b", {"a": 7, "b": 8})') equals: 15
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalReturnsNotNone
	"Distinguishes from exec: eval returns the value, not None."

	self deny: (self eval: 'eval("1 + 2")') == None.
	"By contrast exec returns None."
	self assert: (self eval: 'exec("y = 1 + 2")') == None
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalRejectsAssignment
	"Python's eval() requires an expression; assignment statements
	raise SyntaxError."

	self should: [self eval: 'eval("x = 1")'] raise: SyntaxError
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalRejectsMultipleStatements
	"Two statements separated by a newline are not a single
	expression — eval() rejects this where exec() would accept."

	| src |
	src := 'eval("1\n2")'.
	self should: [self eval: src] raise: SyntaxError
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalWalrusReflectsBack
	"A walrus inside the expression binds in the supplied globals
	mapping (mirrors what exec() does for ordinary assignments)."

	| evalSrc outcome |
	evalSrc := 'g = {}
result = eval("(captured := 99)", g)
[result, g["captured"]]'.
	outcome := self eval: evalSrc.
	self assert: (outcome @env1:__getitem__: 0) equals: 99.
	self assert: (outcome @env1:__getitem__: 1) equals: 99
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalReadsCallerLocals
	"A bare eval(expr) inside a FUNCTION (no explicit globals/locals) reads
	the enclosing function's locals -- CPython evaluates in the caller's
	namespace.  Regression for test_bytes BytearrayPEP3137Test.
	test_returns_new_copy (``eval('val.split()[0]')'' in a method); the empty
	eval scope previously raised ``undefined symbol''."

	self assert: (self eval: '
def f():
    val = 42
    return eval("val + 1")
f()') equals: 43
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testEvalCallerLocalShadows
	"The injected locals win: a bare in-function eval resolves a name to the
	enclosing LOCAL, even when a module global of the same name exists."

	self assert: (self eval: '
Z = 1
def h():
    Z = 2
    return eval("Z")
h()') equals: 2
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testExecReadsCallerLocals
	"exec(src) inside a function likewise sees the enclosing locals (sibling
	of eval); a mutation of an in-scope mutable persists through its identity."

	self assert: (self eval: '
def f():
    val = 7
    holder = []
    exec("holder.append(val * 3)")
    return holder[0]
f()') equals: 21
%

category: 'Grail-Tests - Eval and Exec'
method: BuiltinsTestCase
testModuleAstEvaluateExpressionSource
	"Class-side helper used by the eval() builtin — direct AST entry
	point.  Useful for callers that want the eval() semantics
	without going through the Python builtin dispatch."

	self assert: (ModuleAst evaluateExpressionSource: '1 + 2') equals: 3.
	self assert: (ModuleAst evaluateExpressionSource: '"hello"') equals: 'hello'.
	self should: [ModuleAst evaluateExpressionSource: 'x = 1'] raise: SyntaxError
%

category: 'Grail-Tests - Introspection'
method: BuiltinsTestCase
testClassQualname
	"cls.__qualname__ answers the class name (Grail tracks no lexical
	nesting).  CPython error messages interpolate it -- textwrap.dedent's
	type check reads type(x).__qualname__."

	"type(0) is now int (Integer), not the concrete SmallInteger -- see
	int>>__class__.  __qualname__ reports the Python name ('int') via the
	built-in-type name mapping in object class>>__qualname__."
	self assert: (self eval: 'type(0).__qualname__') equals: 'int'.
	self assert: (self eval: 'type("s").__qualname__ == type("s").__name__')
%

category: 'Grail-Tests - Type Checks'
method: BuiltinsTestCase
testIntegerTypeIsInt
	"``type(n) is int'' holds for every integer, whatever GemStone's
	concrete storage class (SmallInteger vs LargeInteger); bool is a
	separate type.  Regression for int>>__class__."

	self assert: (self eval: 'type(5) is int').
	self assert: (self eval: 'type(10**40) is int').
	self assert: (self eval: 'type(-10**40) is int').
	self assert: (self eval: 'type(True) is bool').
	self assert: (self eval: 'type(True) is not int')
%

category: 'Grail-Tests - Type Checks'
method: BuiltinsTestCase
testFloatTypeIsFloat
	"``type(x) is float'' holds for every float, whatever GemStone's
	concrete representation (immediate SmallDouble vs heap Float);
	isinstance is unaffected.  Regression for float>>__class__ (mirrors
	int>>__class__), which test_math test_prod's type-preservation checks
	(``type(prod([1, 2.0, ...])) == float'') depend on."

	self assert: (self eval: 'type(5.0) is float').
	self assert: (self eval: 'type(0.1) is float').
	self assert: (self eval: 'type(-1e308 * 10) is float').
	self assert: (self eval: 'type(1.0 + 2) is float').
	self assert: (self eval: 'isinstance(5.0, float)').
	self assert: (self eval: 'type(5.0) is not int')
%

category: 'Grail-Tests - Type Checks'
method: BuiltinsTestCase
testIsinstanceStrAcceptsWideStrings
	"Every text string class counts as str (CPython: all text IS str).
	str maps to Unicode7 for construction, but wide literals come back
	Unicode16/DoubleByteString and GemStone APIs hand back String --
	without the CharacterCollection widening, re.compile rejected
	Cyrillic patterns (test_re test_word_boundaries)."

	self assert: (self eval: 'isinstance("ьюя", str)') equals: true.
	self assert: (builtins ___instance___ @env1:isinstance: 'plain' _: (Python at: #str)) equals: true.
	self assert: (self eval: 'isinstance(b"x", str)') equals: false.
	self assert: (self eval: 'issubclass(type("ь"), str)') equals: true
%

category: 'Grail-Tests - Conversions'
method: BuiltinsTestCase
testChrLoneSurrogateRaisesValueError
	"DELIBERATE DEVIATION: CPython chr() accepts lone surrogates, but a
	GemStone string cannot hold one -- downstream construction died
	UNCATCHABLY ('codePoint not valid for Unicode', killing the whole
	test_re run in test_bigcharset).  chr() raises catchable ValueError
	at the source instead."

	self should: [self eval: 'chr(0xD800)'] raise: ValueError.
	self should: [self eval: 'chr(0xDFFF)'] raise: ValueError.
	self assert: (self eval: 'ord(chr(0xD7FF))') equals: 16rD7FF.
	self assert: (self eval: 'ord(chr(0xE000))') equals: 16rE000
%

category: 'Grail-Tests - Iteration'
method: BuiltinsTestCase
testEnumerateStart
	"enumerate(iterable, start) — the 2-positional and start= keyword
	forms, not just the 1-arg fast path (enum.py and many stdlib callers
	pass an explicit start)."

	self assert: (self eval: 'list(enumerate(["a","b","c"]))') @env1:__repr__
		equals: '[(0, ''a''), (1, ''b''), (2, ''c'')]'.
	self assert: (self eval: 'list(enumerate(["a","b","c"], 5))') @env1:__repr__
		equals: '[(5, ''a''), (6, ''b''), (7, ''c'')]'.
	self assert: (self eval: 'list(enumerate(["a","b"], start=10))') @env1:__repr__
		equals: '[(10, ''a''), (11, ''b'')]'
%

category: 'Grail-Tests - Namespace'
method: BuiltinsTestCase
testBuiltinTypesInBuiltinsNamespace
	"CPython's builtins module contains every builtin TYPE, so ``builtins.int``
	/ ``builtins.slice`` resolve to the type (identical to the bare name), show
	up in vars()/dir(builtins) rather than only lazily on getattr, and stay
	callable with constructor semantics.  Grail eagerly populates the builtins
	namespace with these type classes in builtins>>initialize.  (Builtin
	FUNCTIONS -- len, abs -- already answer via the builtins method path and are
	not part of this population; the type classes were the gap.)"

	"getattr resolves to the type.  For the types Grail resolves as a class both
	ways, builtins.T is the bare name T.  (str/bytes are NOT asserted with `is`:
	the bare name routes through a constructor fast-path -- a BoundMethod -- so
	`builtins.str is str` is False in Grail even though both denote the str type.
	isinstance below pins builtins.str to the real type instead.)"
	self assert: (self eval: '__import__("builtins").int is int') equals: true.
	self assert: (self eval: '__import__("builtins").list is list') equals: true.
	self assert: (self eval: '__import__("builtins").dict is dict') equals: true.
	self assert: (self eval: '__import__("builtins").slice is type(slice(1, 2, 3))')
		equals: true.
	self assert: (self eval: 'isinstance("hi", __import__("builtins").str)') equals: true.
	self assert: (self eval: 'isinstance(1, __import__("builtins").int)') equals: true.

	"Present in the module namespace, not just lazily materialized on access."
	self assert: (self eval: '"int" in vars(__import__("builtins"))') equals: true.
	self assert: (self eval: '"slice" in dir(__import__("builtins"))') equals: true.

	"Callable through the builtins attribute, with Python constructor semantics."
	self assert: (self eval: '__import__("builtins").int("42")') equals: 42.
	self assert: (self eval: '__import__("builtins").str(5) == "5"') equals: true.

	"A name Grail implements as a builtin FUNCTION (not a class) is absent from
	the type population but still answers via the function path."
	self assert: (self eval: 'list(__import__("builtins").map(abs, [-1, -2]))') @env1:__repr__
		equals: '[1, 2]'
%

category: 'Grail-Tests - Namespace'
method: BuiltinsTestCase
testBuiltinTypeModuleIsBuiltins
	"CPython reports ``int.__module__ == 'builtins''' for every builtin TYPE.
	Grail answers 'builtins' for both kinds of builtin type: kernel-backed
	(int/list/dict/str/object, via ___pythonBuiltinTypeName___) and Grail-defined
	(tuple/set/frozenset/complex/type/slice/..., matched by identity in the
	Python compile dictionary).  builtins.int.__module__ agrees."
	self assert: (self eval: 'int.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'list.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'dict.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'str.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'object.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'tuple.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'set.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'type.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'slice.__module__ == "builtins"') equals: true.
	self assert: (self eval: '__import__("builtins").int.__module__ == "builtins"')
		equals: true.

	"Regression guard: a dynamically created class MUST NOT be tagged 'builtins'
	-- an unconditional object class>>__module__ = 'builtins' broke functional-API
	enum pickling (the class could not be located in the builtins module).  The
	guard answers nil for these, so they fall through and keep their own module."
	self assert: (self eval:
		'getattr(type("X", (object,), {}), "__module__", "x") != "builtins"')
		equals: true.
	self assert: (self eval:
		'getattr(__import__("enum").Enum("E", ["A"]), "__module__", "x") != "builtins"')
		equals: true
%

category: 'Grail-Tests - Namespace'
method: BuiltinsTestCase
testBuiltinExceptionsInBuiltinsNamespace
	"CPython's builtins module contains the whole builtin exception hierarchy, so
	``builtins.ValueError`` resolves to the exception class (identical to the bare
	name), shows up in vars()/dir(builtins), preserves the subclass hierarchy, and
	reports __module__ == 'builtins'.  builtins>>initialize populates them from the
	curated object>>___pythonBuiltinExceptionNames___ list; non-builtin exceptions
	that share the Python compile dict (StatisticsError->statistics etc.) are
	excluded."
	self assert: (self eval: '__import__("builtins").ValueError is ValueError')
		equals: true.
	self assert: (self eval: '__import__("builtins").BaseException is BaseException')
		equals: true.
	self assert: (self eval: '__import__("builtins").OSError is OSError') equals: true.

	"Subclass hierarchy is preserved through the namespace."
	self assert: (self eval: 'issubclass(__import__("builtins").KeyError, LookupError)')
		equals: true.
	self assert: (self eval: 'issubclass(__import__("builtins").ValueError, Exception)')
		equals: true.

	"Present in the module namespace, not just lazily materialized on access."
	self assert: (self eval: '"ValueError" in vars(__import__("builtins"))') equals: true.
	self assert: (self eval: '"OSError" in dir(__import__("builtins"))') equals: true.

	"Builtin exceptions report __module__ == 'builtins' (matching CPython)."
	self assert: (self eval: 'ValueError.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'BaseException.__module__ == "builtins"') equals: true.
	self assert: (self eval: 'OSError.__module__ == "builtins"') equals: true.

	"A non-builtin exception that lives in the Python dict is NOT exposed in
	builtins and is NOT tagged 'builtins'."
	self assert: (self eval: '"StatisticsError" in dir(__import__("builtins"))')
		equals: false.

	"A user exception subclass keeps its own module, never 'builtins'."
	self assert: (self eval:
		'getattr(type("MyErr", (ValueError,), {}), "__module__", "x") != "builtins"')
		equals: true
%

category: 'Grail-Tests - Namespace'
method: BuiltinsTestCase
testBuiltinConstantsInBuiltinsNamespace
	"CPython's builtins module contains the constants None / True / False /
	NotImplemented / Ellipsis / __debug__.  builtins>>initialize populates them
	so getattr resolves each to the same singleton as the bare name and they
	appear in vars()/dir(builtins).  (None / True / False are keywords, so the
	`.attr` form is a syntax error -- getattr is the only way to read them.)"
	self assert: (self eval: 'getattr(__import__("builtins"), "None") is None')
		equals: true.
	self assert: (self eval: 'getattr(__import__("builtins"), "True") is True')
		equals: true.
	self assert: (self eval: 'getattr(__import__("builtins"), "False") is False')
		equals: true.
	self assert: (self eval:
		'getattr(__import__("builtins"), "NotImplemented") is NotImplemented')
		equals: true.
	self assert: (self eval: 'getattr(__import__("builtins"), "Ellipsis") is Ellipsis')
		equals: true.
	self assert: (self eval: 'getattr(__import__("builtins"), "__debug__") == True')
		equals: true.

	"Present in the module namespace, not just lazily materialized on access."
	self assert: (self eval: '"None" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"NotImplemented" in vars(__import__("builtins"))')
		equals: true
%

category: 'Grail-Tests - Namespace'
method: BuiltinsTestCase
testBuiltinFunctionsInDir
	"dir(builtins) lists every builtin FUNCTION under its Python name.  The
	varargs builtins are filed as ``_name:kw:`` selectors; builtins>>__dir__
	rewrites those (``_print`` -> ``print``, ``___import__`` -> ``__import__``)
	so the clean names appear and the mangled underscore forms do not.  Fixed-arity
	builtins (abs / len) already listed correctly are unaffected, and getattr keeps
	resolving every name."

	"Varargs builtins now appear under their Python name (were mangled/absent)."
	self assert: (self eval: '"print" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"eval" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"exec" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"compile" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"zip" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"input" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"__import__" in dir(__import__("builtins"))') equals: true.

	"The internal underscore-dispatch forms are NOT surfaced."
	self assert: (self eval: '"_print" in dir(__import__("builtins"))') equals: false.
	self assert: (self eval: '"_zip" in dir(__import__("builtins"))') equals: false.
	self assert: (self eval: '"__reload__" in dir(__import__("builtins"))') equals: false.

	"Fixed-arity builtins still listed; getattr still resolves the clean names."
	self assert: (self eval: '"abs" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: '"len" in dir(__import__("builtins"))') equals: true.
	self assert: (self eval: 'hasattr(__import__("builtins"), "print")') equals: true.
	self assert: (self eval: 'hasattr(__import__("builtins"), "zip")') equals: true
%
