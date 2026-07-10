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
	returns a list (Grail materializes eagerly; CPython returns a
	lazy iterator).  The callable is invoked Python-style:
	`value: positionalArray value: kwargs`, so the block destructures
	the positional array."

	| b result doubler |
	b := builtins ___instance___.
	doubler := [:positional :_kw | (positional @env0:at: 1) @env1:__mul__: 2].
	result := b @env1:map: doubler _: (list @env0:withAll: #(1 2 3)).
	self assert: (result @env1:__getitem__: 0) equals: 2.
	self assert: (result @env1:__getitem__: 1) equals: 4.
	self assert: (result @env1:__getitem__: 2) equals: 6.
	self assert: result size equals: 3
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
	bytes := ByteArray @env0:withAll: #(1 2 3 4).
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

	self assert: (self eval: 'type(0).__qualname__') equals: 'SmallInteger'.
	self assert: (self eval: 'type("s").__qualname__ == type("s").__name__')
%
