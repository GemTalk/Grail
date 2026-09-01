""" Python 'utf-32-le' Codec
"""
#
# GRAIL: upstream CPython 3.14.6, with the same ONE class of edit the
# utf_16 modules carry: where upstream binds a codec entry point straight
# into a class body (``encode = codecs.utf_32_le_encode``) it relies on
# that name being a C function, which the class machinery does not turn
# into a method.  Grail's ``_codecs`` is pure Python, and a class-body
# attribute that shadows an inherited method gets a forwarder passing
# ``self`` through -- one argument too many.  Each such binding is spelled
# as a ``def``.  Nothing else differs.
import codecs

### Codec APIs

def encode(input, errors='strict'):
    return codecs.utf_32_le_encode(input, errors)

def decode(input, errors='strict'):
    return codecs.utf_32_le_decode(input, errors, True)

class IncrementalEncoder(codecs.IncrementalEncoder):
    def encode(self, input, final=False):
        return codecs.utf_32_le_encode(input, self.errors)[0]

class IncrementalDecoder(codecs.BufferedIncrementalDecoder):
    def _buffer_decode(self, input, errors, final):
        return codecs.utf_32_le_decode(input, errors, final)

class StreamWriter(codecs.StreamWriter):
    def encode(self, input, errors='strict'):
        return codecs.utf_32_le_encode(input, errors)

class StreamReader(codecs.StreamReader):
    def decode(self, input, errors='strict'):
        return codecs.utf_32_le_decode(input, errors, False)

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='utf-32-le',
        encode=encode,
        decode=decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamreader=StreamReader,
        streamwriter=StreamWriter,
    )
