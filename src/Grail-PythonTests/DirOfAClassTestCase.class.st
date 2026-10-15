Class {
	#name : 'DirOfAClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DirOfAClassTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
DirOfAClassTestCase >> setUp [
	"Reload tests/python/dir_of_a_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dir_of_a_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_of_a_class.py')
		name: 'dir_of_a_class'.

]

{ #category : 'Grail-Tests - dir()' }
DirOfAClassTestCase >> testAClassAndItsInstanceAgree [
	"For a class with no instance attributes CPython answers the same list
	either way, because dir(instance) is list(inst.__dict__) + dir(type(inst)).
	The two disagreeing is what made the defect visible: dir(C()) had ``meth''
	and dir(C) did not."

	self assert: (self resultAt: 'dir_of_class_equals_dir_of_instance') asString
		equals: 'True'.

]

{ #category : 'Grail-Tests - inspect' }
DirOfAClassTestCase >> testAnUnboundMethodIsARoutine [
	"``C.meth'' is an UnboundMethod -- what a class hands back where CPython
	hands back a plain function.  isfunction did not know the name, so isroutine
	was False for every method reached through its class."

	self assert: (self resultAt: 'a_class_method_is_a_routine') asString
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests - Kinds' }
DirOfAClassTestCase >> testAPropertyReachedThroughItsClassIsAProperty [
	"``C.prop'' answers the property OBJECT, and the class __dict__ holds the
	same one (object >> ___classDict___ asks ___grailPropertyOrSelf___), so
	classify_class_attrs reports kind 'property' as CPython does.  It was a
	recorded gap reading 'data' while the __dict__ held the getter.  The third
	value pins the INSTANCE path."

	self assert: (self resultAt: 'a_property_reached_through_its_class') asString
		equals: '[''property'', ''property'', 1]'.

]

{ #category : 'Grail-Tests - UserDict' }
DirOfAClassTestCase >> testAUserDictIsNotReversible [
	"REGRESSION GUARD for a bug this EXPOSED rather than caused.
	test_collections asserts dir(UserDict) >= dir(dict), which had been passing
	vacuously because dir(dict) never reported __reversed__.  Upstream's
	UserDict subclasses MutableMapping and inherits ``__reversed__ = None'' from
	Mapping; Grail's is standalone and never said so, so reversed() fell through
	to the SEQUENCE protocol that __len__ and __getitem__ make it look like and
	asked for key 1."

	self assert: (self resultAt: 'reversed_userdict') asString
		equals: 'TypeError: ''UserDict'' object is not reversible'.
	self assert: (self resultAt: 'userdict_has_every_dict_name') asString
		equals: '[]'.

]

{ #category : 'Grail-Tests - inspect' }
DirOfAClassTestCase >> testClassifyClassAttrsNowSeesTheMethods [
	"Listed AND classified -- data stays data, methods become methods, and each
	names the class that actually defines it rather than the one asked."

	self assert: (self resultAt: 'classify_kinds') asString
		equals: '[''data'', ''data'', ''method'', ''method'']'.
	self assert: (self resultAt: 'classify_homes') asString
		equals: '[True, True, True, True]'.

]

{ #category : 'Grail-Tests - dir()' }
DirOfAClassTestCase >> testDirOfAClassListsBothHalves [
	"data / base_data come from the METACLASS chain (a class body's data
	attributes compile to accessors there); meth / inherited / prop / stat /
	cls_m come from the CLASS chain.  Only the first half was ever scanned."

	self assert: (self resultAt: 'dir_of_class_has_every_name') asString
		equals: '[True, True, True, True, True, True, True]'.

]

{ #category : 'Grail-Tests - Kinds' }
DirOfAClassTestCase >> testStaticAndClassMethodsAreDistinguished [
	"``kind'' is read off the __dict__ entry, which is the staticmethod /
	classmethod descriptor, so classify_class_attrs reports 'static method' and
	'class method' as CPython does.  This was a recorded gap: both were stored
	as a plain function and classified 'method'."

	self assert: (self resultAt: 'staticmethod_kind') asString
		equals: '[''static method'', ''class method'']'.

]

{ #category : 'Grail-Tests - inspect' }
DirOfAClassTestCase >> testTheFunctionMethodSplitIsPreserved [
	"The other side of the same coin, and the reason widening isfunction is
	right rather than merely convenient: through an INSTANCE it is a BOUND
	method and NOT a function, which is precisely CPython's split."

	self assert: (self resultAt: 'an_instance_method_is_bound') asString
		equals: '[True, False]'.

]
