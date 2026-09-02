"""Python 'zlib_codec' Codec - zlib compression encoding.

This codec de/encodes from bytes to bytes.

Written by Marc-Andre Lemburg (mal@lemburg.com).
"""
#
# GRAIL: upstream CPython 3.14.7, with the ONE class of edit this package
# always needs -- an entry point bound straight into a class body is
# spelled out as a ``def`` that calls it, because Grail installs a
# self-passing forwarder when a class-body attribute shadows an inherited
# method.  See latin_1.py for the full explanation.  Nothing else differs.

import codecs
import zlib # this codec needs the optional zlib module !

### Codec APIs

def zlib_encode(input, errors='strict'):
    assert errors == 'strict'
    return (zlib.compress(bytes(input)), len(input))

def zlib_decode(input, errors='strict'):
    assert errors == 'strict'
    return (zlib.decompress(bytes(input)), len(input))

class Codec(codecs.Codec):
    def encode(self, input, errors='strict'):
        return zlib_encode(input, errors)
    def decode(self, input, errors='strict'):
        return zlib_decode(input, errors)

# GRAIL: the incremental pair BUFFERS and does the work on the final call.
# Upstream holds a zlib.compressobj / decompressobj across calls and emits
# as it goes; Grail's zlib is a one-shot compress/decompress over libz --
# ``compressobj()'' raises NotImplementedError -- so there is no stream
# object to hold.  Buffering keeps the incremental CONTRACT (feed any
# split, get the same bytes) at the cost of holding the input, which is
# the honest trade while the streaming objects are missing; a caller that
# needs constant memory over a large stream wants compressobj, and that is
# recorded in docs/Issues.md rather than faked here.

class IncrementalEncoder(codecs.IncrementalEncoder):
    def __init__(self, errors='strict'):
        assert errors == 'strict'
        self.errors = errors
        self.buffer = b''

    def encode(self, input, final=False):
        self.buffer = self.buffer + bytes(input)
        if not final:
            return b''
        out = zlib.compress(self.buffer)
        self.buffer = b''
        return out

    def reset(self):
        self.buffer = b''

class IncrementalDecoder(codecs.IncrementalDecoder):
    def __init__(self, errors='strict'):
        assert errors == 'strict'
        self.errors = errors
        self.buffer = b''

    def decode(self, input, final=False):
        self.buffer = self.buffer + bytes(input)
        if not final:
            return b''
        out = zlib.decompress(self.buffer)
        self.buffer = b''
        return out

    def reset(self):
        self.buffer = b''

class StreamWriter(Codec, codecs.StreamWriter):
    charbuffertype = bytes

class StreamReader(Codec, codecs.StreamReader):
    charbuffertype = bytes

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='zlib',
        encode=zlib_encode,
        decode=zlib_decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamwriter=StreamWriter,
        streamreader=StreamReader,
        _is_text_encoding=False,
    )
