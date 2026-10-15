"Python _crc32c C extension module.

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
    crc = _crc32c.crc32c(b""123456789"")   # => 3808858755 (0xE3069283)

"
Class {
	#name : '_crc32c',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_crc32c class >> callCrc32c: aByteArray [
	"Compute CRC32C of aByteArray via CPythonShim."

	^ CPythonShim current
		callModule: '_crc32c'
		method: 'crc32c'
		withBytes: aByteArray

]

{ #category : 'Grail-Private' }
_crc32c class >> callExtend: anInteger bytes: aByteArray [
	"Extend CRC with more data via CPythonShim."

	^ CPythonShim current
		callModule: '_crc32c'
		method: 'extend'
		extendCrc: anInteger
		withBytes: aByteArray

]
