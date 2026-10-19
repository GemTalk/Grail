Class {
	#name : 'TernaryTruthinessTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
TernaryTruthinessTestCase >> setUp [
	"Reload tests/python/ternary_truthiness.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ternary_truthiness' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ternary_truthiness.py')
		name: 'ternary_truthiness'.

]

{ #category : 'Grail-Tests - Dict' }
TernaryTruthinessTestCase >> testTernaryEmptyDictIsFalsy [
	"{} is falsy."

	self assert: (testModule @env1:ternary_dict_falsy) equals: 'empty'

]

{ #category : 'Grail-Tests - List' }
TernaryTruthinessTestCase >> testTernaryEmptyListIsFalsy [
	"[] is falsy."

	self assert: (testModule @env1:ternary_list_falsy) equals: 'empty'

]

{ #category : 'Grail-Tests - String' }
TernaryTruthinessTestCase >> testTernaryEmptyStringIsFalsy [
	"'' is falsy."

	self assert: (testModule @env1:ternary_string_falsy) equals: 'empty'

]

{ #category : 'Grail-Tests - Tuple' }
TernaryTruthinessTestCase >> testTernaryEmptyTupleIsFalsy [
	"() is falsy."

	self assert: (testModule @env1:ternary_tuple_falsy) equals: 'empty'

]

{ #category : 'Grail-Tests - None' }
TernaryTruthinessTestCase >> testTernaryNoneIsFalsy [
	"None is falsy."

	self assert: (testModule @env1:ternary_none_is_falsy) equals: 'none'

]

{ #category : 'Grail-Tests - Dict' }
TernaryTruthinessTestCase >> testTernaryNonEmptyDictIsTruthy [
	"{'a': 1} is truthy."

	self assert: (testModule @env1:ternary_dict_truthy) equals: 'non-empty'

]

{ #category : 'Grail-Tests - List' }
TernaryTruthinessTestCase >> testTernaryNonEmptyListIsTruthy [
	"[1] is truthy."

	self assert: (testModule @env1:ternary_list_truthy) equals: 'non-empty'

]

{ #category : 'Grail-Tests - String' }
TernaryTruthinessTestCase >> testTernaryNonEmptyStringIsTruthy [
	"'hello' is truthy."

	self assert: (testModule @env1:ternary_string_truthy) equals: 'non-empty'

]

{ #category : 'Grail-Tests - Tuple' }
TernaryTruthinessTestCase >> testTernaryNonEmptyTupleIsTruthy [
	"(1, 2, 3) is truthy."

	self assert: (testModule @env1:ternary_tuple_truthy) equals: 'non-empty'

]

{ #category : 'Grail-Tests - Int' }
TernaryTruthinessTestCase >> testTernaryNonZeroIntIsTruthy [
	"42 is truthy."

	self assert: (testModule @env1:ternary_int_truthy) equals: 'non-zero'

]

{ #category : 'Grail-Tests - Int' }
TernaryTruthinessTestCase >> testTernaryZeroIsFalsy [
	"0 is falsy."

	self assert: (testModule @env1:ternary_int_falsy) equals: 'zero'

]
