Class {
	#name : 'ClassAttrSingleHomeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassAttrSingleHomeTestCase >> assertCheck: key [
	"Every fixture check answers Python True on success and False -- or a
	non-boolean -- on failure; print what it answered, not just that it failed."

	| v |
	v := self resultAt: key.
	self assert: v == true
		description: key , ' answered ' , v printString.

]

{ #category : 'Grail-Private' }
ClassAttrSingleHomeTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassAttrSingleHomeTestCase >> setUp [
	"Reload tests/python/class_attr_single_home.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_attr_single_home' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_single_home.py')
		name: 'class_attr_single_home'.

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testClassDictIsOwnOnly [
	self assertCheck: 'check_class_dict_is_own_only'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testDelBodyAttribute [
	"``del D.k'' on a class-body attribute removes the holder entry AND the
	class's own accessor pair, so hasattr answers False and a second del raises.
	The slot-backed pair could not be deleted at all."

	self assertCheck: 'check_del_body_attribute'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testDelInheritedRaises [
	self assertCheck: 'check_del_inherited_raises'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testInheritedRead [
	self assertCheck: 'check_inherited_read'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testParentChangeReachesSubclass [
	"The row the classInstVar design got wrong: a subclass held a build-time
	COPY of the parent's value, so ``A.x = 99'' never reached ``B.x''."

	self assertCheck: 'check_parent_change_reaches_subclass'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testReservedNameIsolated [
	self assertCheck: 'check_reserved_name_isolated'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testSubclassDelUncoversParent [
	self assertCheck: 'check_subclass_del_uncovers_parent'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testSubclassStoreShadowsOnlySubclass [
	self assertCheck: 'check_subclass_store_shadows_only_subclass'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testTypeBuiltClassInherits [
	self assertCheck: 'check_type_built_class_inherits'

]

{ #category : 'Grail-Tests' }
ClassAttrSingleHomeTestCase >> testVarsIsClassDict [
	"vars(cls) used to enumerate the METACLASS's instVars -- the kernel's
	``format'', ``superClass'', ... -- and listed the class body's names only
	because they happened to be classInstVars too."

	self assertCheck: 'check_vars_is_class_dict'

]
