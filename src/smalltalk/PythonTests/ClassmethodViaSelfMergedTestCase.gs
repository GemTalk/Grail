! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassmethodViaSelfMergedTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassmethodViaSelfMergedTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassmethodViaSelfMergedTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassmethodViaSelfMergedTestCase - a @classmethod reached through self from a secondary base
! ===============================================================================
! ``self.parse(x)'' written inside the class that declares @parse worked when
! that class stood alone, was inherited singly, or was the PRIMARY base -- and
! raised AttributeError when it was a SECONDARY base.  The identical call in a
! SUBCLASS worked, because a name the body does not declare takes the attribute
! path rather than the fused self-send.
!
! Two mechanisms meet here.  Codegen emits ``self parse: x'' (a @classmethod is
! a structural decorator, so the name is in classFunctionNames) and no
! instance-side method answers it; the doesNotUnderstand hook recovers by
! forwarding to the class.  That hook admitted only 'Grail-Class Methods', and
! ___mergeSecondaryBases___ files a secondary base's class-side methods under
! 'Grail-MI-Inherited' -- the same method, a different category.
!
! tests/python/classmethod_via_self_merged.py holds the 8 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassmethodViaSelfMergedTestCase removeAllMethods.
ClassmethodViaSelfMergedTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassmethodViaSelfMergedTestCase
setUp

	importlib @env1:modules removeKey: #'classmethod_via_self_merged' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_via_self_merged.py')
		name: 'classmethod_via_self_merged'
%

category: 'Grail-Helpers'
method: ClassmethodViaSelfMergedTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ClassmethodViaSelfMergedTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - classmethods'
method: ClassmethodViaSelfMergedTestCase
testAClassmethodThroughSelfFromASecondaryBase

	self assertAll: #('a_classmethod_through_self_from_a_secondary_base'
		'the_class_it_binds_is_the_instances_own'
		'a_varargs_classmethod_the_same_way'
		'a_staticmethod_the_same_way')
%

category: 'Grail-Tests - classmethods'
method: ClassmethodViaSelfMergedTestCase
testEveryShapeThatAlreadyWorkedStillDoes

	self assertAll: #('the_declaring_class_used_directly'
		'the_declaring_class_as_the_primary_base'
		'the_call_written_in_a_subclass'
		'the_class_side_call_and_the_read_from_outside')
%

category: 'Grail-Tests - classmethods'
method: ClassmethodViaSelfMergedTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8
%
