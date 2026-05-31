! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DynamicTypeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DynamicTypeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DynamicTypeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DynamicTypeTestCase — the 3-argument ``type(name, bases, namespace)`` builtin
! that creates a class at runtime.  Grail picks the storage base as the
! Smalltalk superclass and merges the other Python bases' methods, mirroring
! ClassDefAst.  werkzeug.test builds ``WrapperTestResponse`` this way.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DynamicTypeTestCase removeAllMethods.
DynamicTypeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-DynamicType'
method: DynamicTypeTestCase
loadFixture
	"Load tests/python/dynamic_type.py fresh."

	importlib @env1:modules @env0:removeKey: #'dynamic_type' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/dynamic_type.py')
		name: 'dynamic_type'
%

category: 'Grail-Tests-DynamicType'
method: DynamicTypeTestCase
testDynamicMultiBase
	"``type('LoudAnimal', (Animal, Loud), {})`` yields a class whose
	instances answer the primary/storage base's methods (speak/legs)
	AND the merged secondary base's method (shout).  ``isinstance``
	passes for the primary base (Smalltalk inheritance) but NOT for the
	merged secondary base (its methods are copied, but the class does
	not inherit from it — the same limitation as compile-time multiple
	inheritance; see MultipleInheritanceTestCase)."

	| r |
	r := self loadFixture @env1:dynamic_multi_base.
	self assert: (r @env1:__getitem__: 0) equals: 'LoudAnimal'.
	self assert: (r @env1:__getitem__: 1) equals: 'generic'.
	self assert: (r @env1:__getitem__: 2) equals: 'LOUD'.
	self assert: (r @env1:__getitem__: 3) equals: 4.
	self assert: (r @env1:__getitem__: 4) equals: true.
	"Merged secondary base is not in the isinstance chain (known limit)."
	self assert: (r @env1:__getitem__: 5) equals: false
%

category: 'Grail-Tests-DynamicType'
method: DynamicTypeTestCase
testDynamicSingleBase
	"``type('Solo', (Animal,), {})`` — single base, empty namespace."

	| r |
	r := self loadFixture @env1:dynamic_single_base.
	self assert: (r @env1:__getitem__: 0) equals: 'Solo'.
	self assert: (r @env1:__getitem__: 1) equals: 'generic'
%
