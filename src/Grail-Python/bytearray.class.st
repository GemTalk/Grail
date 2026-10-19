"Python bytearray type - mutable sequence of bytes.

This is the mutable variant of bytes. It inherits all methods from ByteArray
(which implements Python's bytes type) but allows mutation through __setitem__
and provides additional mutation methods like append, extend, insert, etc.

Unlike bytes (ByteArray), bytearray instances can be modified in place.

"
Class {
	#name : 'bytearray',
	#superclass : 'bytes',
	#category : 'Grail-Collections-Ordered'
}

{ #category : 'Grail-Buffer Protocol' }
bytearray >> add: aByte [
	"Append one byte, refusing while a buffer export is live.

	A SECOND funnel, and finding it is the point: ``size:'' is not the only
	way a bytearray grows.  append() goes through ``add:'' and extend()
	through append(), so guarding size: alone refused clear() and pop() while
	letting extend() and append() through -- one rule with two
	implementations and only one of them applied, which is the shape of bug
	this whole guard exists to prevent.  The fixture probes all four for that
	reason."

	self @env1:___refuseIfBufferExported___.
	^ super add: aByte

]

{ #category : 'Grail-Buffer Protocol' }
bytearray >> size: anInteger [
	"Resize, refusing while a buffer export is live.

	OVERRIDDEN HERE, on the kernel selector, because it is the ONE funnel
	every resizing operation goes through -- clear, extend, append, pop,
	insert, remove, resize, slice assignment and __delitem__ all reach it.
	Guarding each of them instead would be nine edits and a tenth waiting for
	the next one added.

	CPython's rule is the buffer protocol's: an object with a live export may
	be read and may have its bytes overwritten, but may NOT be resized, and
	the refusal is a BufferError.  Grail has no buffer protocol; the one place
	it matters so far is bytes>>join:, which holds an export across the
	materialisation of its iterable -- see ___beginBufferExport___ for why a
	join that mutates its own separator otherwise answers silently wrong.

	The check is a SessionTemps lookup and only when the registry exists at
	all, so an ordinary resize pays one nil test."

	self @env1:___refuseIfBufferExported___.
	^ super size: anInteger

]
