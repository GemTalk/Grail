! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassAttrShadowsInheritedTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassAttrShadowsInheritedTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassAttrShadowsInheritedTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassAttrShadowsInheritedTestCase - a class attribute shadows what it inherits
! ===============================================================================
! CPython's lookup scans the MRO once and stops at the FIRST class holding the
! name, so a class attribute shadows an inherited @property entirely.  Grail's
! instance read found the property and raised, while ``Sub.kind'' answered the
! attribute: two spellings of one name disagreed.
!
! Object class >> ___grailInstallAttrMethodShadows___: already compiled a
! forwarder for a class attribute shadowing an inherited METHOD.  It skipped a
! name carrying both the unary and the 1-arg selector, on the grounds that the
! pair is how Grail encodes a data attribute -- true of a slot accessor, false
! of an inherited @property, which wears the same shape.  The CATEGORY of the
! setter is what tells them apart.
!
! Three further conditions had to give way, each recorded at its site: the MRO
! rather than the superclass chain (a secondary base's property is copied onto
! the class itself), a merged-in selector not counting as ``the class supplies
! this itself'', and a getter that ANSWERS the value where the method forwarder
! CALLS it.
!
! tests/python/class_attr_shadows_inherited.py holds the 10 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassAttrShadowsInheritedTestCase removeAllMethods.
ClassAttrShadowsInheritedTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassAttrShadowsInheritedTestCase
setUp

	importlib @env1:modules removeKey: #'class_attr_shadows_inherited' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_shadows_inherited.py')
		name: 'class_attr_shadows_inherited'
%

category: 'Grail-Helpers'
method: ClassAttrShadowsInheritedTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ClassAttrShadowsInheritedTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - attributes'
method: ClassAttrShadowsInheritedTestCase
testAClassAttributeShadowsWhatItInherits

	self assertAll: #('a_class_attribute_shadows_an_inherited_property'
		'a_class_attribute_shadows_an_inherited_method'
		'it_shadows_through_a_secondary_base_too'
		'a_subclass_of_the_shadowing_class_inherits_it')
%

category: 'Grail-Tests - attributes'
method: ClassAttrShadowsInheritedTestCase
testWhatIsNotShadowedIsUnchanged

	self assertAll: #('the_base_class_still_answers_its_property'
		'the_inherited_method_still_works_where_not_shadowed'
		'the_class_level_read_is_unchanged')
%

category: 'Grail-Tests - attributes'
method: ClassAttrShadowsInheritedTestCase
testTheRestOfThePrecedenceStillHolds

	self assertAll: #('rebinding_the_class_attribute_is_seen_by_instances'
		'an_instance_attribute_still_wins_over_the_class_one'
		'one_instance_attribute_does_not_leak_to_another')
%

category: 'Grail-Tests - attributes'
method: ClassAttrShadowsInheritedTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
