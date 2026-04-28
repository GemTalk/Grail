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
NoneTypeTestCase category: 'SUnit'
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

category: 'Tests - Singleton'
method: NoneTypeTestCase
testInstanceIsSingleton
	"`NoneType ___instance___` always returns the same object — the global
	``None`` — regardless of how often it is called."

	self assert: NoneType ___instance___ == None.
	self assert: NoneType ___instance___ == NoneType ___instance___.
%

category: 'Tests - Singleton'
method: NoneTypeTestCase
testNoneClass
	"The class of None is NoneType."

	self assert: None class == NoneType.
%

category: 'Tests - Singleton'
method: NoneTypeTestCase
testNewRaisesTypeError
	"NoneType cannot be instantiated; ``new`` raises TypeError."

	self should: [NoneType new] raise: TypeError.
%

category: 'Tests - Singleton'
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

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testBoolIsFalse
	"Python: bool(None) is False; the protocol method __bool__ returns false."

	self assert: None @env1:__bool__ == false.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testHashIsZero
	"hash(None) is implementation-defined but constant. We pick 0."

	self assert: None @env1:__hash__ equals: 0.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testReprIsNone
	"repr(None) is the string 'None'."

	self assert: None @env1:__repr__ equals: 'None'.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testStrIsNone
	"str(None) is the string 'None'."

	self assert: None @env1:__str__ equals: 'None'.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testEqSelf
	"None equals None (identity-based)."

	self assert: (None @env1:__eq__: None) == true.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testEqOther
	"None does not equal any non-None value."

	self assert: (None @env1:__eq__: 0) == false.
	self assert: (None @env1:__eq__: '') == false.
	self assert: (None @env1:__eq__: false) == false.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testNeSelf
	self assert: (None @env1:__ne__: None) == false.
%

category: 'Tests - Special Methods'
method: NoneTypeTestCase
testNeOther
	self assert: (None @env1:__ne__: 0) == true.
%

! ===============================================================================
! Code generation: Python source compiles to references to the singleton
! ===============================================================================

category: 'Tests - Codegen'
method: NoneTypeTestCase
testNoneLiteralEvaluatesToSingleton
	"The Python ``None`` keyword literal evaluates to the singleton."

	self assert: (self eval: 'None') == None.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testIsNoneIsTrue
	"``None is None`` is True (identity comparison)."

	self assert: (self eval: 'None is None') == true.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testIsNotNoneIsFalse
	self assert: (self eval: 'None is not None') == false.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testNoneEqualsNone
	"``None == None`` returns True via __eq__."

	self assert: (self eval: 'None == None') == true.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testNoneNotEqualsZero
	self assert: (self eval: 'None != 0') == true.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testReprNone
	"Python: repr(None) → 'None'."

	self assert: (self eval: 'repr(None)') equals: 'None'.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testStrNone
	self assert: (self eval: 'str(None)') equals: 'None'.
%

category: 'Tests - Codegen'
method: NoneTypeTestCase
testHashNone
	self assert: (self eval: 'hash(None)') equals: 0.
%

! ===============================================================================
! Function fall-off returns None (not nil)
! ===============================================================================

category: 'Tests - Function Return'
method: NoneTypeTestCase
testFallOffReturnsNone
	"A function body that runs to the end without an explicit ``return``
	yields the Python ``None`` singleton."

	self assert: (self eval: 'def f():
    x = 1
f()') == None.
%

category: 'Tests - Function Return'
method: NoneTypeTestCase
testBareReturnReturnsNone
	"A bare ``return`` statement yields None (already the case before the
	singleton work; included here as a regression guard)."

	self assert: (self eval: 'def f():
    return
f()') == None.
%

category: 'Tests - Function Return'
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

category: 'Tests - Mutator Returns'
method: NoneTypeTestCase
testListAppendReturnsNone
	self assert: (self eval: 'a = [1, 2]
a.append(3)') == None.
%

category: 'Tests - Mutator Returns'
method: NoneTypeTestCase
testListSortReturnsNone
	self assert: (self eval: '[3, 1, 2].sort()') == None.
%

category: 'Tests - Mutator Returns'
method: NoneTypeTestCase
testListClearReturnsNone
	self assert: (self eval: 'a = [1, 2, 3]
a.clear()') == None.
%

category: 'Tests - Mutator Returns'
method: NoneTypeTestCase
testDictGetMissingReturnsNone
	"dict.get(missing-key) defaults to None when no default is supplied."

	self assert: (self eval: '{}.get("x")') == None.
%

category: 'Tests - Mutator Returns'
method: NoneTypeTestCase
testDictGetMissingWithDefault
	"An explicit default still overrides the None default."

	self assert: (self eval: '{}.get("x", 5)') equals: 5.
%

! ===============================================================================
! Smalltalk-side debug printing
! ===============================================================================

category: 'Tests - Smalltalk-side'
method: NoneTypeTestCase
testPrintOnEmitsNone
	"The Smalltalk-side ``printOn:`` emits 'None' for clarity in stack
	traces and Transcript output."

	self assert: None printString equals: 'None'.
%
