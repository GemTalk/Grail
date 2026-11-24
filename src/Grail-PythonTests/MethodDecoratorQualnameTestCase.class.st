"The __qualname__ a class-body METHOD decorator is handed, in a nested class
(#2291): tests/python/method_decorator_qualname.py, loaded on both codegen
arms and compared with CPython's answers, which the fixture records.

A method-local class's decorators saw ``C.m'' where CPython has
``f.<locals>.C.m'', because the class's own qualname was stamped only after
its body had run -- and the answer is memoized per (class, selector), so
``C.m.__qualname__'' kept the short name afterwards too.  See
ClassDefAst >> ___emitQualnameStoreOn___."
Class {
	#name : 'MethodDecoratorQualnameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'textModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___disagreementsIn___: aModule [
	"The fixture's checks whose result differs from CPython's, as
	``key: got vs want'' strings."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: aModule table: #'r' key: k.
		want := self ___reprOf___: aModule table: #'EXPECTED' key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/method_decorator_qualname.py'

]

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___irModule___ [
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'mdq_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mdq_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'mdq_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___keys___ [
	"Every check the fixture makes; listed here so a check dropped from the
	fixture fails the test rather than quietly passing."

	^ #('module_class' 'plain_and_decorated' 'wraps' 'class_and_static'
	    'property_getter' 'dunder_init' 'nested_class' 'class_in_a_method'
	    'two_functions_deep' 'global_class' 'metaclass_namespace'
	    'enum_member_method')

]

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___reprOf___: aModule table: aName key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: aName) @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
MethodDecoratorQualnameTestCase >> ___textModule___ [
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'mdq_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mdq_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'mdq_text'.
	^ textModule

]

{ #category : 'Grail-Setup' }
MethodDecoratorQualnameTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'mdq_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'mdq_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'mdq_ir'.
	self ___forgetCanonicalModule___: 'mdq_text'.
	irModule := nil.
	textModule := nil.
	super tearDown

]

{ #category : 'Grail-Tests' }
MethodDecoratorQualnameTestCase >> testEveryShapeAgreesWithCPythonOnTheTextArm [
	"The same checks with IR off: the bug was on both arms, and so is the fix."

	| bad |
	bad := self ___disagreementsIn___: self ___textModule___.
	self assert: bad isEmpty
		description: 'method decorator qualnames disagreeing with CPython on the text arm: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
MethodDecoratorQualnameTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	"A decorator in a method-local class, a nested class, a class in a method
	and two functions deep; functools.wraps, stacked decorators, @classmethod,
	@staticmethod, @property and __init__ under one; a ``global'' class, a
	metaclass's namespace and an Enum."

	| bad |
	bad := self ___disagreementsIn___: self ___irModule___.
	self assert: bad isEmpty
		description: 'method decorator qualnames disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
MethodDecoratorQualnameTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"Correct answers on the IR arm prove nothing about it if the module fell
	back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'nothing was compiled through IR'

]
