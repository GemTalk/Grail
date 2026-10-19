"Test module for the OOP-based CPython API shim.

Each function exercises a specific API feature so we can verify
correctness mechanically. Functions:
  test_float(x) -> x * 2.0
  test_int(n) -> n + 1
  test_string_len(s) -> len(s)
  test_list_sum(n) -> sum of [1..n]
  test_list_modify(list, val) -> new size
  test_bool_not(x) -> not x
  test_none() -> None
  test_error() -> raises ValueError
  test_bytes_len(b) -> len(b)
  test_list_insert(list, idx, val) -> None

"
Class {
	#name : '_shimtest',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_shimtest class >> callTestBoolNot: aValue [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bool_not'
		with: aValue

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestBytesLen: aByteArray [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bytes_len'
		with: aByteArray

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestError [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_error'

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestFloat: aFloat [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_float'
		with: aFloat

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestInt: anInteger [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_int'
		with: anInteger

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestListInsert: aList index: anIndex value: aValue [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_insert'
		with: aList with: anIndex with: aValue

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestListModify: aList value: aValue [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_modify'
		with: aList with: aValue

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestListSum: anInteger [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_sum'
		with: anInteger

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestNone [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_none'

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestSilentRaise: aDict key: aKey [
	"Reach test_silent_raise from PYTHON.

	It exists so a Python `try/except' or `try/finally' can be wrapped around a
	shim call whose CALLBACK raises a Smalltalk kernel exception with the error
	left pending -- the one shape that reaches the user-action boundary with the
	C frame still live.  Every other route into this module raises a Python
	exception instead, which travels by the shim's own error indicator and never
	exercises the boundary at all.  See scripts/probe_handler_recursion.gs."

	^ CPythonShim current
		callModule: '_shimtest' method: 'test_silent_raise'
		with: aDict with: aKey

]

{ #category : 'Grail-Private' }
_shimtest class >> callTestStringLen: aString [
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_string_len'
		with: aString

]
