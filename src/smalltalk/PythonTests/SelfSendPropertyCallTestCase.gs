! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SelfSendPropertyCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SelfSendPropertyCallTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SelfSendPropertyCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelfSendPropertyCallTestCase - calling a @property's value through self
! ===============================================================================
! ``self.kind(n)'' means: read the property, then call what it answers.  Grail
! fused it into ``self kind: n'' -- the class self-send fast path, right for a
! plain def and wrong here, because that selector is the property's SETTER.  A
! read-only property answered it by raising ``has no setter'', and the varargs
! twin sent the getter's own ``_kind: {n} kw: nil'' wrapper, which refused the
! argument its signature never had.
!
! @property is a STRUCTURAL decorator in Grail -- its getter compiles to a
! plain unary method -- so the name never reached the exclusion list that keeps
! WRAPPING decorators out of the fast path.  Right for a READ, wrong for a
! CALL; CallAst >> classPropertyNames now excludes calls only.
!
! tests/python/self_send_property_call.py holds the 9 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SelfSendPropertyCallTestCase removeAllMethods.
SelfSendPropertyCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SelfSendPropertyCallTestCase
setUp

	importlib @env1:modules removeKey: #'self_send_property_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_send_property_call.py')
		name: 'self_send_property_call'
%

category: 'Grail-Helpers'
method: SelfSendPropertyCallTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SelfSendPropertyCallTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - properties'
method: SelfSendPropertyCallTestCase
testAPropertyValueIsCalledNotItsSetter

	self assertAll: #('calling_a_property_value_through_self'
		'calling_a_cached_property_value_through_self'
		'calling_a_property_from_outside_still_works'
		'calling_a_property_whose_value_is_not_callable')
%

category: 'Grail-Tests - properties'
method: SelfSendPropertyCallTestCase
testEveryOtherSelfCallIsUnchanged

	self assertAll: #('a_plain_method_self_call_is_unchanged'
		'a_classmethod_or_staticmethod_self_call_is_unchanged')
%

category: 'Grail-Tests - properties'
method: SelfSendPropertyCallTestCase
testReadingAndWritingAPropertyIsUnchanged

	self assertAll: #('reading_a_property_through_self_is_unchanged'
		'writing_a_property_through_self_is_unchanged'
		'a_property_read_from_outside_is_unchanged')
%

category: 'Grail-Tests - properties'
method: SelfSendPropertyCallTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
