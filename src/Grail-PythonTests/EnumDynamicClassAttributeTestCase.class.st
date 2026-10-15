Class {
	#name : 'EnumDynamicClassAttributeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDynamicClassAttributeTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
EnumDynamicClassAttributeTestCase >> setUp [
	"Reload tests/python/enum_dynamic_class_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dynamic_class_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dynamic_class_attribute.py')
		name: 'enum_dynamic_class_attribute'.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
EnumDynamicClassAttributeTestCase >> testAnOrdinaryPropertyStillAnswersItself [
	"Guard rail.  The builtin property must keep CPython's class-access
	behaviour -- answering the descriptor is what makes C.prop.fget work."

	self assert: (self check: #'an_ordinary_property_still_answers_itself') equals: true.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumDynamicClassAttributeTestCase >> testClassAccessIsRefused [
	"The entire point of the descriptor, and the one place it parts company
	with its superclass."

	self assert: (self check: #'class_access_is_refused') equals: true.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumDynamicClassAttributeTestCase >> testInstanceAccessRunsTheGetter [
	self assert: (self check: #'instance_access_runs_the_getter') equals: true.

]

{ #category : 'Grail-Tests - Module identity' }
EnumDynamicClassAttributeTestCase >> testItReportsTheNameItIsExportedUnder [
	"__module__ / __qualname__ are how a class is pickled BY REFERENCE.  Without
	them pickle SCANS sys.modules for a module exposing the object under its
	__qualname__, so the answer depends on what an earlier import brought in --
	which is exactly what made EnumPickleByNameTestCase order-dependent when
	this class was introduced."

	self assert: (self check: #'it_reports_the_name_it_is_exported_under') equals: true.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumDynamicClassAttributeTestCase >> testItWorksOnAPlainClassToo [
	"Nothing about it is enum-specific; enum is just its motivating user."

	self assert: (self check: #'it_works_on_a_plain_class_too') equals: true.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumDynamicClassAttributeTestCase >> testTheTwoAreDifferentClasses [
	"Which is what lets inspect sweep for one and not the other."

	self assert: (self check: #'the_two_are_different_classes') equals: true.

]
