! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeBuiltClassOverridesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeBuiltClassOverridesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeBuiltClassOverridesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeBuiltClassOverridesTestCase
!
! A class built by type(name, bases, ns) -- or by six.add_metaclass, which calls
! the metaclass with the class's namespace -- overrides its builtin base where
! the BASE's own implementation calls the method (#1526).  type() stored the
! namespace as class attributes and installed none of the forwarders a class
! statement does (___grailInstallAttrMethodShadows___:), so datetime ran
! tzinfo's default utcoffset under every python-dateutil tz class.
!
! Driven by tests/python/type_built_class_overrides.py, whose EXPECTED table is
! CPython 3.14's output.  The class-statement row is the control; namedtuple
! (the commonest type() user) is the guard.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeBuiltClassOverridesTestCase removeAllMethods.
TypeBuiltClassOverridesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeBuiltClassOverridesTestCase
setUp
	(importlib @env1:modules) removeKey: #'type_built_class_overrides' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_built_class_overrides.py')
		name: 'type_built_class_overrides'.
%

category: 'Grail-Setup'
method: TypeBuiltClassOverridesTestCase
tearDown
	(importlib @env1:modules) removeKey: #'type_built_class_overrides' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: TypeBuiltClassOverridesTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 14.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
