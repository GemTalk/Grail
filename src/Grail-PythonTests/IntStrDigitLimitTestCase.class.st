"
sys.set_int_max_str_digits (CVE-2020-10735), in every spelling of both
directions.  int -> str is worded without a digit count, and %d,
format(n, 'd' / ',' / '_' / 'n') and b'%d' enforce it; str -> int counts the
digits of the BASE (letters too), resolves base 0 from its prefix, exempts the
power-of-two bases, and leaves an invalid literal to say so -- quoting at most
200 characters, as CPython's %.200R does.

Driven by tests/python/int_str_digit_limit.py, whose EXPECTED table is
CPython 3.14's output.
"
Class {
	#name : 'IntStrDigitLimitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IntStrDigitLimitTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/int_str_digit_limit.py'

]

{ #category : 'Grail-Private' }
IntStrDigitLimitTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
IntStrDigitLimitTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'int_str_digit_limit' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'int_str_digit_limit'.

]

{ #category : 'Grail-Setup' }
IntStrDigitLimitTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'int_str_digit_limit' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
IntStrDigitLimitTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 44.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
