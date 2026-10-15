"The object answered by ``zlib.decompressobj(wbits)`` - a streaming
inflater over a libz ``z_stream``.

Unlike the one-shot ``uncompress()`` path this drives
inflateInit2_/inflate/inflateEnd directly, so it handles every wbits
CPython does: 8..15 zlib, -8..-15 RAW DEFLATE (what every zip entry
holds), 24..31 gzip, 40..47 auto-detect.  ``zlib.decompress`` is
implemented on top of it, so the two share one code path.

State lives in dynamic instVars: #strm is the 112-byte z_stream
CByteArray (its C address is handed to libz, so the CByteArray must
stay reachable for the life of the object), #eof / #unused / #tail
mirror the CPython ``eof`` / ``unused_data`` / ``unconsumed_tail``
attributes, and #closed records that inflateEnd has run.

LIFETIME CAVEAT: libz mallocs its own window/state, which inflateEnd
frees.  We call inflateEnd as soon as the stream ends or flush() is
called; an object abandoned mid-stream leaks that window until the
gem exits.  Grail has no finalizers to hang it on."
Class {
	#name : 'ZlibDecompress',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
ZlibDecompress class >> ___pythonValueAttrs___ [
	"``d.eof`` / ``d.unused_data`` / ``d.unconsumed_tail`` are CPython
	*attributes*, not methods - read them as values, not BoundMethods.
	ENV-0 so the env-0 respondsTo: probe in ___pyAttrLoad___: finds it."

	^ super ___pythonValueAttrs___
		add: #eof;
		add: #unused_data;
		add: #unconsumed_tail;
		yourself

]
