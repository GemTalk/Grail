""" Python 'ascii' Codec


Written by Marc-Andre Lemburg (mal@lemburg.com).

(c) Copyright CNRI, All Rights Reserved. NO WARRANTY.

"""
#
# GRAIL: upstream CPython 3.14.6, with ONE class of edit.  Where upstream
# binds a codec entry point straight into a class body --
#
#     class StreamWriter(codecs.StreamWriter):
#         encode = codecs.utf_8_encode
#
# -- it relies on that name being a C function, which the class machinery
# does NOT convert into a method; upstream says so in a comment.  Grail's
# ``_codecs`` is pure Python, and when a class-body attribute SHADOWS a
# method inherited from a base, Grail installs a forwarder that passes
# ``self`` through -- so the entry point is called with one argument too
# many.  ``staticmethod()`` does not lift that; the forwarder is installed
# either way.  Each such binding is therefore spelled out as a ``def`` that
# calls the entry point, and ``getregentry`` names the module-level
# function rather than the class attribute.  Nothing else differs.
import codecs

### Codec APIs

encode = codecs.ascii_encode
decode = codecs.ascii_decode

class Codec(codecs.Codec):

    def encode(self, input, errors='strict'):
        return codecs.ascii_encode(input, errors)

    def decode(self, input, errors='strict'):
        return codecs.ascii_decode(input, errors)

class IncrementalEncoder(codecs.IncrementalEncoder):
    def encode(self, input, final=False):
        return codecs.ascii_encode(input, self.errors)[0]

class IncrementalDecoder(codecs.IncrementalDecoder):
    def decode(self, input, final=False):
        return codecs.ascii_decode(input, self.errors)[0]

class StreamWriter(Codec, codecs.StreamWriter):
    pass

class StreamReader(Codec, codecs.StreamReader):
    pass

class StreamConverter(StreamWriter, StreamReader):

    def encode(self, input, errors='strict'):
        return codecs.ascii_decode(input, errors)

    def decode(self, input, errors='strict'):
        return codecs.ascii_encode(input, errors)

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='ascii',
        encode=encode,
        decode=decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamwriter=StreamWriter,
        streamreader=StreamReader,
    )
