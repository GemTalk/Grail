"Python zlib module backed by the system libz via CCallout.

DECOMPRESSION is complete.  decompressobj(wbits) answers a
ZlibDecompress driving inflateInit2_/inflate/inflateEnd over a real
z_stream, so every windowBits CPython accepts works: 8..15 zlib,
-8..-15 RAW DEFLATE (what a zip entry holds), 24..31 gzip, 40..47
auto-detect.  decompress(data, wbits, bufsize) is implemented ON TOP
of it, so the one-shot and streaming paths cannot drift apart.

COMPRESSION is complete too.  compressobj(...) answers a ZlibCompress
driving deflateInit2_/deflate/deflateEnd over the same z_stream - the
half zipfile and tarfile need to WRITE a deflated archive.
compress(data, level) stays one-shot, over compress2() in the standard
zlib format.

crc32 and adler32 are exposed; ZLIB_VERSION is not.

The CLibrary/CCallout handles wrap per-process C state, so they are
cached in SessionTemps (never committed) and rebuilt lazily in each
fresh session - the same disease the CPythonShim singleton has with
gcMalloc buffers."
Class {
	#name : 'zlib',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
