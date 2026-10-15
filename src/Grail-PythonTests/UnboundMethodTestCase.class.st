Class {
	#name : 'UnboundMethodTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-UnboundMethod' }
UnboundMethodTestCase >> loadFixture [
	"Load tests/python/unbound_method.py fresh."

	importlib @env1:modules removeKey: #'unbound_method' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_method.py')
		name: 'unbound_method'

]

{ #category : 'Grail-Tests-UnboundMethod' }
UnboundMethodTestCase >> testExplicitParentMethod [
	"A non-__init__ instance method called unbound via the class:
	``VBase.label(v)''."

	self assert: (self loadFixture @env1:explicit_parent_method) equals: 'vbase'

]

{ #category : 'Grail-Tests-UnboundMethod' }
UnboundMethodTestCase >> testFixedParentInit [
	"``FBase.__init__(self, a)'' runs the fixed-arity parent init."

	| r |
	r := self loadFixture @env1:fixed_parent_init.
	self assert: (r @env1:__getitem__: 0) equals: 5.
	self assert: (r @env1:__getitem__: 1) equals: 't'

]

{ #category : 'Grail-Tests-UnboundMethod' }
UnboundMethodTestCase >> testVarargsParentInit [
	"``VBase.__init__(self, **opts)'' runs VBase's varargs ``___init__:kw:''
	on the subclass instance — the inherited no-op ``object.__init__'' must
	not shadow it."

	| r |
	r := self loadFixture @env1:varargs_parent_init.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: 't'.
	self assert: (r @env1:__getitem__: 2) equals: 9

]
