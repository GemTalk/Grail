Class {
	#name : 'ReservedNameClassAttrTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReservedNameClassAttrTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ReservedNameClassAttrTestCase >> setUp [
	"Reload tests/python/reserved_name_class_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reserved_name_class_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_name_class_attrs.py')
		name: 'reserved_name_class_attrs'.

]

{ #category : 'Grail-Tests - Reserved-name class attributes' }
ReservedNameClassAttrTestCase >> testEnumMembersMayUsePseudoVariableNames [
	"``class Logic(Enum): true = True; false = False'' -- test_enum
	TestSpecial.test_bool, which reported the codegen gap for the whole class."

	self assert: (self resultAt: 'enum_members') asString equals: 'true,false'.
	self assert: (self resultAt: 'enum_true_value') equals: true.
	self assert: (self resultAt: 'enum_truthy').
	self assert: (self resultAt: 'enum_names') asString
		equals: 'nil,self,super,thisContext'.

]

{ #category : 'Grail-Tests - Reserved-name class attributes' }
ReservedNameClassAttrTestCase >> testPerClassStorageStillIsolated [
	"Smalltalk class-side instVars are per-class storage, which is what gives
	Python's ``A.attr != B.attr''.  Mangling the slot must not merge them."

	self assert: (self resultAt: 'sub_override') equals: 42.
	self assert: (self resultAt: 'parent_intact') equals: 100.

]

{ #category : 'Grail-Tests - Reserved-name class attributes' }
ReservedNameClassAttrTestCase >> testReadsEveryPseudoVariableName [
	"All six pseudo-variable names, plus an ordinary one, read back their
	class-body values.  The class used to fail to compile outright."

	self assert: (self resultAt: 'read') asString equals: '1,2,3,4,5,6,7'.

]

{ #category : 'Grail-Tests - Reserved-name class attributes' }
ReservedNameClassAttrTestCase >> testRealClassNameUntouched [
	"The mangling exists so a Python attribute cannot overwrite the class's
	structural slots; the class's own name still reads correctly."

	self assert: (self resultAt: 'class_name') asString equals: 'Plain'.

]

{ #category : 'Grail-Tests - Reserved-name class attributes' }
ReservedNameClassAttrTestCase >> testStoreThroughMangledSlot [
	"``Plain.true = 100'' dispatches to the accessor pair and lands in the
	mangled backing slot."

	self assert: (self resultAt: 'after_store') equals: 100.

]
