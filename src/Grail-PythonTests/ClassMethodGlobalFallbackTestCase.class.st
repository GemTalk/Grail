Class {
	#name : 'ClassMethodGlobalFallbackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'consumerModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassMethodGlobalFallbackTestCase >> setUp [

	| mods |
	mods := importlib @env1:modules.
	#( 'pkg_class_global' 'pkg_class_global._source' 'pkg_class_global._consumer' ) do: [:n |
		mods removeKey: n asSymbol ifAbsent: []].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/__init__.py')
		name: 'pkg_class_global'.
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/_source.py')
		name: 'pkg_class_global._source'.
	consumerModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/_consumer.py')
		name: 'pkg_class_global._consumer'.

]

{ #category : 'Grail-Tests' }
ClassMethodGlobalFallbackTestCase >> testDynamicGlobalReadable [
	"A class method reading a module global that was injected at
	runtime by `globals().update(...)` — the case that previously
	failed to compile because NameAst's class-method codegen
	emitted a bare identifier."

	| classifier |
	classifier := consumerModule @env1:Classifier new.
	self assert: (classifier @env1:is_dyn_a: 0) equals: true.
	self assert: (classifier @env1:is_dyn_b: 1) equals: true.
	self assert: (classifier @env1:is_dyn_a: 1) equals: false.

]

{ #category : 'Grail-Tests' }
ClassMethodGlobalFallbackTestCase >> testKindDispatch [
	"Mirrors the re._parser idiom: chained `if op is X:` against
	multiple dynamic and static globals."

	| classifier |
	classifier := consumerModule @env1:Classifier new.
	self assert: (classifier @env1:kind: 0) equals: 'a'.
	self assert: (classifier @env1:kind: 1) equals: 'b'.
	self assert: (classifier @env1:kind: 99) equals: 'static'.
	self assert: (classifier @env1:kind: 42) equals: 'unknown'.

]

{ #category : 'Grail-Tests' }
ClassMethodGlobalFallbackTestCase >> testStaticGlobalReadable [
	"A class method reading a statically-declared module global
	works on both the old codegen and the new — sanity check that
	the fix didn't regress the easy case."

	| classifier |
	classifier := consumerModule @env1:Classifier new.
	self assert: (classifier @env1:is_static: 99) equals: true.
	self assert: (classifier @env1:is_static: 0) equals: false.

]
