! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrivateMethodKeywordCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PrivateMethodKeywordCallTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PrivateMethodKeywordCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PrivateMethodKeywordCallTestCase - #1422
! ===============================================================================
!   A keyword call to a private method (``self.__m(k=v)'') reaches the
!   method's varargs ``_name:kw:'' companion.  That companion was compiled
!   under the raw name while the method and its call sites use the mangled
!   one, so the call was an uncatchable MessageNotUnderstood.
!
! tests/python/private_method_keyword_call.py holds the 7 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PrivateMethodKeywordCallTestCase removeAllMethods.
PrivateMethodKeywordCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PrivateMethodKeywordCallTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/private_method_keyword_call.py'
		name: 'private_method_keyword_call'
%

category: 'Grail-Helpers'
method: PrivateMethodKeywordCallTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: PrivateMethodKeywordCallTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: PrivateMethodKeywordCallTestCase
testKeywordCallsReachThePrivateMethod

	self assertAll: #('plain_keyword_call' 'defaulted_keyword_call'
		'star_keyword_call')
%

category: 'Grail-Tests'
method: PrivateMethodKeywordCallTestCase
testSubclassPrivatesStaySeparate

	self assertAll: #('subclass_keeps_base_private' 'subclass_own_private')
%

category: 'Grail-Tests'
method: PrivateMethodKeywordCallTestCase
testMangledNameFromOutsideTheClass

	self assertAll: #('mangled_name_from_outside'
		'unexpected_keyword_is_a_type_error')
%

category: 'Grail-Tests - coverage'
method: PrivateMethodKeywordCallTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7
%
