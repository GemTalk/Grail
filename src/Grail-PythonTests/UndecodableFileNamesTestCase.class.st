"
File names that are not valid UTF-8, and bytes paths, through every os and
os.path function: a surrogate-escaped str (as os.listdir answers such a name)
and a bytes path reach the file they name, os.path keeps the surrogates, and
chmod, utime, symlink and readlink go through libc rather than the shell.
On macOS, which refuses such names, creating one is EILSEQ as in CPython.

Driven by tests/python/undecodable_file_names.py, whose EXPECTED table is
CPython 3.14's output and reads the same on macOS and Linux.
"
Class {
	#name : 'UndecodableFileNamesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
UndecodableFileNamesTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/undecodable_file_names.py'

]

{ #category : 'Grail-Private' }
UndecodableFileNamesTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
UndecodableFileNamesTestCase >> setUp [
	(importlib @env1:modules) removeKey: #'undecodable_file_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'undecodable_file_names'.

]

{ #category : 'Grail-Setup' }
UndecodableFileNamesTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'undecodable_file_names' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
UndecodableFileNamesTestCase >> testEveryRowMatchesCPython [
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 50.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString

]
