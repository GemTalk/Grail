""" Generic Python Character Mapping Codec.

    Use this codec directly rather than through the automatic
    conversion mechanisms supplied by unicode() and .encode().


Written by Marc-Andre Lemburg (mal@lemburg.com).

(c) Copyright CNRI, All Rights Reserved. NO WARRANTY.

"""#"
#
# GRAIL: upstream CPython 3.14.6, with the ONE class of edit utf_8.py
# describes.  Upstream binds ``codecs.charmap_encode`` / ``charmap_decode``
# straight into ``Codec``'s body, relying on a C function not becoming a
# method; Grail's ``_codecs`` is pure Python and the shadowing forwarder
# would pass ``self`` as the input.  So those bindings are ``def``s, the two
# stream classes call the entry points directly instead of through
# ``Codec.encode`` / ``Codec.decode``, and ``getregentry`` names module-level
# functions.  Nothing else differs.

import codecs

### Codec APIs

encode = codecs.charmap_encode
decode = codecs.charmap_decode

class Codec(codecs.Codec):

    def encode(self, input, errors='strict', mapping=None):
        return codecs.charmap_encode(input, errors, mapping)

    def decode(self, input, errors='strict', mapping=None):
        return codecs.charmap_decode(input, errors, mapping)

class IncrementalEncoder(codecs.IncrementalEncoder):
    def __init__(self, errors='strict', mapping=None):
        codecs.IncrementalEncoder.__init__(self, errors)
        self.mapping = mapping

    def encode(self, input, final=False):
        return codecs.charmap_encode(input, self.errors, self.mapping)[0]

class IncrementalDecoder(codecs.IncrementalDecoder):
    def __init__(self, errors='strict', mapping=None):
        codecs.IncrementalDecoder.__init__(self, errors)
        self.mapping = mapping

    def decode(self, input, final=False):
        return codecs.charmap_decode(input, self.errors, self.mapping)[0]

class StreamWriter(Codec,codecs.StreamWriter):

    def __init__(self,stream,errors='strict',mapping=None):
        codecs.StreamWriter.__init__(self,stream,errors)
        self.mapping = mapping

    def encode(self,input,errors='strict'):
        return codecs.charmap_encode(input,errors,self.mapping)

class StreamReader(Codec,codecs.StreamReader):

    def __init__(self,stream,errors='strict',mapping=None):
        codecs.StreamReader.__init__(self,stream,errors)
        self.mapping = mapping

    def decode(self,input,errors='strict'):
        return codecs.charmap_decode(input,errors,self.mapping)

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='charmap',
        encode=encode,
        decode=decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamwriter=StreamWriter,
        streamreader=StreamReader,
    )
