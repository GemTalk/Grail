Class {
	#name : 'KwargsSplatTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
KwargsSplatTestCase >> setUp [
	"Reload tests/python/kwargs_splat.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'kwargs_splat' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/kwargs_splat.py')
		name: 'kwargs_splat'.

]

{ #category : 'Grail-Tests - Direct receiver' }
KwargsSplatTestCase >> testDirectReceiverDefaultsFire [
	"``receiver('n')'' — defaults fire when nothing passed."

	| result |
	result := testModule @env1:direct_default.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: 'MISSING'

]

{ #category : 'Grail-Tests - Direct receiver' }
KwargsSplatTestCase >> testDirectReceiverExtractsNamedParam [
	"``receiver('n', store_as_param=True, extra='hi')'' — named param
	extracts True; leftover kwargs reach **rest with String key 'extra'."

	| result |
	result := testModule @env1:direct_basic.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 'hi'

]

{ #category : 'Grail-Tests - Key types' }
KwargsSplatTestCase >> testKwargsKeysAreStrings [
	"Iterating ``kwargs.keys()'' yields Python ``str''s — sortable
	by string ordering, matching CPython semantics."

	| result |
	result := testModule @env1:keys_check.
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 'alpha'.
	self assert: (result @env1:__getitem__: 1) equals: 'mid'.
	self assert: (result @env1:__getitem__: 2) equals: 'zeta'

]

{ #category : 'Grail-Tests - Kwonly via splat' }
KwargsSplatTestCase >> testKwonlySplatForwarding [
	"``with_kwonly_splat('n', must_pass=42, also='custom')'' forwards
	to a callee whose ``must_pass'' is keyword-ONLY.  Kwargs must
	reach the kwonly extraction site after splat-forwarding."

	| result |
	result := testModule @env1:kwonly_via_splat.
	self assert: (result @env1:__getitem__: 0) equals: 42.
	self assert: (result @env1:__getitem__: 1) equals: 'custom'

]

{ #category : 'Grail-Tests - Splat forwarding' }
KwargsSplatTestCase >> testSplatForwardsAllArgs [
	"``via_splat('n', store_as_param=True, extra='hi')'' forwards
	through ``receiver(node, *args, **kwargs)''.  Pre-fix the named
	param ``store_as_param'' extracted False because the forwarded
	Symbol-keyed kwargs didn't match the String-keyed includesKey:
	probe in the callee's prologue."

	| result |
	result := testModule @env1:splat_basic.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 'hi'

]

{ #category : 'Grail-Tests - Splat forwarding' }
KwargsSplatTestCase >> testSplatPreservesDefaults [
	"``via_splat('n')'' — empty splat forwards no kwargs; callee
	uses defaults."

	| result |
	result := testModule @env1:splat_default.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: 'MISSING'

]

{ #category : 'Grail-Tests - User kwargs' }
KwargsSplatTestCase >> testUserKwargsGetByStringKey [
	"``def collect(**kwargs): return kwargs.get('a', 'A?')'' —
	the user-visible kwargs must be looked up by Python ``str''
	(string literal in the source)."

	| result |
	result := testModule @env1:collect_present.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2

]

{ #category : 'Grail-Tests - User kwargs' }
KwargsSplatTestCase >> testUserKwargsGetFallsBackToDefault [
	"``kwargs.get('b', 'B?')'' returns 'B?' when 'b' missing."

	| result |
	result := testModule @env1:collect_missing.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 'B?'

]
