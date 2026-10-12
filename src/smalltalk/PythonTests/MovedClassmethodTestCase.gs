! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MovedClassmethodTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MovedClassmethodTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MovedClassmethodTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MovedClassmethodTestCase - #1455
! ===============================================================================
!   A method compiled in one class body and stored on another -- what
!   typing.NamedTuple does to every method in its class body.  Three calls did
!   not reach it: a keyword call to a moved @classmethod (UnboundMethod >>
!   ___callKeywordsBound___:rest:kw:), a sibling call through ``cls'' (object >>
!   doesNotUnderstand:args:envId:, now for class receivers too), and five or
!   more arguments (UnboundMethod >> ___performMethod___:on:args:), which also
!   made ``Base.m5(self, ...)'' from an override re-run the override.
!
! tests/python/moved_classmethod.py holds the 13 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MovedClassmethodTestCase removeAllMethods.
MovedClassmethodTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MovedClassmethodTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/moved_classmethod.py'
		name: 'moved_classmethod'
%

category: 'Grail-Helpers'
method: MovedClassmethodTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: MovedClassmethodTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: MovedClassmethodTestCase
testKeywordCallsBindByName

	self assertAll: #('positional' 'keyword' 'keyword_via_instance'
		'keyword_on_func' 'keyword_errors')
%

category: 'Grail-Tests'
method: MovedClassmethodTestCase
testSiblingCallsThroughCls

	self assertAll: #('sibling_through_cls' 'unary_sibling_through_cls')
%

category: 'Grail-Tests'
method: MovedClassmethodTestCase
testFiveOrMoreArguments

	self assertAll: #('five_args_class' 'five_args_instance'
		'explicit_parent_five_args' 'explicit_parent_five_args_again')
%

category: 'Grail-Tests'
method: MovedClassmethodTestCase
testNamedTupleClassmethods

	self assertAll: #('namedtuple_keyword_and_siblings' 'namedtuple_five_positional')
%

category: 'Grail-Tests - coverage'
method: MovedClassmethodTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13
%
