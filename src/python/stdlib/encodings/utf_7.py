""" Python 'utf-7' Codec
"""
#
# GRAIL: upstream CPython 3.14.6, with the same ONE class of edit the
# utf_16 and utf_32 modules carry -- a class-body binding of a codec entry
# point becomes a def, because Grail installs a self-passing forwarder
# where CPython relies on a C function not becoming a method.
import codecs

### Codec APIs

def encode(input, errors='strict'):
    return codecs.utf_7_encode(input, errors)

def decode(input, errors='strict'):
    return codecs.utf_7_decode(input, errors, True)

class IncrementalEncoder(codecs.IncrementalEncoder):
    def encode(self, input, final=False):
        return codecs.utf_7_encode(input, self.errors)[0]

class IncrementalDecoder(codecs.BufferedIncrementalDecoder):
    def _buffer_decode(self, input, errors, final):
        return codecs.utf_7_decode(input, errors, final)

class StreamWriter(codecs.StreamWriter):
    def encode(self, input, errors='strict'):
        return codecs.utf_7_encode(input, errors)

class StreamReader(codecs.StreamReader):
    def decode(self, input, errors='strict'):
        return codecs.utf_7_decode(input, errors, False)

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='utf-7',
        encode=encode,
        decode=decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamreader=StreamReader,
        streamwriter=StreamWriter,
    )
