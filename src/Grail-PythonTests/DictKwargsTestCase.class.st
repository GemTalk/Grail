Class {
	#name : 'DictKwargsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
DictKwargsTestCase >> setUp [
	"Reload tests/python/dict_kwargs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dict_kwargs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_kwargs.py')
		name: 'dict_kwargs'.

]

{ #category : 'Grail-Tests - String key lookup' }
DictKwargsTestCase >> testDictFromKwargsAllowsStringKeyLookup [
	"``dict(name='World', greeting='Hello')'' then ``d['name']''
	must return 'World'.  Pre-fix the lookup KeyError'd because
	the dict had Symbol keys."

	| result |
	result := testModule @env1:dict_from_kwargs.
	self assert: (result @env1:__getitem__: 0) equals: 'World'.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello'

]

{ #category : 'Grail-Tests - in operator' }
DictKwargsTestCase >> testDictFromKwargsContainmentByStringKey [
	"``'x' in dict(x=1)'' is True.  ``in'' uses string equality."

	self assert: (testModule @env1:dict_kwargs_key_type) equals: true

]

{ #category : 'Grail-Tests - get with default' }
DictKwargsTestCase >> testDictFromKwargsGetMissingReturnsDefault [
	"``d.get('missing', 'fallback')'' returns the default when the
	string key isn't present.  Confirms the lookup uses string
	equality, not symbol identity."

	self assert: (testModule @env1:dict_kwargs_get_default) equals: 'fallback'

]

{ #category : 'Grail-Tests - keys() iteration' }
DictKwargsTestCase >> testDictFromKwargsKeysAreStrings [
	"Iterating ``dict(a=1, b=2).keys()'' yields Python ``str''
	values, sortable by string ordering."

	| result |
	result := testModule @env1:dict_kwargs_iteration.
	self assert: result size equals: 2.
	self assert: (result @env1:__getitem__: 0) equals: 'a'.
	self assert: (result @env1:__getitem__: 1) equals: 'b'

]

{ #category : 'Grail-Tests - merged dict + kwargs' }
DictKwargsTestCase >> testDictMergedPositionalAndKwargsStringKeys [
	"``dict({'a': 1}, b=2)'' merges positional dict + kwargs.
	Both keys are accessible via string lookup."

	| result |
	result := testModule @env1:dict_kwargs_merged_with_positional.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2

]
