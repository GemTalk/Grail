Class {
	#name : 'DefaultObjectReprTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DefaultObjectReprTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
DefaultObjectReprTestCase >> setUp [
	"Reload tests/python/default_object_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'default_object_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/default_object_repr.py')
		name: 'default_object_repr'.

]

{ #category : 'Grail-Tests - operator reprs by content' }
DefaultObjectReprTestCase >> testAGetterReprsTheSameAfterAPickleRoundtrip [
	"What test_operator asserts, and the reason a content repr is needed rather
	than merely nicer: the roundtripped getter is a DIFFERENT object."

	self assert: (self resultAt: 'roundtrips') asString equals: 'True;True;True;True'.

]

{ #category : 'Grail-Tests - What is left off' }
DefaultObjectReprTestCase >> testANonStringModuleIsDropped [
	"``else if (!PyUnicode_Check(mod)) mod = NULL''.

	This used to be checked through a BOUND METHOD, because Grail's BoundMethod
	answers an UnboundMethod for __module__ and so tripped the guard by
	accident -- without the check it printed ``<anUnboundMethod.BoundMethod
	object at 0x...>''.  BoundMethod has a repr of ITS OWN now and never reaches
	object.__repr__, so the subject moved to a class with an explicitly
	non-string __module__: the same guard, asserted directly, and no longer
	resting on a Grail internal that was free to change.  The string case rides
	alongside so the guard cannot pass by dropping every module."

	self assert: (self resultAt: 'non_string_module').
	self assert: (self resultAt: 'string_module_is_kept').

]

{ #category : 'Grail-Tests - What is left off' }
DefaultObjectReprTestCase >> testAWrittenReprStillWins [
	"Only the DEFAULT changes."

	self assert: (self resultAt: 'own_repr') asString equals: 'mine'.

]

{ #category : 'Grail-Tests - What is left off' }
DefaultObjectReprTestCase >> testBuiltinsIsNotPrinted [
	"CPython's else branch -- object() is ``<object object at 0x...>'', not
	``<builtins.object object at 0x...>''."

	self assert: (self resultAt: 'builtins').
	self assert: (self resultAt: 'builtins_module') asString equals: 'builtins'.

]

{ #category : 'Grail-Tests - The default repr names the object' }
DefaultObjectReprTestCase >> testModuleQualifiedNameAndAddress [
	"Asserted by shape, since the address is the object's own -- which is why
	CPython's tests match a default repr with assertRegex."

	self assert: (self resultAt: 'module_qualified').
	self assert: (self resultAt: 'ends').
	self assert: (self resultAt: 'address_is_id').

]

{ #category : 'Grail-Tests - The default repr names the object' }
DefaultObjectReprTestCase >> testTheNameIsTheQualname [
	"A nested class carries its enclosing class, as __qualname__ does."

	self assert: (self resultAt: 'nested').

]

{ #category : 'Grail-Tests - operator reprs by content' }
DefaultObjectReprTestCase >> testTheThreeGettersReprTheirContents [
	"CPython's spelling exactly: module, class name, and the held arguments."

	self assert: (self resultAt: 'attrgetter') asString
		equals: 'operator.attrgetter(''name'')'.
	self assert: (self resultAt: 'attrgetter_multi') asString
		equals: 'operator.attrgetter(''a'', ''b.c'')'.
	self assert: (self resultAt: 'itemgetter') asString
		equals: 'operator.itemgetter(0)'.
	self assert: (self resultAt: 'itemgetter_multi') asString
		equals: 'operator.itemgetter(1, 2)'.
	self assert: (self resultAt: 'methodcaller') asString
		equals: 'operator.methodcaller(''upper'')'.
	self assert: (self resultAt: 'methodcaller_args') asString
		equals: 'operator.methodcaller(''m'', 1, x=2)'.

]

{ #category : 'Grail-Tests - The default repr names the object' }
DefaultObjectReprTestCase >> testTwoObjectsOfOneClassNoLongerReadAlike [
	"The consequence that matters: an equality test between the reprs of two
	distinct objects used to pass."

	self assert: (self resultAt: 'distinct').
	self assert: (self resultAt: 'same_object').
	self assert: (self resultAt: 'str_matches').

]
