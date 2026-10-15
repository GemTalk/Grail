Class {
	#name : 'ClassDictProxyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassDictProxyTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassDictProxyTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_dict_proxy' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_dict_proxy.py')
		name: 'class_dict_proxy'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - The instance side' }
ClassDictProxyTestCase >> testAnInstanceDictIsAPlainDict [
	"The mirror image, and wrong in the opposite direction: an instance
	__dict__ IS a dict in CPython, and Grail reported ``PyInstanceDict'' -- the
	view class that makes a write reach the object's real slots.  It stays a
	view; only the NAME changes, matching what isinstance already said."

	self assert: (self at: 'instance_dict_type') @env0:asString equals: 'dict'.
	self assert: (self at: 'instance_read') @env0:asString equals: 'i'.

]

{ #category : 'Grail-Tests - Reading through' }
ClassDictProxyTestCase >> testASubclassProxyShowsOnlyItsOwnNamespace [
	"``__dict__'' is the class's OWN namespace, never a flattening of the MRO
	-- inherited names are reached through the chain, not through here.  This
	is what tells a real proxy from a convenience merge."

	self assert: ((self at: 'subclass_own') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'true' 'false' ).

]

{ #category : 'Grail-Tests - The proxy' }
ClassDictProxyTestCase >> testEveryClassDictIsAMappingproxy [
	"Not just ``type''.  ``type(C.__dict__)'' answered ``dict'' for every class
	but that one, because the branch handed back the ___classDict___ snapshot."

	self assert: (self at: 'class_dict_type') @env0:asString
		equals: 'mappingproxy'.
	self assert: (self at: 'subclass_dict_type') @env0:asString
		equals: 'mappingproxy'.

]

{ #category : 'Grail-Tests - The proxy' }
ClassDictProxyTestCase >> testTheProxyIsReadOnly [
	"``C.__dict__['y'] = 2'' is a TypeError.  It used to SUCCEED against a
	throwaway snapshot -- the worse failure, because the store appeared to work
	and then vanished."

	self assert: (self at: 'store_rejected') @env0:asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - Reading through' }
ClassDictProxyTestCase >> testTheProxyStillReadsTheClassBody [
	"Read-only must not mean opaque: membership and subscript still see the
	class body, attributes and methods alike."

	self assert: (self at: 'has_attr') equals: true.
	self assert: (self at: 'has_method') equals: true.
	self assert: (self at: 'read_through') @env0:asString equals: '1'.

]

{ #category : 'Grail-Tests - The proxy' }
ClassDictProxyTestCase >> testTypeKeepsItsOwnProxy [
	"The special case that came first still holds.  CPython's test_dict
	test_views_mapping reaches through ``type.__dict__'' to get the
	mappingproxy TYPE, so this one must not regress while the general case
	lands."

	self assert: (self at: 'type_dict_type') @env0:asString
		equals: 'mappingproxy'.

]
