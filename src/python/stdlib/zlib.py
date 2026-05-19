# GRAIL minimal zlib stub.  itsdangerous uses zlib.compress and
# zlib.decompress in URLSafeSerializer.dumps/loads only when the
# serialized payload is over 1KB and would shrink by compression.
# A real implementation needs deflate/inflate primitives we don't
# have; raising on use is acceptable since itsdangerous treats
# compression as opportunistic (catches an exception and falls
# back to uncompressed).
#
# To make the import succeed we expose the API surface but raise
# error on actual use.


class error(Exception):
    pass


def compress(data, level=-1):
    raise error("zlib compression not implemented in Grail")


def decompress(data, wbits=15, bufsize=0):
    raise error("zlib decompression not implemented in Grail")


def crc32(data, value=0):
    # Not a real CRC32 - itsdangerous doesn't use it, but provide a
    # callable so attribute reads don't crash.
    raise error("zlib.crc32 not implemented in Grail")


def adler32(data, value=1):
    raise error("zlib.adler32 not implemented in Grail")


Z_DEFAULT_COMPRESSION = -1
Z_BEST_SPEED = 1
Z_BEST_COMPRESSION = 9
Z_NO_COMPRESSION = 0

__all__ = [
    'compress', 'decompress', 'crc32', 'adler32', 'error',
    'Z_DEFAULT_COMPRESSION', 'Z_BEST_SPEED', 'Z_BEST_COMPRESSION',
    'Z_NO_COMPRESSION',
]
