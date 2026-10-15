Class {
	#name : 'ClassNewAttributeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassNewAttributeTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassNewAttributeTestCase >> setUp [
	"Reload tests/python/class_new_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_new_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_new_attribute.py')
		name: 'class_new_attribute'.

]

{ #category : 'Grail-Tests - Cls.__new__' }
ClassNewAttributeTestCase >> testAllocateWithoutInit [
	"``P.__new__(P)'' allocates and does NOT run __init__ -- what copy, pickle
	and hand-written __reduce__ implementations do.  This used to raise a raw
	Smalltalk MessageNotUnderstood."

	self assert: (self resultAt: 'alloc_type') asString equals: 'P'.
	self assert: (self resultAt: 'alloc_skipped_init').

]

{ #category : 'Grail-Tests - Enum.__new__ identity' }
ClassNewAttributeTestCase >> testEnumClassNewIsEnumNew [
	"CPython EnumType.__new__ replaces the class's __new__ with Enum.__new__,
	so the identity holds for a plain enum AND for a data-mixed one whose
	mix-in defines its own __new__ (test_enum's test_subclasses_with_* read
	exactly this)."

	self assert: (self resultAt: 'plain_enum_new_is_enum_new').
	self assert: (self resultAt: 'mixed_enum_new_is_enum_new').

]

{ #category : 'Grail-Tests - Cls.__new__' }
ClassNewAttributeTestCase >> testReadingClassNewDoesNotConstruct [
	"``P.__new__'' is the function.  It used to be a fresh ``<P object>''."

	self assert: (self resultAt: 'plain_new_type').

]

{ #category : 'Grail-Tests - Cls.__new__' }
ClassNewAttributeTestCase >> testUserDefinedNewStillRuns [
	"A class-body ``def __new__'' is still the one that runs when called
	explicitly -- the fix only stopped the READ from allocating."

	self assert: (self resultAt: 'user_new_ran').

]
