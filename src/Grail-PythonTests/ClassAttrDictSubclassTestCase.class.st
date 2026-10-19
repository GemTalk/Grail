Class {
	#name : 'ClassAttrDictSubclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ClassAttr' }
ClassAttrDictSubclassTestCase >> loadFixture [
	"Load tests/python/class_attr_dict_subclass.py fresh."

	importlib @env1:modules removeKey: #'class_attr_dict_subclass' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_dict_subclass.py')
		name: 'class_attr_dict_subclass'

]

{ #category : 'Grail-Tests-ClassAttr' }
ClassAttrDictSubclassTestCase >> testClassReadsOwnClassAttr [
	"``Flags.flag`` / ``Flags.accessed`` — the class object itself reads
	the class-body data attributes as values (not BoundMethods)."

	| r |
	r := self loadFixture @env1:class_reads_own_class_attr.
	self assert: (r @env1:__getitem__: 0) equals: false.
	self assert: (r @env1:__getitem__: 1) equals: true

]

{ #category : 'Grail-Tests-ClassAttr' }
ClassAttrDictSubclassTestCase >> testInstanceAttrOverridesClassDefault [
	"A ``self.flag = True`` write shadows the class-body default; the
	other class attribute still reads its default."

	| r |
	r := self loadFixture @env1:instance_attr_overrides_class_default.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: (r @env1:__getitem__: 1) equals: true

]

{ #category : 'Grail-Tests-ClassAttr' }
ClassAttrDictSubclassTestCase >> testInstanceReadsOwnClassAttr [
	"``Flags().flag`` / ``Flags().accessed`` — a dict-subclass instance
	reads its class-body data attributes (the flask session shape)."

	| r |
	r := self loadFixture @env1:instance_reads_own_class_attr.
	self assert: (r @env1:__getitem__: 0) equals: false.
	self assert: (r @env1:__getitem__: 1) equals: true

]

{ #category : 'Grail-Tests-ClassAttr' }
ClassAttrDictSubclassTestCase >> testListSubclassInstanceAttr [
	"``class ListFlags(list): marker = 42`` — the same fix covers a
	``list`` subclass (OrderedCollection-backed) instance."

	| r |
	r := self loadFixture @env1:list_subclass_instance_attr.
	self assert: r equals: 42

]
