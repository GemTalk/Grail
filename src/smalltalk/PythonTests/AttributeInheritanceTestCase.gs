! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeInheritanceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeInheritanceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeInheritanceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeInheritanceTestCase
!
! Python attribute lookup walks the class chain.  ClassAttributeTestCase
! exercises per-class isolation; this case exercises the inheritance
! direction — subclasses inherit parent class attributes, instances
! see class attributes via the class chain, subclass overrides shadow
! without mutating the parent, and instance shadows of class attrs
! disappear on del.
!
! Pre-fix, dynInstVars probes only walked the receiver's own slot,
! so subclass + instance reads of an inherited class attr raised
! AttributeError.  Fix walks the superclass chain on miss.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeInheritanceTestCase removeAllMethods.
AttributeInheritanceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributeInheritanceTestCase
setUp
	"Reload tests/python/attribute_inheritance.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'attribute_inheritance' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_inheritance.py')
		name: 'attribute_inheritance'.
%

! --- Subclass inherits parent's class attribute ---

category: 'Grail-Tests - Class chain'
method: AttributeInheritanceTestCase
testSubclassInheritsParentClassAttr
	"After A.alpha = 'from-A', reading B.alpha (B is a subclass of A)
	walks the class chain and finds 'from-A'."

	self assert: (testModule @env1:___pyAttrLoad___: #b_reads_alpha) equals: 'from-A'.
%

category: 'Grail-Tests - Class chain'
method: AttributeInheritanceTestCase
testGrandchildWalksFullChain
	"C inherits from B inherits from A.  C.alpha walks past B's empty
	dynInstVars all the way up to A."

	self assert: (testModule @env1:___pyAttrLoad___: #c_reads_alpha) equals: 'from-A'.
%

! --- Instance reads class attribute via class chain ---

category: 'Grail-Tests - Instance fallthrough'
method: AttributeInheritanceTestCase
testInstanceReadsParentClassAttr
	"a_inst is an A instance with no instance attrs; reading a_inst.alpha
	misses the instance dict and walks up to A's dynInstVars."

	self assert: (testModule @env1:___pyAttrLoad___: #inst_reads_alpha) equals: 'from-A'.
%

category: 'Grail-Tests - Instance fallthrough'
method: AttributeInheritanceTestCase
testInstanceWalksDeepChain
	"c_inst is a C instance.  c_inst.alpha walks instance dict → C →
	B → A.dynInstVars and finds 'from-A'."

	self assert: (testModule @env1:___pyAttrLoad___: #c_inst_reads_alpha)
		equals: 'from-A'.
%

! --- Subclass override doesn't mutate parent ---

category: 'Grail-Tests - Override isolation'
method: AttributeInheritanceTestCase
testSubclassOverrideHidesParent
	"After B.alpha = 'from-B', B.alpha reads B's own value, not A's."

	self assert: (testModule @env1:___pyAttrLoad___: #b_reads_b_override) equals: 'from-B'.
%

category: 'Grail-Tests - Override isolation'
method: AttributeInheritanceTestCase
testParentUnaffectedBySubclassOverride
	"Setting B.alpha must not mutate A.alpha — A's dynInstVars stays at 'from-A'."

	self assert: (testModule @env1:___pyAttrLoad___: #a_still_reads_a) equals: 'from-A'.
%

category: 'Grail-Tests - Override isolation'
method: AttributeInheritanceTestCase
testGrandchildSeesNearestParentOverride
	"C inherits via B; after B.alpha = 'from-B', C.alpha walk stops at B."

	self assert: (testModule @env1:___pyAttrLoad___: #c_reads_b_override) equals: 'from-B'.
%

! --- Instance shadow ---

category: 'Grail-Tests - Instance shadow'
method: AttributeInheritanceTestCase
testInstanceAttrShadowsClassAttr
	"Setting h_inst.tag = 'instance-tag' shadows the class-level tag
	on read, without mutating the class slot."

	self assert: (testModule @env1:___pyAttrLoad___: #inst_tag_after_set)
		equals: 'instance-tag'.
	self assert: (testModule @env1:___pyAttrLoad___: #class_tag_after_inst_set)
		equals: 'class-tag'.
%

category: 'Grail-Tests - Instance shadow'
method: AttributeInheritanceTestCase
testDelOnInstanceRevealsClassAttr
	"After del h_inst.tag removes the instance shadow, h_inst.tag
	falls through to Holder.tag again."

	self assert: (testModule @env1:___pyAttrLoad___: #inst_tag_after_del)
		equals: 'class-tag'.
%

! --- Missing through the whole chain raises AttributeError ---

category: 'Grail-Tests - Miss'
method: AttributeInheritanceTestCase
testMissingOnClassRaises
	"Lonely.never_set has no value anywhere in the chain — AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #missing_in_chain)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - Miss'
method: AttributeInheritanceTestCase
testMissingOnInstanceRaises
	"l_inst.never_set — instance dict miss, class chain miss — AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #inst_missing_in_chain)
		equals: 'attribute_error'.
%
