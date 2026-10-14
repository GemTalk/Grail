! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassGetitemNearestTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassGetitemNearestTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassGetitemNearestTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassGetitemNearestTestCase - C[x] calls the nearest __class_getitem__
! ===============================================================================
! A plain def and an explicit @classmethod are both a class's hook, and the
! nearer one wins.  The dispatch asked for a plain def first, anywhere in the
! chain, and a @classmethod overriding an inherited def also compiles an
! instance-side forwarder: C[x] ran the forwarder with the class as receiver,
! an uncatchable MessageNotUnderstood.  sqlalchemy's cython.const
! (class const(Generic[_T])'' with a @classmethod hook) is that shape, and
! none of sqlalchemy's tests could be collected.
! tests/python/class_getitem_nearest.py holds the 8 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassGetitemNearestTestCase removeAllMethods.
ClassGetitemNearestTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassGetitemNearestTestCase
setUp

	importlib @env1:modules removeKey: #'class_getitem_nearest' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_getitem_nearest.py')
		name: 'class_getitem_nearest'
%

category: 'Grail-Helpers'
method: ClassGetitemNearestTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ClassGetitemNearestTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - nearest wins'
method: ClassGetitemNearestTestCase
testAClassmethodOverAnInheritedDef

	self assertAll: #('a_classmethod_over_generics_def' 'inherited_by_a_subclass_with_its_own_cls'
		'a_classmethod_over_an_inherited_def' 'the_instance_side_still_reaches_the_classmethod')
%

category: 'Grail-Tests - nearest wins'
method: ClassGetitemNearestTestCase
testTheOtherShapesAreUnchanged

	self assertAll: #('a_def_over_an_inherited_classmethod' 'an_inherited_classmethod'
		'the_plain_def_alone' 'a_plain_generic_still_parameterises')
%

category: 'Grail-Tests - nearest wins'
method: ClassGetitemNearestTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 8
%
