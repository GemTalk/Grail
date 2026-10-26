"""``zlib._ZlibDecompressor``, written over ``zlib.decompressobj``.

CPython 3.12 added _ZlibDecompressor to its C zlib module: a decompressor with
the bz2/lzma interface (``needs_input``, ``eof``, ``unused_data``, and a
``decompress(data, max_length)`` that keeps any input it could not consume).
gzip's _GzipReader is built on it, so CPython's gzip.py does not import
without it.

Grail's zlib is a Smalltalk module whose decompressobj already answers
CPython's decompress(data, max_length), ``unconsumed_tail``, ``unused_data``
and ``eof``; this is the C class's bookkeeping on top of that
(Modules/zlibmodule.c, zlib_ZlibDecompressor_decompress_impl and decompress):

* ``decompress`` after the end of the stream is EOFError;
* input the window could not take is kept and consumed first next time;
* ``needs_input`` is False at the end of the stream or while input is kept,
  and True once all input has been consumed.
"""

import zlib


class _ZlibDecompressor:
    """Create a decompressor object for decompressing data incrementally.

      wbits = 15
      zdict
         The predefined compression dictionary. This is a sequence of bytes
         (such as a bytes object) containing subsequences that are expected
         to occur frequently in the data that is to be compressed. Those
         subsequences that are expected to be most common should come at the
         end of the dictionary. This must be the same dictionary as used by the
         compressor that produced the input data.
    """

    def __init__(self, wbits=15, zdict=b''):
        if zdict:
            self._decompressor = zlib.decompressobj(wbits, zdict)
        else:
            self._decompressor = zlib.decompressobj(wbits)
        self._kept = b''
        self.eof = False
        self.unused_data = b''
        self.needs_input = True

    def decompress(self, data, max_length=-1):
        if self.eof:
            raise EOFError("End of stream already reached")
        data = self._kept + bytes(data)
        output = self._decompressor.decompress(data, max(max_length, 0))
        self._kept = self._decompressor.unconsumed_tail
        if self._decompressor.eof:
            self.eof = True
            self.unused_data = self._decompressor.unused_data
            self.needs_input = False
        else:
            self.needs_input = not self._kept
        return output
