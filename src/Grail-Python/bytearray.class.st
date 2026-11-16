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

{ #category : 'Grail-Constructors' }
bytearray class >> ___constructorName___ [
	"bytearray() refuses its arguments in its own name, not bytes()'s."

	^ 'bytearray'

]

{ #category : 'Grail-Attribute Access' }
bytearray class >> ___grailInstancesHaveNoDict___ [
	"See Object class >> ___grailInstancesHaveNoDict___."

	^ self == bytearray

]

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
bytearray >> insertAll: aCollection at: anIndex [
	"Insert, refusing while a buffer export is live.

	A THIRD funnel, missed as add: was: insert() and the buffer path of
	extend() resize through it without reaching size:.  extend() checked by
	hand; insert() did not, and so went through a live export that CPython
	refuses.  Inserting nothing is no resize (see size:)."

	aCollection isEmpty ifFalse: [self @env1:___refuseIfBufferExported___].
	^ super insertAll: aCollection at: anIndex

]

{ #category : 'Grail-Buffer Protocol' }
bytearray >> removeAtIndex: anIndex [
	"Remove one byte, refusing while a buffer export is live.

	The FOURTH funnel: remove(), pop(i) and ``del b[i]'' shrink through it
	without reaching size:."

	self @env1:___refuseIfBufferExported___.
	^ super removeAtIndex: anIndex

]

{ #category : 'Grail-Buffer Protocol' }
bytearray >> size: anInteger [
	"Resize, refusing while a buffer export is live.

	OVERRIDDEN HERE, on the kernel selector, because it is the funnel most
	resizing operations go through -- clear, extend, append, pop(), resize,
	slice assignment and slice deletion all reach it.  Not all: append goes
	through add:, and insert, remove, pop(i) and ``del b[i]'' through
	insertAll:at: and removeAtIndex:, so those are guarded too.  Guarding
	each operation instead would be a dozen edits and one more waiting for
	the next one added.

	CPython's rule is the buffer protocol's: an object with a live export may
	be read and may have its bytes overwritten, but may NOT be resized, and
	the refusal is a BufferError.  Grail exports in three places:
	bytes>>join:, which holds an export across the materialisation of its
	iterable -- see ___beginBufferExport___ for why a join that mutates its
	own separator otherwise answers silently wrong -- a memoryview entered by
	``with'' (memoryview >> ___holdExportForWith___), and a view a Python
	__release_buffer__ kept, while anything reaches it
	(memoryview >> ___keepExportWhileReachable___).

	Any OTHER memoryview over a bytearray registers no export, although
	CPython refuses a resize while one is alive.  Grail keeps no refcount, so
	it cannot tell a live view from a dropped one without a mark-sweep (20 to
	50 ms; BytesIO>>getbuffer has the measurement).  asyncio's
	StreamReader.read() and readexactly() take
	``bytes(memoryview(self._buffer)[:n])'' and then ``del self._buffer[:n]''
	on every call, so registering the view would make every such call either
	raise BufferError or pay a mark-sweep.  A ``with'' needs neither: it
	releases its view when it ends.

	The check is a SessionTemps lookup and only when the registry exists at
	all, so an ordinary resize pays one nil test.

	Only a CHANGE of size is refused.  Slice assignment sets the size even
	when the slice and its value are the same length, and CPython's
	PyByteArray_Resize answers before its export check when the size does not
	change, so ``b[0:2] = b'zz''' writes in place under a live export."

	anInteger = self size ifFalse: [self @env1:___refuseIfBufferExported___].
	^ super size: anInteger

]
