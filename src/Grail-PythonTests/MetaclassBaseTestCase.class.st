Class {
	#name : 'MetaclassBaseTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe',
		'typeProbe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassBaseTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
MetaclassBaseTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_base.py')
		name: 'metaclass_base'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.

]

{ #category : 'Grail-Setup' }
MetaclassBaseTestCase >> setUpTypeObject [
	"The step-2 half of the fixture: ``type'' as a first-class object."

	| testModule |
	testModule := importlib @env1:modules @env1:__getitem__: 'metaclass_base'.
	typeProbe := (testModule @env1:___pyAttrLoad___: #'report_type_object')
		@env1:___pyCallValue___: #() kw: nil.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testAMetaclassIsASubclassOfType [
	"False for as long as ``type'' was a BoundMethod: a class cannot subclass
	one, so nothing linked a metaclass back to ``type''.  This is the answer
	that unblocks reporting a declared ``metaclass='' from type(), which
	___pyMetaclass___ declines to do only because copy()'s atomic test
	``issubclass(type(x), type)'' had no real answer."

	self assert: (self typeAt: 'issubclass_meta') equals: true.

]

{ #category : 'Grail-Tests - The base' }
MetaclassBaseTestCase >> testAMetaclassIsRootedAtType [
	"``Meta.__bases__'' answered ``['PythonInstance']'' -- the substitute the
	redirect used while there was no ``type'' object to name."

	self assert: ((self at: 'meta_bases') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'type' ).

]

{ #category : 'Grail-Tests - Guards' }
MetaclassBaseTestCase >> testAMetaclassIsStillAnOrdinaryClass [
	"Re-rooting must not cost what rooting at PythonInstance bought: the class
	exists, is named, is recognised as a class, and carries its methods --
	which is what a metaclass-defined comparison needs
	(functools.total_ordering's metaclass case)."

	self assert: (self at: 'meta_name') @env0:asString equals: 'Meta'.
	self assert: (self at: 'meta_is_class') equals: true.
	self assert: (self at: 'meta_method') @env0:asString equals: 'shout'.

]

{ #category : 'Grail-Tests - Guards' }
MetaclassBaseTestCase >> testAnOrdinaryClassIsUndisturbed [
	"``type(Plain)'' still answers the canonical ``type'', and a plain class is
	still an instance of it.  The 1-arg builtin is untouched by this step."

	self assert: (self at: 'plain_type') @env0:asString equals: 'type'.
	self assert: (self at: 'plain_is_class') equals: true.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testTypeDictIsAMappingproxy [
	"``type(type.__dict__)'' is how CPython's own test_dict gets hold of the
	mappingproxy TYPE, to assert a dict view's ``.mapping'' is one.
	BoundMethod >> __dict__ carried this while ``type'' was a BoundMethod;
	once it became a class the read went to ___classDict___ (a snapshot dict)
	instead, and test_dict test_views_mapping failed.  The Behavior branch of
	___pyAttrLoad___ now lets type answer for itself."

	self assert: (self typeAt: 'dict_is_proxy') @env0:asString
		equals: 'mappingproxy'.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testTypeIsItselfAClass [
	"``isinstance(type, type)'' and a class-shaped repr.  Both were false
	while the name answered a callable wrapper."

	self assert: (self typeAt: 'isinstance_type') equals: true.
	self assert: (self typeAt: 'repr_is_class') equals: true.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testTypeIsStillCallableInBothSpellings [
	"Becoming a class must not cost the builtin.  Binding the name WITHOUT
	the call protocol broke exactly this -- ``type('NewClass', (object,), {})''
	died with a Smalltalk MessageNotUnderstood -- which is why type's
	value:value:/_new:kw: pair and the name landed together."

	self assert: (self typeAt: 'one_arg') @env0:asString equals: 'int'.
	self assert: (self typeAt: 'three_arg_name') @env0:asString equals: 'NewClass'.
	self assert: (self typeAt: 'three_arg_isclass') equals: true.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testTypeOfAClassIsStillTypeItself [
	"``type(cls) is type''.  The NAME and the CANONICAL ANSWER had to move to
	type together -- moving only the name broke this identity, which is what
	ClassMetaclassIdentityTestCase and OperatorSemantics caught."

	self assert: (self typeAt: 'identity_holds') equals: true.

]

{ #category : 'Grail-Tests - The type object' }
MetaclassBaseTestCase >> testTypeRejectsTheKeywordSpelling [
	"CPython: ``type(name='C', bases=(), dict={})'' is a TypeError."

	self assert: (self typeAt: 'kwargs_rejected') @env0:asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - The base' }
MetaclassBaseTestCase >> testTypeReportsItsPythonName [
	"``type.__name__'' is ''type''.  It now comes from the Smalltalk class name
	directly: the class is CALLED type, following tuple / list / complex /
	dict, so there is nothing to translate.

	It was called PyType at first, on the assumption that ``type'' was too
	generic to claim as a Smalltalk global, and object >>
	___pythonClassNameOrNil___ carried a mapping to hide that.  The assumption
	was wrong -- GemStone takes a lowercase class name, the lowercase Python
	types are the house style, and the name had ALREADY been claimed in the
	Python dictionary the moment ``type'' became a value.  Both the prefix and
	the mapping are gone.  PyDict and PyCell keep theirs, because ``dict'' and
	``cell'' really are taken."

	self assert: (self at: 'type_name') @env0:asString equals: 'type'.

]

{ #category : 'Grail-Private' }
MetaclassBaseTestCase >> typeAt: aKey [
	typeProbe isNil ifTrue: [self setUpTypeObject].
	^ typeProbe @env1:__getitem__: aKey

]
