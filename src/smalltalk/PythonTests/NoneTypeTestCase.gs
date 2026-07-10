! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NoneTypeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NoneTypeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NoneTypeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NoneTypeTestCase - Tests for the Python ``None`` singleton and ``NoneType``
! ===============================================================================
! Covers:
!   * Singleton identity, class membership, and ``new`` rejection.
!   * Distinctness from Smalltalk nil (the new Grail design separates the
!     two: nil = undefined, None = explicit Python value).
!   * Special-method protocol: __bool__, __hash__, __repr__, __str__,
!     __eq__, __ne__.
!   * Code generation: Python ``None`` literal, ``is``/``is not``, builtin
!     ``bool`` / ``repr`` / ``str`` / ``hash``.
!   * Implicit fall-off from a function body returns None, not nil.
!   * Mutator return values (list.append, list.sort) and ``dict.get``
!     missing-key default surface the singleton.

set compile_env: 0

expectvalue /Metaclass3
doit
NoneTypeTestCase removeAllMethods.
NoneTypeTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Singleton identity & class
! ===============================================================================

category: 'Grail-Tests - Singleton'
method: NoneTypeTestCase
testInstanceIsSingleton
	"`NoneType ___instance___` always returns the same object — the global
	``None`` — regardless of how often it is called."

	self assert: NoneType ___instance___ == None.
	self assert: NoneType ___instance___ == NoneType ___instance___.
%

category: 'Grail-Tests - Singleton'
method: NoneTypeTestCase
testNoneClass
	"The class of None is NoneType."

	self assert: None class == NoneType.
%

category: 'Grail-Tests - Singleton'
method: NoneTypeTestCase
testNewRaisesTypeError
	"NoneType cannot be instantiated; ``new`` raises TypeError."

	self should: [NoneType new] raise: TypeError.
%

category: 'Grail-Tests - Singleton'
method: NoneTypeTestCase
testDistinctFromSmalltalkNil
	"None is not the same object as Smalltalk nil — that distinction is the
	whole point of the singleton."

	self deny: None == nil.
	self deny: None = nil.
%

! ===============================================================================
! Python special methods (called directly via env-1 dispatch)
! ===============================================================================

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testBoolIsFalse
	"Python: bool(None) is False; the protocol method __bool__ returns false."

	self assert: None @env1:__bool__ == false.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testHashIsZero
	"hash(None) is implementation-defined but constant. We pick 0."

	self assert: None @env1:__hash__ equals: 0.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testReprIsNone
	"repr(None) is the string 'None'."

	self assert: None @env1:__repr__ equals: 'None'.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testStrIsNone
	"str(None) is the string 'None'."

	self assert: None @env1:__str__ equals: 'None'.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testEqSelf
	"None equals None (identity-based)."

	self assert: (None @env1:__eq__: None) == true.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testEqOther
	"None does not equal any non-None value."

	self assert: (None @env1:__eq__: 0) == false.
	self assert: (None @env1:__eq__: '') == false.
	self assert: (None @env1:__eq__: false) == false.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testNeSelf
	self assert: (None @env1:__ne__: None) == false.
%

category: 'Grail-Tests - Special Methods'
method: NoneTypeTestCase
testNeOther
	self assert: (None @env1:__ne__: 0) == true.
%

! ===============================================================================
! Code generation: Python source compiles to references to the singleton
! ===============================================================================

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testNoneLiteralEvaluatesToSingleton
	"The Python ``None`` keyword literal evaluates to the singleton."

	self assert: (self eval: 'None') == None.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testIsNoneIsTrue
	"``None is None`` is True (identity comparison)."

	self assert: (self eval: 'None is None') == true.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testIsNotNoneIsFalse
	self assert: (self eval: 'None is not None') == false.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testNoneEqualsNone
	"``None == None`` returns True via __eq__."

	self assert: (self eval: 'None == None') == true.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testNoneNotEqualsZero
	self assert: (self eval: 'None != 0') == true.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testReprNone
	"Python: repr(None) → 'None'."

	self assert: (self eval: 'repr(None)') equals: 'None'.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testStrNone
	self assert: (self eval: 'str(None)') equals: 'None'.
%

category: 'Grail-Tests - Codegen'
method: NoneTypeTestCase
testHashNone
	self assert: (self eval: 'hash(None)') equals: 0.
%

! ===============================================================================
! Function fall-off returns None (not nil)
! ===============================================================================

category: 'Grail-Tests - Function Return'
method: NoneTypeTestCase
testFallOffReturnsNone
	"A function body that runs to the end without an explicit ``return``
	yields the Python ``None`` singleton."

	self assert: (self eval: 'def f():
    x = 1
f()') == None.
%

category: 'Grail-Tests - Function Return'
method: NoneTypeTestCase
testBareReturnReturnsNone
	"A bare ``return`` statement yields None (already the case before the
	singleton work; included here as a regression guard)."

	self assert: (self eval: 'def f():
    return
f()') == None.
%

category: 'Grail-Tests - Function Return'
method: NoneTypeTestCase
testReturnNoneLiteral
	"Explicit ``return None`` yields the singleton (not Smalltalk nil)."

	self assert: (self eval: 'def f():
    return None
f()') == None.
%

! ===============================================================================
! Mutator methods return None
! ===============================================================================

category: 'Grail-Tests - Mutator Returns'
method: NoneTypeTestCase
testListAppendReturnsNone
	self assert: (self eval: 'a = [1, 2]
a.append(3)') == None.
%

category: 'Grail-Tests - Mutator Returns'
method: NoneTypeTestCase
testListSortReturnsNone
	self assert: (self eval: '[3, 1, 2].sort()') == None.
%

category: 'Grail-Tests - Mutator Returns'
method: NoneTypeTestCase
testListClearReturnsNone
	self assert: (self eval: 'a = [1, 2, 3]
a.clear()') == None.
%

category: 'Grail-Tests - Mutator Returns'
method: NoneTypeTestCase
testDictGetMissingReturnsNone
	"dict.get(missing-key) defaults to None when no default is supplied."

	self assert: (self eval: '{}.get("x")') == None.
%

category: 'Grail-Tests - Mutator Returns'
method: NoneTypeTestCase
testDictGetMissingWithDefault
	"An explicit default still overrides the None default."

	self assert: (self eval: '{}.get("x", 5)') equals: 5.
%

! ===============================================================================
! Smalltalk-side debug printing
! ===============================================================================

category: 'Grail-Tests - Smalltalk-side'
method: NoneTypeTestCase
testPrintOnEmitsNone
	"The Smalltalk-side ``printOn:`` emits 'None' for clarity in stack
	traces and Transcript output."

	self assert: None printString equals: 'None'.
%

category: 'Grail-Tests - Python protocol'
method: NoneTypeTestCase
testIterationProtocolRaisesTypeError
	"Iterating/len/subscript/membership on None raise CATCHABLE
	TypeErrors (CPython).  These were uncatchable env-1 MNUs -- real
	methods on NoneType alone are safe where a blanket DNU intercept
	of the probe selectors __iter__/__len__/__getitem__ is not
	(operator.countOf(None, None) killed the test_operator run)."

	self should: [None @env1:__iter__] raise: TypeError.
	self should: [None @env1:__len__] raise: TypeError.
	self should: [None @env1:__getitem__: 0] raise: TypeError.
	self should: [None @env1:__contains__: 1] raise: TypeError.
	self assert: (self eval: 'try:
    for x in None:
        pass
    r = "no-error"
except TypeError:
    r = "type-error"
r') equals: 'type-error'
%
