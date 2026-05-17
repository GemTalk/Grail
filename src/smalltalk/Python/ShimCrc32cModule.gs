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

Provides CRC32C (Castagnoli) checksum computation. This wrapper
delegates to CPythonShim which calls the C implementation compiled
against cpython.h.

Functions:
  crc32c(data) -> int       Compute CRC32C of bytes data.
  extend(crc, data) -> int  Extend an existing CRC with more data.

Methods on this class are real env-1 fast-path methods, dispatched
directly via `_crc32c.method(args)` Python calls compiled to
`((_crc32c) method: x)` Smalltalk sends.

Usage (from Python source):
    import _crc32c
    crc = _crc32c.crc32c(b"123456789")   # => 3808858755 (0xE3069283)
'
%

expectvalue /Class
doit
_crc32c category: 'Grail-Modules'
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

category: 'Grail-Private'
classmethod: _crc32c
callCrc32c: aByteArray
	"Compute CRC32C of aByteArray via CPythonShim."

	^ CPythonShim current
		callModule: '_crc32c'
		method: 'crc32c'
		withBytes: aByteArray
%

category: 'Grail-Private'
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
! env 1 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'
method: _crc32c
initialize
	"No-op. The `module>>instance` class method still calls
	`initialize` on the newly-created instance, so this stub keeps
	that contract."
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: _crc32c
crc32c: data
	"Python _crc32c.crc32c(data) — fast path. Returns the
	CRC32C of the bytes `data`."

	^ self @env0:class @env0:callCrc32c: data
%

category: 'Grail-Built-in Functions'
method: _crc32c
extend: crc _: data
	"Python _crc32c.extend(crc, data) — fast path. Extends
	the existing CRC with more bytes."

	^ self @env0:class @env0:callExtend: crc bytes: data
%

set compile_env: 0
