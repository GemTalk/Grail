! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _crc32c class (C extension module via shim)
expectvalue /Class
doit
module subclass: '_crc32c'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_crc32c comment:
'Python _crc32c C extension module.

Provides CRC32C (Castagnoli) checksum computation.
This wrapper delegates to CPythonShim which calls the C
implementation compiled against cpython.h.

Functions:
  crc32c(data) -> int       Compute CRC32C of bytes data.
  extend(crc, data) -> int  Extend an existing CRC with more data.

Usage (from Python source):
    import _crc32c
    crc = _crc32c.crc32c(b"123456789")   # => 3808858755 (0xE3069283)
'
%

expectvalue /Class
doit
_crc32c category: 'Modules'
%

expectvalue /Metaclass3
doit
_crc32c removeAllMethods.
_crc32c class removeAllMethods.
%

! ===============================================================================
! env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Private'
classmethod: _crc32c
callCrc32c: aByteArray
	"Compute CRC32C of aByteArray via CPythonShim."

	^ CPythonShim current
		callModule: '_crc32c'
		method: 'crc32c'
		withBytes: aByteArray
%

category: 'Private'
classmethod: _crc32c
callExtend: anInteger bytes: aByteArray
	"Extend CRC with more data via CPythonShim."

	^ CPythonShim current
		callModule: '_crc32c'
		method: 'extend'
		extendCrc: anInteger
		withBytes: aByteArray
%

! ===============================================================================
! env 2 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 2

category: 'Python-Initialization'
method: _crc32c
initialize
	self
		initialize_crc32c;
		initialize_extend
%

category: 'Python-Initialization'
method: _crc32c
initialize_crc32c
	"crc32c(data) -> int"
	self ___at___: #crc32c put: [:positional :keywords |
		self ___class___ perform: #'callCrc32c:' env: 0
			withArguments: { positional ___at___: 1 }
	]
%

category: 'Python-Initialization'
method: _crc32c
initialize_extend
	"extend(crc, data) -> int"
	self ___at___: #extend put: [:positional :keywords |
		self ___class___ perform: #'callExtend:bytes:' env: 0
			withArguments: { positional ___at___: 1 . positional ___at___: 2 }
	]
%

category: 'Python-Accessors'
method: _crc32c
crc32c
	^ self ___at___: #crc32c
%

category: 'Python-Accessors'
method: _crc32c
extend
	^ self ___at___: #extend
%

set compile_env: 0
