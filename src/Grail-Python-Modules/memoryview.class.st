"A VIEW over another object's bytes, as CPython's memoryview is.

``memoryview' used to be an identity stub -- builtins>>memoryview: answered its
argument unchanged -- whose own comment said ""revisit when something actually
trips this"".  Something did: wave.py's _write_frames does
``memoryview(data).cast('B')' for any non-bytes buffer, so
``f.writeframes(array.array('h', frames))' raised
``'_array' object has no attribute 'cast''.  That message names the wrong
thing -- neither CPython's array nor its bytes has ``cast'; memoryview has it,
and Grail had no memoryview to have it on.

A VIEW, NOT A COPY.  The source object is held and its bytes are re-derived on
every content read, so a mutation through the source is visible through the view
(and ``cast' re-derives from the same source rather than from a snapshot).  A
copying implementation would have been much simpler and would have passed the
tests that prompted this, while quietly lying about the one property the type
exists to provide.

The fixed METADATA (format, itemsize, nbytes, shape) is captured at construction.
That is not a shortcut: CPython forbids resizing an object while a view over it
is exported, so the length cannot change under a live view.

Scope, stated rather than discovered later:
  * ONE-DIMENSIONAL only.  ndim is always 1; CPython's multi-dimensional views
    (from arrays with shape/strides) are not modelled.  A stepped slice IS: it
    carries its stride in ``_step'.
  * Integer formats only -- B b H h I i L l Q q -- plus the native-order
    assumption that Grail runs little-endian.  'f'/'d' and the struct
    modifiers raise ValueError from cast rather than answering wrong numbers.
  * The source must be bytes-like: a ByteArray (bytes/bytearray) or anything
    answering ``tobytes' (array.array).  Anything else is a TypeError, as in
    CPython."
Class {
	#name : 'memoryview',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Converting' }
memoryview >> asByteArray [
	"The Smalltalk side of the buffer protocol.

	This is how Grail's own code asks a Python object for its bytes -- io_module's
	write path is ``(data isKindOf: ByteArray) ifTrue: [data] ifFalse: [data
	asByteArray]'', and fifteen sites across the Python dictionary use the same
	idiom.

	It has to be here, and env 0, because of what replacing the stub did: while
	``memoryview(x)'' answered x unchanged, every one of those sites got a real
	ByteArray for free.  Making memoryview a real type took that away and turned
	five PASSING test_wave tests into ``a memoryview does not understand
	#asByteArray'' -- test_write_memoryview had been passing precisely BECAUSE the
	view was not a view.  A new type that is more correct in Python can still be
	less useful to the Smalltalk that has to consume it; the buffer protocol is
	the bridge, and it is not optional.

	``@env1:'' on the send because this method is env 0 and ___sourceBytes___ is
	env 1: an unannotated send would look in env 0 and miss, which it duly did --
	the same five tests, now reporting ``does not understand
	#___sourceBytes___''.

	``ByteArray withAll:'' for the same reason tobytes uses it: a plain copy of a
	bytearray source stays a bytearray, and a caller asking for a buffer wants
	the immutable one."

	^ ByteArray @env0:withAll: (self @env1:___viewBytes___)

]
