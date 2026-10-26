"
Canonically equivalent str keys in a dict or set, and the names os.listdir
answers.  Deleting one of '\xa8\u0301' / '\u0385' -- equal under the kernel's
ICU collation, unequal in Python -- must drop that key from the insertion
order as well as the table; os.listdir decodes names from UTF-8 with
surrogateescape for a str path and answers bytes for a bytes path, and
os.fsdecode / os.fsencode use surrogateescape.  Both are what
test_unicode_file_functions reaches on Linux (test_normalize, test_listdir).

Driven by tests/python/equivalent_str_keys_and_listdir.py, whose EXPECTED
table is CPython 3.14's output.
"
Class {
	#name : 'EquivalentStrKeysAndListdirTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EquivalentStrKeysAndListdirTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/equivalent_str_keys_and_listdir.py'

]

{ #category : 'Grail-Private' }
EquivalentStrKeysAndListdirTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
EquivalentStrKeysAndListdirTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'equivalent_str_keys_and_listdir' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'equivalent_str_keys_and_listdir'.

]

{ #category : 'Grail-Setup' }
EquivalentStrKeysAndListdirTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'equivalent_str_keys_and_listdir' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
EquivalentStrKeysAndListdirTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 55.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
