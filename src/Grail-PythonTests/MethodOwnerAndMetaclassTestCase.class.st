"Tests that a method reached off a class names the class that DEFINES it, and
that a Grail protocol fallback on the universal roots does not outrank a real
metaclass method.  Drives tests/python/method_owner_and_metaclass.py."
Class {
	#name : 'MethodOwnerAndMetaclassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodOwnerAndMetaclassTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
MethodOwnerAndMetaclassTestCase >> setUp [
	"Reload tests/python/method_owner_and_metaclass.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'method_owner_and_metaclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/method_owner_and_metaclass.py')
		name: 'method_owner_and_metaclass'.

]

{ #category : 'Grail-Tests - Bound or unbound' }
MethodOwnerAndMetaclassTestCase >> testAllFourEnumMetaclassMethodsAreBound [
	"All four, because the bug was the SPLIT: __len__ is the one selector no
	universal root happens to define, so it alone reached the metaclass and the
	other three did not.  A fix that only moved one of them would look right in
	isolation."

	self assert: (self resultAt: 'all_bound') asString
		equals: '[True, True, True, True]'.
	self assert: (self resultAt: 'kinds') asString
		equals: '[''static method'', ''static method'', ''static method'', ''static method'']'.
	self assert: (self resultAt: 'homes') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.

]

{ #category : 'Grail-Tests - Which class owns it' }
MethodOwnerAndMetaclassTestCase >> testAnInheritedMethodNamesTheClassThatDefinesIt [
	"``EnumType.__contains__'', not ``Color.__contains__'' and not the two-word
	Smalltalk ``Enum class.__contains__''.  The module matters equally: it is
	the other half of the pair docroutine compares."

	self assert: (self resultAt: 'qualname') asString
		equals: '''EnumType.__contains__'''.
	self assert: (self resultAt: 'module') asString equals: '''enum'''.

]

{ #category : 'Grail-Tests - Bound or unbound' }
MethodOwnerAndMetaclassTestCase >> testAnOrdinaryMethodIsUntouched [
	"The yield fires only for a ROOT fallback.  A real def on a real class still
	reads as the plain function CPython gives -- unbound, kind 'method' -- and
	an inherited one still names the class that defined it."

	self assert: (self resultAt: 'own_method_unbound') asString equals: 'False'.
	self assert: (self resultAt: 'own_method_kind') asString equals: '[''method'']'.
	self assert: (self resultAt: 'own_method_qualname') asString equals: '''Plain.own'''.
	self assert: (self resultAt: 'inherited_method_qualname') asString
		equals: '''Plain.own'''.

]

{ #category : 'Grail-Tests - Bound or unbound' }
MethodOwnerAndMetaclassTestCase >> testTheEnumProtocolStillRuns [
	"Reclassifying how these READ must not change what they DO: len(), in,
	subscript and iteration all route through the same four selectors."

	self assert: (self resultAt: 'len_of_enum') asString equals: '2'.
	self assert: (self resultAt: 'contains') asString equals: 'True'.
	self assert: (self resultAt: 'getitem') asString equals: '1'.
	self assert: (self resultAt: 'iter') asString equals: '[''CYAN'', ''MAGENTA'']'.

]

{ #category : 'Grail-Tests - Which class owns it' }
MethodOwnerAndMetaclassTestCase >> testTheOwnerAgreesWithWhatClassifyClassAttrsReports [
	"Asserted as the COMPARISON rather than as two strings, because agreement is
	the thing that has to hold -- pydoc prints its provenance note precisely
	when it fails, and classify_class_attrs was already answering EnumType while
	the method said Color."

	self assert: (self resultAt: 'agrees_with_homecls') asString equals: 'True'.
	self assert: (self resultAt: 'homecls') asString equals: '''EnumType'''.

]

{ #category : 'Grail-Tests - Bound or unbound' }
MethodOwnerAndMetaclassTestCase >> testTheUnboundTwoArgumentFormStillWorks [
	"The regression the guard exists to prevent.  object.__getattribute__ is
	defined ON object, so an unrestricted ``does the class side define this''
	check answers yes and rebinds it -- and CPython's two-argument unbound call
	then raises ``takes a different number of arguments (2 given)''."

	self assert: (self resultAt: 'getattribute_unbound_call') asString
		equals: '''Color'''.
	self assert: (self resultAt: 'getattr_still_works') asString equals: '''Color'''.

]
