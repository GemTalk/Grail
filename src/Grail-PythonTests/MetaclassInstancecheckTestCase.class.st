Class {
	#name : 'MetaclassInstancecheckTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassInstancecheckTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
MetaclassInstancecheckTestCase >> setUp [
	"Reload tests/python/metaclass_instancecheck.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_instancecheck' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_instancecheck.py')
		name: 'metaclass_instancecheck'.

]

{ #category : 'Grail-Tests - Reaching the hook' }
MetaclassInstancecheckTestCase >> testAMetaclassMethodMayCallItsSibling [
	"Inside a compiled body ``cls.__subclasscheck__(c)'' is a DIRECT SEND, not an
	attribute load, so it bypasses the attribute path and is picked up where the
	send fails."

	self assert: (self check: #'a_metaclass_method_may_call_its_sibling') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
MetaclassInstancecheckTestCase >> testInheritanceStillWorksNormally [
	self assert: (self check: #'inheritance_still_works_normally') equals: true.

]

{ #category : 'Grail-Tests - The builtins delegate' }
MetaclassInstancecheckTestCase >> testIsinstanceConsultsTheMetaclass [
	"42 is not an Integer by type; the metaclass says it is."

	self assert: (self check: #'isinstance_consults_the_metaclass') equals: true.

]

{ #category : 'Grail-Tests - The builtins delegate' }
MetaclassInstancecheckTestCase >> testIssubclassConsultsTheMetaclass [
	self assert: (self check: #'issubclass_consults_the_metaclass') equals: true.

]

{ #category : 'Grail-Tests - Reaching the hook' }
MetaclassInstancecheckTestCase >> testMroIsCallable [
	"CPython's callable spelling of __mro__, answering a list.  A metaclass
	computing subclass relationships reaches for it."

	self assert: (self check: #'mro_is_callable_and_lists_the_class_first') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
MetaclassInstancecheckTestCase >> testOrdinaryClassesAreUnaffected [
	"Guard rail.  isinstance is the hottest builtin there is: with no recorded
	metaclass there is no hook, and the built-in walk decides exactly as before."

	self assert: (self check: #'ordinary_classes_are_unaffected') equals: true.

]

{ #category : 'Grail-Tests - Reaching the hook' }
MetaclassInstancecheckTestCase >> testTheHookResolvesAsAnAttribute [
	"``Integer.__subclasscheck__'' is a metaclass method bound with the class as
	its cls parameter -- callable directly, not only through issubclass."

	self assert: (self check: #'the_hook_resolves_as_an_attribute') equals: true.

]

{ #category : 'Grail-Tests - The builtins delegate' }
MetaclassInstancecheckTestCase >> testTheTupleFormConsultsItToo [
	"A classinfo tuple recurses per element, so each element reaches the hook."

	self assert: (self check: #'the_tuple_form_consults_it_too') equals: true.

]
