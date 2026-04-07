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
_shimtest category: 'Modules'
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

category: 'Private'
classmethod: _shimtest
callTestFloat: aFloat
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_float'
		with: aFloat
%

category: 'Private'
classmethod: _shimtest
callTestInt: anInteger
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_int'
		with: anInteger
%

category: 'Private'
classmethod: _shimtest
callTestStringLen: aString
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_string_len'
		with: aString
%

category: 'Private'
classmethod: _shimtest
callTestListSum: anInteger
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_sum'
		with: anInteger
%

category: 'Private'
classmethod: _shimtest
callTestListModify: aList value: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_modify'
		with: aList with: aValue
%

category: 'Private'
classmethod: _shimtest
callTestBoolNot: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bool_not'
		with: aValue
%

category: 'Private'
classmethod: _shimtest
callTestNone
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_none'
%

category: 'Private'
classmethod: _shimtest
callTestError
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_error'
%

category: 'Private'
classmethod: _shimtest
callTestBytesLen: aByteArray
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_bytes_len'
		with: aByteArray
%

category: 'Private'
classmethod: _shimtest
callTestListInsert: aList index: anIndex value: aValue
	^ CPythonShim current
		callModule: '_shimtest' method: 'test_list_insert'
		with: aList with: anIndex with: aValue
%

! ===============================================================================
! env 2 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _shimtest
initialize
	self
		initialize_test_float;
		initialize_test_int;
		initialize_test_string_len;
		initialize_test_list_sum;
		initialize_test_list_modify;
		initialize_test_bool_not;
		initialize_test_none;
		initialize_test_error;
		initialize_test_bytes_len;
		initialize_test_list_insert
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_float
	self ___at___: #test_float put: [:positional :keywords |
		self ___class___ @env0:callTestFloat: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_int
	self ___at___: #test_int put: [:positional :keywords |
		self ___class___ @env0:callTestInt: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_string_len
	self ___at___: #test_string_len put: [:positional :keywords |
		self ___class___ @env0:callTestStringLen: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_list_sum
	self ___at___: #test_list_sum put: [:positional :keywords |
		self ___class___ @env0:callTestListSum: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_list_modify
	self ___at___: #test_list_modify put: [:positional :keywords |
		self ___class___ @env0:callTestListModify: (positional ___at___: 1) value: (positional ___at___: 2)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_bool_not
	self ___at___: #test_bool_not put: [:positional :keywords |
		self ___class___ @env0:callTestBoolNot: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_none
	self ___at___: #test_none put: [:positional :keywords |
		self ___class___ @env0:callTestNone
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_error
	self ___at___: #test_error put: [:positional :keywords |
		self ___class___ @env0:callTestError
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_bytes_len
	self ___at___: #test_bytes_len put: [:positional :keywords |
		self ___class___ @env0:callTestBytesLen: (positional ___at___: 1)
	]
%

category: 'Python-Initialization'
method: _shimtest
initialize_test_list_insert
	self ___at___: #test_list_insert put: [:positional :keywords |
		self ___class___ @env0:callTestListInsert: (positional ___at___: 1) index: (positional ___at___: 2) value: (positional ___at___: 3)
	]
%

category: 'Python-Accessors'
method: _shimtest
test_float
	^ self ___at___: #test_float
%

category: 'Python-Accessors'
method: _shimtest
test_int
	^ self ___at___: #test_int
%

category: 'Python-Accessors'
method: _shimtest
test_string_len
	^ self ___at___: #test_string_len
%

category: 'Python-Accessors'
method: _shimtest
test_list_sum
	^ self ___at___: #test_list_sum
%

category: 'Python-Accessors'
method: _shimtest
test_list_modify
	^ self ___at___: #test_list_modify
%

category: 'Python-Accessors'
method: _shimtest
test_bool_not
	^ self ___at___: #test_bool_not
%

category: 'Python-Accessors'
method: _shimtest
test_none
	^ self ___at___: #test_none
%

category: 'Python-Accessors'
method: _shimtest
test_error
	^ self ___at___: #test_error
%

category: 'Python-Accessors'
method: _shimtest
test_bytes_len
	^ self ___at___: #test_bytes_len
%

category: 'Python-Accessors'
method: _shimtest
test_list_insert
	^ self ___at___: #test_list_insert
%

set compile_env: 0
