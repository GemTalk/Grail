! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassCallFastPathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassCallFastPathTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassCallFastPathTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassCallFastPathTestCase - Tests for the class-call fast path in CallAst
! ===============================================================================
! Covers `bool(x)`, `int(x)`, `float(x)`, `object()`, etc. — bare-name calls
! whose function position resolves to a GemStone class via the Python
! dictionary. The fast path emits `(cls @env1:__new__: arg ...)` instead of
! the legacy `cls value: { args } value: nil` form (which signals
! MessageNotUnderstood on plain GemStone classes).
!
! Tests are organized in four groups:
!   * Discriminators — unit tests for the helper class methods.
!   * Codegen        — verify the emitted Smalltalk source for each shape.
!   * Runtime        — end-to-end via `self eval:` (parse → emit → execute).
!   * Negative       — arity mismatch raises TypeError; shadowed names skip
!                      the fast path; non-class names fall through.
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ClassCallFastPathTestCase removeAllMethods: 0.
ClassCallFastPathTestCase class removeAllMethods: 0.
%

set compile_env: 0

! ===============================================================================
! Helpers
! ===============================================================================

category: 'Grail-Helpers'
method: ClassCallFastPathTestCase
generatedSourceFor: pythonExpression
	"Parse `pythonExpression` (a single Python expression statement),
	walk to the CallAst, and return the Smalltalk source that
	`printSmalltalkOn:` emits for it. Used by codegen tests so they can
	assert against the exact emitted form."

	| modAst stmts callAst sb |
	modAst := ModuleAst parseSource: pythonExpression , (String with: Character lf).
	"BlockAst's `body` instVar is the statement list (no public getter)."
	stmts := modAst body @env0:instVarAt:
		(modAst body class @env0:allInstVarNames @env0:indexOf: #'body').
	"First statement is an ExprAst-like wrapper; its `value` is the call."
	callAst := stmts first @env0:value.
	sb := WriteStream on: String new.
	callAst printSmalltalkOn: sb.
	^ sb contents
%

! ===============================================================================
! Discriminator unit tests
! ===============================================================================

category: 'Grail-Tests - Discriminators'
method: ClassCallFastPathTestCase
testResolveClassForNameMapsToGemStoneClass
	"`Python at: #bool` resolves to Boolean; `int` to Integer; `object`
	to Object. resolveClassForName: returns these classes for the
	class-call fast path discriminator."

	self assert: (CallAst resolveClassForName: #bool) equals: Boolean.
	self assert: (CallAst resolveClassForName: #int) equals: Integer.
	self assert: (CallAst resolveClassForName: #float) equals: Float.
	self assert: (CallAst resolveClassForName: #object) equals: Object
%

category: 'Grail-Tests - Discriminators'
method: ClassCallFastPathTestCase
testResolveClassForNameRejectsModuleSubclasses
	"Module subclasses (`builtins`, `math`, etc.) have their own dispatch
	paths and must NOT be returned as class-call candidates — otherwise
	`math(x)` would shadow the module-call fast path."

	self assert: (CallAst resolveClassForName: #builtins) equals: nil.
	self assert: (CallAst resolveClassForName: #math) equals: nil
%

category: 'Grail-Tests - Discriminators'
method: ClassCallFastPathTestCase
testResolveClassForNameReturnsNilForNonClassEntries
	"`Python at: #True` is the boolean `true` (not a class); `None` is
	`nil`; an unknown name is absent. All return nil."

	self assert: (CallAst resolveClassForName: #True) equals: nil.
	self assert: (CallAst resolveClassForName: #None) equals: nil.
	self assert: (CallAst resolveClassForName: #thisNameDoesNotExist) equals: nil
%

category: 'Grail-Tests - Discriminators'
method: ClassCallFastPathTestCase
testClassNewSelectorForArity
	"Selector convention: 0 args → #__new__, 1 arg → #__new__:,
	N args → #__new__: with (N-1) trailing `_:` keywords."

	self assert: (CallAst classNewSelectorForArity: 0) equals: #__new__.
	self assert: (CallAst classNewSelectorForArity: 1) equals: #'__new__:'.
	self assert: (CallAst classNewSelectorForArity: 2) equals: #'__new__:_:'.
	self assert: (CallAst classNewSelectorForArity: 3) equals: #'__new__:_:_:'
%

! ===============================================================================
! Codegen output tests
! ===============================================================================

category: 'Grail-Tests - Codegen'
method: ClassCallFastPathTestCase
testCodegenBoolOneArg
	"`bool(1)` emits `(bool @env1:__new__: arg)` because Boolean has a
	class-side `__new__: obj` in env 1."

	| src |
	src := self generatedSourceFor: 'bool(1)'.
	self assert: (src includesString: 'bool @env1:__new__: ').
	self deny: (src includesString: 'value: { ').
	self deny: (src includesString: 'value: nil')
%

category: 'Grail-Tests - Codegen'
method: ClassCallFastPathTestCase
testCodegenObjectZeroArg
	"`object()` emits the no-colon form `(object @env1:__new__)`."

	| src |
	src := self generatedSourceFor: 'object()'.
	self assert: (src includesString: 'object @env1:__new__').
	self deny: (src includesString: '__new__:')
%

category: 'Grail-Tests - Codegen'
method: ClassCallFastPathTestCase
testCodegenIntTwoArg
	"int( ff , 16) emits (int @env1:__new__: 'ff' _: 16) because
	Integer has class-side `__new__: obj _: base` in env 1."

	| src |
	src := self generatedSourceFor: 'int("ff", 16)'.
	self assert: (src includesString: 'int @env1:__new__: ').
	self assert: (src includesString: ' _: ')
%

category: 'Grail-Tests - Codegen'
method: ClassCallFastPathTestCase
testCodegenStrStillUsesBuiltinsFastPath
	"`str(42)` must keep going through the builtins instance fast path
	(builtins has `str: anObject` defined). The class-call fast path
	must not steal this case — builtins fast path takes precedence."

	| src |
	src := self generatedSourceFor: 'str(42)'.
	self assert: (src includesString: '#builtins) instance').
	self assert: (src includesString: 'str: ').
	self deny: (src includesString: '@env1:__new__')
%

category: 'Grail-Tests - Codegen'
method: ClassCallFastPathTestCase
testCodegenArityMismatchEmitsTypeError
	"`bool(1, 2)` has no matching `__new__:_:` on Boolean, so the codegen
	emits a TypeError-raising expression instead of falling through to
	the broken legacy `bool value: { ... } value: nil` form."

	| src |
	src := self generatedSourceFor: 'bool(1, 2)'.
	self assert: (src includesString: 'TypeError ___signal___:').
	self assert: (src includesString: 'bool()').
	self deny: (src includesString: 'value: { ')
%

! ===============================================================================
! End-to-end runtime tests
! ===============================================================================

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalBoolOfTruthyValues
	"bool(x) for truthy values returns True."

	self assert: (self eval: 'bool(1)') equals: true.
	self assert: (self eval: 'bool("x")') equals: true.
	self assert: (self eval: 'bool(42)') equals: true
%

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalBoolOfFalsyValues
	"bool(x) for falsy values returns False."

	self assert: (self eval: 'bool(0)') equals: false.
	self assert: (self eval: 'bool("")') equals: false
%

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalIntOfStringDecimal
	"int('123') parses the decimal string and returns 123."

	self assert: (self eval: 'int("123")') equals: 123.
	self assert: (self eval: 'int("0")') equals: 0
%

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalFloatOfString
	"float('3.14') parses the string and returns the float."

	self assert: ((self eval: 'float("3.14")') - 3.14) abs < 0.0001
%

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalObjectZeroArg
	"object() returns a fresh Object instance."

	| result |
	result := self eval: 'object()'.
	self assert: result notNil.
	self assert: (result isKindOf: Object)
%

category: 'Grail-Tests - Runtime'
method: ClassCallFastPathTestCase
testEvalStrUnaffected
	"str(42) still works (it routes through the builtins fast path).
	Regression check: my class-call addition must not break this."

	self assert: (self eval: 'str(42)') equals: '42'.
	self assert: (self eval: 'str(True)') equals: 'True'
%

! ===============================================================================
! Negative tests
! ===============================================================================

category: 'Grail-Tests - Negative'
method: ClassCallFastPathTestCase
testEvalBoolWrongArityRaisesTypeError
	"`bool(1, 2)` raises Python TypeError instead of MessageNotUnderstood
	(Boolean class doesn't understand value:value:)."

	self should: [self eval: 'bool(1, 2)'] raise: TypeError
%

category: 'Grail-Tests - Negative'
method: ClassCallFastPathTestCase
testShadowedNameSkipsFastPath
	"If a local rebinds `bool`, `bool(x)` resolves to the local — the
	fast path must not fire. `bool = 5; bool(1)` should attempt to call
	the integer 5, which fails with a runtime error (not a TypeError
	from the arity-mismatch branch and not the @env1:__new__ form)."

	"The local rebinding produces a non-class call.  Calling the
	integer now raises the CPython TypeError ('SmallInteger object is
	not callable' via object>>value:value:) -- previously it escaped
	as a raw Smalltalk error, which is what this test used to assert."
	self should: [self eval: 'bool = 5
result = bool(1)']
		raise: TypeError
%

! ===============================================================================
! Group A: cls-first-arg refactors — runtime tests
! ===============================================================================
! Decimal, range, bytes, bytearray previously had `__new__: cls _: arg`
! signatures (with cls as first argument). After refactor they have
! `__new__: arg` (receiver IS cls). Verify the bare-name class call works.

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalDecimalOfString
	"Decimal('123.45') constructs a Decimal from a string. After the
	cls-first refactor, the class-call fast path emits `Decimal @env1:__new__: ...`
	and Decimal's __new__ no longer expects a leading cls arg."

	| d |
	d := self eval: 'Decimal("123.45")'.
	self assert: (d isKindOf: ScaledDecimal).
	self assert: d asString equals: '123.45'
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalDecimalOfInteger
	"Decimal(42) constructs from an integer."

	| d |
	d := self eval: 'Decimal(42)'.
	self assert: (d isKindOf: ScaledDecimal).
	self assert: d asInteger equals: 42
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalRangeOneArg
	"range(stop) creates an Interval from 0 to stop-1. After refactor
	`__new__: stop` is on Interval class without a leading cls arg."

	| r |
	r := self eval: 'range(5)'.
	self assert: (r isKindOf: Interval).
	self assert: r size equals: 5.
	self assert: r first equals: 0.
	self assert: r last equals: 4
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalRangeTwoArgs
	"range(start, stop) creates an Interval from start to stop-1."

	| r |
	r := self eval: 'range(2, 7)'.
	self assert: r size equals: 5.
	self assert: r first equals: 2.
	self assert: r last equals: 6
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalRangeThreeArgs
	"range(start, stop, step) creates an Interval with explicit step."

	| r |
	r := self eval: 'range(0, 10, 2)'.
	self assert: r size equals: 5.
	self assert: r first equals: 0.
	self assert: r last equals: 8
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalBytesEmpty
	"bytes() returns an empty ByteArray."

	| b |
	b := self eval: 'bytes()'.
	self assert: (b isKindOf: ByteArray).
	self assert: b size equals: 0
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalBytesFromInteger
	"bytes(5) creates 5 zero bytes."

	| b |
	b := self eval: 'bytes(5)'.
	self assert: b size equals: 5.
	self assert: (b at: 1) equals: 0.
	self assert: (b at: 5) equals: 0
%

category: 'Grail-Tests - Runtime - Group A refactor'
method: ClassCallFastPathTestCase
testEvalBytearrayEmpty
	"bytearray() returns an empty bytearray."

	| b |
	b := self eval: 'bytearray()'.
	self assert: b size equals: 0
%

! ===============================================================================
! Group B: __new__ added to list/tuple/dict/set/frozenset
! ===============================================================================
! These collection classes previously had no __new__ at all on their underlying
! GemStone classes. Calls like `list()`, `dict()` fell through to the legacy
! `value:value:` path and signalled MessageNotUnderstood. The fast path now
! finds the inherited or directly-defined __new__ and emits a clean send.

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalListEmpty
	"list() returns an empty list."

	| lst |
	lst := self eval: 'list()'.
	self assert: (lst isKindOf: OrderedCollection).
	self assert: lst size equals: 0
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalListFromTuple
	"list((1, 2, 3)) builds a list from the tuple's elements."

	| lst |
	lst := self eval: 'list((1, 2, 3))'.
	self assert: lst size equals: 3.
	self assert: (lst at: 1) equals: 1.
	self assert: (lst at: 2) equals: 2.
	self assert: (lst at: 3) equals: 3
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalListFromString
	"list('abc') builds a list of single-char strings, using the
	generic iterable protocol (CharacterCollection iterates as chars)."

	| lst |
	lst := self eval: 'list("abc")'.
	self assert: lst size equals: 3
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalTupleEmpty
	"tuple() returns an empty tuple of size 0."

	| t |
	t := self eval: 'tuple()'.
	self assert: (t isKindOf: tuple).
	self assert: t size equals: 0
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalTupleFromList
	"tuple([1, 2, 3]) builds a tuple from the list's elements."

	| t |
	t := self eval: 'tuple([1, 2, 3])'.
	self assert: (t isKindOf: tuple).
	self assert: t size equals: 3.
	self assert: (t at: 1) equals: 1.
	self assert: (t at: 3) equals: 3
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalDictEmpty
	"dict() returns an empty dict."

	| d |
	d := self eval: 'dict()'.
	self assert: (d isKindOf: KeyValueDictionary).
	self assert: d size equals: 0
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalDictFromMapping
	"dict({'a': 1, 'b': 2}) copies entries from another mapping."

	| d |
	d := self eval: 'dict({"a": 1, "b": 2})'.
	self assert: (d isKindOf: KeyValueDictionary).
	self assert: d size equals: 2.
	self assert: (d at: 'a') equals: 1.
	self assert: (d at: 'b') equals: 2
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalFrozensetEmpty
	"frozenset() returns an empty Set."

	| s |
	s := self eval: 'frozenset()'.
	self assert: (s isKindOf: Set).
	self assert: s size equals: 0
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalFrozensetFromList
	"frozenset([1, 2, 2, 3]) deduplicates and produces a 3-element Set."

	| s |
	s := self eval: 'frozenset([1, 2, 2, 3])'.
	self assert: s size equals: 3.
	self assert: (s includes: 1).
	self assert: (s includes: 2).
	self assert: (s includes: 3)
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalSetEmpty
	"set() returns an empty set (subclass of frozenset)."

	| s |
	s := self eval: 'set()'.
	self assert: (s isKindOf: Set).
	self assert: s size equals: 0
%

category: 'Grail-Tests - Runtime - Collection __new__'
method: ClassCallFastPathTestCase
testEvalSetFromList
	"set([1, 2, 2, 3]) deduplicates. Inherits __new__ from Set (where
	shared set/frozenset class-side constructors live) but creates a
	`set` (mutable) instance because the receiver is set."

	| s |
	s := self eval: 'set([1, 2, 2, 3])'.
	self assert: s size equals: 3
%

! ===============================================================================
! Discriminator unit tests for inheritance walk
! ===============================================================================

category: 'Grail-Tests - Discriminators'
method: ClassCallFastPathTestCase
testCodegenForInheritedNew
	"`set` inherits __new__ from Set (its GemStone superclass — set
	and frozenset are siblings under Set, where the shared class-side
	__new__/__new__: constructors live). The discriminator walks the
	metaclass chain so the inherited selector is detected; direct
	method-dict lookup on `set class` would miss it. Verify codegen
	by checking the emitted source — if the discriminator misses
	inherited methods, codegen falls through to the legacy
	`value:value:` form."

	| src |
	src := self generatedSourceFor: 'set([1])'.
	self assert: (src includesString: 'set @env1:__new__:').
	self deny: (src includesString: 'value: { ')
%
