Class {
	#name : 'DynamicTypeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-DynamicType' }
DynamicTypeTestCase >> loadFixture [
	"Load tests/python/dynamic_type.py fresh."

	importlib @env1:modules removeKey: #'dynamic_type' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dynamic_type.py')
		name: 'dynamic_type'

]

{ #category : 'Grail-Tests-DynamicType' }
DynamicTypeTestCase >> testDynamicInheritsClassAttr [
	"A class built via ``type('Dyn', (Flagged,), {})`` inherits Flagged's
	class-body data attributes (``enabled = True``, ``label = 'base'``) on
	both the class and its instances.  Regression for werkzeug's
	WrapperTestResponse losing ``implicit_sequence_conversion``."

	| r |
	r := self loadFixture @env1:dynamic_inherits_class_attr.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: (r @env1:__getitem__: 1) equals: true.
	self assert: (r @env1:__getitem__: 2) equals: 'base'.
	self assert: (r @env1:__getitem__: 3) equals: 'base'

]

{ #category : 'Grail-Tests-DynamicType' }
DynamicTypeTestCase >> testDynamicInheritsThroughTwoLevels [
	"``type('Dyn2', (Sub,), {})`` where the attrs live on Sub's parent
	Flagged — mirrors WrapperTestResponse(flask.Response -> werkzeug.Response)."

	| r |
	r := self loadFixture @env1:dynamic_inherits_through_two_levels.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: (r @env1:__getitem__: 1) equals: 'base'

]

{ #category : 'Grail-Tests-DynamicType' }
DynamicTypeTestCase >> testDynamicMultiBase [
	"``type('LoudAnimal', (Animal, Loud), {})`` yields a class whose
	instances answer the primary/storage base's methods (speak/legs)
	AND the merged secondary base's method (shout).  ``isinstance``
	passes for the primary base (Smalltalk inheritance) AND -- since
	classes register their true bases and C3 MRO at creation
	(importlib ___registerBases___:bases:) -- for the secondary base
	too, matching CPython.  (This used to assert false as a documented
	limitation of the copy-down merge.)"

	| r |
	r := self loadFixture @env1:dynamic_multi_base.
	self assert: (r @env1:__getitem__: 0) equals: 'LoudAnimal'.
	self assert: (r @env1:__getitem__: 1) equals: 'generic'.
	self assert: (r @env1:__getitem__: 2) equals: 'LOUD'.
	self assert: (r @env1:__getitem__: 3) equals: 4.
	self assert: (r @env1:__getitem__: 4) equals: true.
	self assert: (r @env1:__getitem__: 5) equals: true

]

{ #category : 'Grail-Tests-DynamicType' }
DynamicTypeTestCase >> testDynamicSingleBase [
	"``type('Solo', (Animal,), {})`` — single base, empty namespace."

	| r |
	r := self loadFixture @env1:dynamic_single_base.
	self assert: (r @env1:__getitem__: 0) equals: 'Solo'.
	self assert: (r @env1:__getitem__: 1) equals: 'generic'

]
