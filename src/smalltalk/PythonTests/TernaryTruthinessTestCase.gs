! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TernaryTruthinessTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TernaryTruthinessTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TernaryTruthinessTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TernaryTruthinessTestCase
!
! Python's conditional expression ``a if cond else b'' evaluates
! ``cond'' using Python's truthiness rule (None / 0 / empty
! containers / empty strings are falsy; everything else is truthy
! unless overridden by ``__bool__'' / ``__len__'').
!
! Pre-fix, IfExpAst emitted ``test ifTrue: [...] ifFalse: [...]''
! and Smalltalk's ifTrue:/ifFalse: only accept Boolean — a tuple,
! list, string, int, or None at the test position would
! ``ImproperOperation: Expected <value> to be a Boolean.''  Surfaced
! while authoring VarargsNamingTestCase (``positional[0] if
! positional else 'EMPTY''').
!
! Fix wraps the test expression in ``___isTruthy___'' so the
! evaluation matches Python semantics.  IfAst (statement form) and
! WhileAst already do this wrap; IfExpAst was the missing case.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TernaryTruthinessTestCase removeAllMethods.
TernaryTruthinessTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TernaryTruthinessTestCase
setUp
	"Reload tests/python/ternary_truthiness.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ternary_truthiness' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ternary_truthiness.py')
		name: 'ternary_truthiness'.
%

! --- Tuple ---

category: 'Grail-Tests - Tuple'
method: TernaryTruthinessTestCase
testTernaryNonEmptyTupleIsTruthy
	"(1, 2, 3) is truthy."

	self assert: (testModule @env1:ternary_tuple_truthy) equals: 'non-empty'
%

category: 'Grail-Tests - Tuple'
method: TernaryTruthinessTestCase
testTernaryEmptyTupleIsFalsy
	"() is falsy."

	self assert: (testModule @env1:ternary_tuple_falsy) equals: 'empty'
%

! --- List ---

category: 'Grail-Tests - List'
method: TernaryTruthinessTestCase
testTernaryNonEmptyListIsTruthy
	"[1] is truthy."

	self assert: (testModule @env1:ternary_list_truthy) equals: 'non-empty'
%

category: 'Grail-Tests - List'
method: TernaryTruthinessTestCase
testTernaryEmptyListIsFalsy
	"[] is falsy."

	self assert: (testModule @env1:ternary_list_falsy) equals: 'empty'
%

! --- String ---

category: 'Grail-Tests - String'
method: TernaryTruthinessTestCase
testTernaryNonEmptyStringIsTruthy
	"'hello' is truthy."

	self assert: (testModule @env1:ternary_string_truthy) equals: 'non-empty'
%

category: 'Grail-Tests - String'
method: TernaryTruthinessTestCase
testTernaryEmptyStringIsFalsy
	"'' is falsy."

	self assert: (testModule @env1:ternary_string_falsy) equals: 'empty'
%

! --- Int ---

category: 'Grail-Tests - Int'
method: TernaryTruthinessTestCase
testTernaryNonZeroIntIsTruthy
	"42 is truthy."

	self assert: (testModule @env1:ternary_int_truthy) equals: 'non-zero'
%

category: 'Grail-Tests - Int'
method: TernaryTruthinessTestCase
testTernaryZeroIsFalsy
	"0 is falsy."

	self assert: (testModule @env1:ternary_int_falsy) equals: 'zero'
%

! --- None ---

category: 'Grail-Tests - None'
method: TernaryTruthinessTestCase
testTernaryNoneIsFalsy
	"None is falsy."

	self assert: (testModule @env1:ternary_none_is_falsy) equals: 'none'
%

! --- Dict ---

category: 'Grail-Tests - Dict'
method: TernaryTruthinessTestCase
testTernaryNonEmptyDictIsTruthy
	"{'a': 1} is truthy."

	self assert: (testModule @env1:ternary_dict_truthy) equals: 'non-empty'
%

category: 'Grail-Tests - Dict'
method: TernaryTruthinessTestCase
testTernaryEmptyDictIsFalsy
	"{} is falsy."

	self assert: (testModule @env1:ternary_dict_falsy) equals: 'empty'
%
