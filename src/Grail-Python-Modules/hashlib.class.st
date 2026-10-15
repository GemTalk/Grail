"Python hashlib module — secure hash and message digest algorithms.

Implementation note: each algorithm function (``md5``, ``sha1``,
``sha256``, etc.) returns a ``Hash`` instance.  Output sizes and
block sizes match CPython.  Algorithms backed directly by
GemStone's built-in ``ByteArray >> *sumBytes`` primitives — no
external dependencies."
Class {
	#name : 'hashlib',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
