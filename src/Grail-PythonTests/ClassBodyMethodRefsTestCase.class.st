Class {
	#name : 'ClassBodyMethodRefsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyMethodRefsTestCase >> setUp [
	"Load tests/python/class_body_method_refs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_method_refs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_method_refs.py')
		name: 'class_body_method_refs'.

]

{ #category : 'Grail-Tests' }
ClassBodyMethodRefsTestCase >> testPairCallableWithInstance [
	"``Box.pair[0](instance)'' invokes ``first'' on the instance.
	Unbound BoundMethod (receiver=nil) pops positional[1] as the
	dispatch receiver."

	self assert: testModule @env1:pair_callable_with_instance equals: true

]

{ #category : 'Grail-Tests' }
ClassBodyMethodRefsTestCase >> testPairResolves [
	"``class Box: def first; def second; pair = (first, second)''
	resolves the bare names at class-init time."

	self assert: testModule @env1:pair_resolves equals: true

]

{ #category : 'Grail-Tests' }
ClassBodyMethodRefsTestCase >> testPropertyDescriptorUsesMethods [
	"``x = property(get_x, set_x)'' inside a class body materializes
	a descriptor whose getter / setter dispatch the class-body
	references on the instance."

	self assert: testModule @env1:property_descriptor_uses_methods equals: true

]
