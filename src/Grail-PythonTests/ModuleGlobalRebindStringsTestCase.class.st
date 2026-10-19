"Rebinding a module global to a string that GemStone's Unicode collation
calls equal to the old one -- an NFD letter and its precomposed form, an
Arabic-Indic digit and its ASCII twin -- must still rebind it.  The
module-store skip for an unchanged immutable value compared strings with the
kernel ``='', so the old string stayed, and a module-level for loop over
such strings yielded its first element again.

Expectations in tests/python/module_global_rebind_strings.py come from
CPython 3.14.8."
Class {
	#name : 'ModuleGlobalRebindStringsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ModuleGlobalRebindStringsTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
ModuleGlobalRebindStringsTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ModuleGlobalRebindStringsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_global_rebind_strings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_global_rebind_strings.py')
		name: 'module_global_rebind_strings'.

]

{ #category : 'Grail-Tests' }
ModuleGlobalRebindStringsTestCase >> testRebindingToACollationEqualString [
	self assertAll: #('rebound_nfc' 'rebound_digits' 'loop' 'unchanged')

]
