! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ChainedAttributeStoreTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ChainedAttributeStoreTestCase comment:
'A chained assignment with a self/cls attribute target: ``x = cls.attr = v''.

The chained emit wrote the receiver''s dynamic instVars directly, a shape the
single-target store left behind when it moved to __setattr__.  In a
classmethod self is a CLASS, which has none, so CPython''s string.Template
(``pat = cls.pattern = re.compile(...)'') died with an uncatchable
ImproperOperation 2484; on an instance it skipped a @property setter.  Both
codegen arms (AssignAst text emit and IR) now route through __setattr__:_:.

Every expectation in tests/python/chained_attribute_store.py was produced by
CPython 3.14; the fixture gate re-checks it there.'
%

doit
ChainedAttributeStoreTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ChainedAttributeStoreTestCase removeAllMethods: 0.
ChainedAttributeStoreTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ChainedAttributeStoreTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'chained_attribute_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/chained_attribute_store.py')
		name: 'chained_attribute_store'.
%

category: 'Grail-Helpers'
method: ChainedAttributeStoreTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ChainedAttributeStoreTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ChainedAttributeStoreTestCase
testAClassmethodStoresOnItsClass
	self assertAll: #('a_classmethod_stores_on_its_class')
%

category: 'Grail-Tests'
method: ChainedAttributeStoreTestCase
testAnInstanceStoresThroughSetattr
	"@property setter and __setattr__ override both see the chained store;
	a slotted instance still takes its accessor."

	self assertAll: #('an_instance_stores_through_setattr' 'a_slotted_instance_still_works')
%

category: 'Grail-Tests'
method: ChainedAttributeStoreTestCase
testTheOtherReceiversAreUnchanged
	self assertAll: #('the_other_receivers_are_unchanged')
%
