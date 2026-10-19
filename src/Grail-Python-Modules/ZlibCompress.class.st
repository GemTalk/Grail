"The object answered by ``zlib.compressobj(...)`` - a streaming deflater
over a libz ``z_stream``, the compressing half of ZlibDecompress.

It drives deflateInit2_/deflate/deflateEnd over the same 112-byte
z_stream, so every option CPython passes reaches libz, and libz is what
judges it: a bad level, method, wbits or memLevel comes back from
deflateInit2_ as Z_STREAM_ERROR, reported as CPython reports it
(ValueError: Invalid initialization option).  There is no second set of
range checks here to disagree with libz.

This is what CPython's zipfile and tarfile need to WRITE a deflated
archive.  zipfile asks for compressobj(level, DEFLATED, -15): raw deflate,
exactly what a zip entry holds.

State lives in dynamic instVars: #stream is the z_stream CByteArray (libz
holds its address, so it must stay reachable), and #finished records that
a Z_FINISH flush has handed libz its state back.  Past that point the
object is spent, as CPython's is, and using it again raises the same
zlib.error CPython raises.

zdict (deflateSetDictionary) is not wired: it raises NotImplementedError
rather than silently compressing without the dictionary."
Class {
	#name : 'ZlibCompress',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}
