! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _shimtest class (API test module via shim)
expectvalue /Class
doit
module subclass: '_shimtest'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_shimtest comment:
'Test module for the OOP-based CPython API shim.

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
'
%

expectvalue /Class
doit
_shimtest category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_shimtest removeAllMethods.
_shimtest class removeAllMethods.
%

! ===============================================================================
! env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Grail-Private'
classmethod: _shimtest
callTestFloat: aFloat
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_float'
		with: aFloat
%

category: 'Grail-Private'
classmethod: _shimtest
callTestInt: anInteger
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_int'
		with: anInteger
%

category: 'Grail-Private'
classmethod: _shimtest
callTestStringLen: aString
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_string_len'
		with: aString
%

category: 'Grail-Private'
classmethod: _shimtest
callTestListSum: anInteger
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_sum'
		with: anInteger
%

category: 'Grail-Private'
classmethod: _shimtest
callTestListModify: aList value: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_modify'
		with: aList with: aValue
%

category: 'Grail-Private'
classmethod: _shimtest
callTestBoolNot: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bool_not'
		with: aValue
%

category: 'Grail-Private'
classmethod: _shimtest
callTestNone
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_none'
%

category: 'Grail-Private'
classmethod: _shimtest
callTestError
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_error'
%

category: 'Grail-Private'
classmethod: _shimtest
callTestBytesLen: aByteArray
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bytes_len'
		with: aByteArray
%

category: 'Grail-Private'
classmethod: _shimtest
callTestListInsert: aList index: anIndex value: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_insert'
		with: aList with: anIndex with: aValue
%

! ===============================================================================
! env 1 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'

category: 'Grail-Initialization'
method: _shimtest
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: _shimtest
test_float: x
	^ self @env0:class @env0:callTestFloat: x
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_int: n
	^ self @env0:class @env0:callTestInt: n
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_string_len: s
	^ self @env0:class @env0:callTestStringLen: s
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_list_sum: n
	^ self @env0:class @env0:callTestListSum: n
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_list_modify: aList _: val
	^ self @env0:class @env0:callTestListModify: aList value: val
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_bool_not: x
	^ self @env0:class @env0:callTestBoolNot: x
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_none
	^ self @env0:class @env0:callTestNone
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_error
	^ self @env0:class @env0:callTestError
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_bytes_len: b
	^ self @env0:class @env0:callTestBytesLen: b
%

category: 'Grail-Built-in Functions'
method: _shimtest
test_list_insert: aList _: idx _: val
	^ self @env0:class @env0:callTestListInsert: aList index: idx value: val
%

set compile_env: 0
