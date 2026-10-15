Class {
	#name : 'ClassDecoratorTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassDecoratorTestCase >> setUp [

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_decorators' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_decorators.py')
		name: 'class_decorators'.

]

{ #category : 'Grail-Tests - Class Decorators' }
ClassDecoratorTestCase >> testClassUnchangedAfterDecoration [
	"@record_simple returned the class unchanged; class attrs still
	work afterwards."

	self assert: (testModule @env1:simple_base_still) equals: 7.

]

{ #category : 'Grail-Tests - Class Decorators' }
ClassDecoratorTestCase >> testDecoratorCanReplaceClass [
	"A decorator that returns a non-class object rebinds the name
	to that object — @replace_with_int makes Replaced the int 42."

	self assert: (testModule @env1:replaced_value) equals: 42.

]

{ #category : 'Grail-Tests - Class Decorators' }
ClassDecoratorTestCase >> testDecoratorFactory [
	"@record_param('alpha') ran and recorded the parameter."

	self assert: (testModule @env1:log_param_alpha) equals: true.

]

{ #category : 'Grail-Tests - Class Decorators' }
ClassDecoratorTestCase >> testSimpleDecoratorRuns [
	"@record_simple ran and saw Simple.BASE=7 at decoration time."

	self assert: (testModule @env1:log_simple_7) equals: true.

]

{ #category : 'Grail-Tests - Class Decorators' }
ClassDecoratorTestCase >> testStackedDecorators [
	"Stacked decorators apply bottom-up: @record_simple wraps
	@record_param('chained'); both run on the class."

	self assert: (testModule @env1:log_param_chained) equals: true.
	self assert: (testModule @env1:log_simple_9) equals: true.

]
