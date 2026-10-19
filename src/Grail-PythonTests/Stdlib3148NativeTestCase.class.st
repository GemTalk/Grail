"CPython 3.14.8 behaviour of zlib (libz's own error text; flush on a corrupt
stream), exception member attributes (del resets them to None), and libexpat
2.8.5 as Grail's pure-Python pyexpat models it (XML declaration version and
syntax, characters XML refuses, byte-order-mark columns, UTF-16 surrogates).

Every expectation in tests/python/stdlib_3148_native.py was produced by
CPython 3.14.8 with its bundled expat 2.8.5."
Class {
	#name : 'Stdlib3148NativeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
Stdlib3148NativeTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
Stdlib3148NativeTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
Stdlib3148NativeTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stdlib_3148_native' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stdlib_3148_native.py')
		name: 'stdlib_3148_native'.

]

{ #category : 'Grail-Tests' }
Stdlib3148NativeTestCase >> testExceptionMembers [
	self assertAll: #('members' 'suppress_context')

]

{ #category : 'Grail-Tests' }
Stdlib3148NativeTestCase >> testExpat [
	self assertAll: #('expat_versions' 'expat_declarations' 'expat_characters'
		'expat_surrogates' 'expat_text_declarations')

]

{ #category : 'Grail-Tests' }
Stdlib3148NativeTestCase >> testZlib [
	self assertAll: #('zlib')

]
