import struct


def calc_size(fmt):
    return struct.calcsize(fmt)


def pack_be_q(value):
    return struct.pack("!Q", value)


def unpack_be_q(blob):
    return struct.unpack("!Q", blob)[0]


def pack_le_h(value):
    return struct.pack("<H", value)


def pack_signed_byte(value):
    return struct.pack("b", value)


def unpack_signed_byte(blob):
    return struct.unpack("b", blob)[0]


def pack_unsigned_byte(value):
    return struct.pack("B", value)


def pack_string(value):
    return struct.pack("5s", value)


def unpack_string(blob):
    return struct.unpack("5s", blob)[0]


def pack_double(value):
    return struct.pack(">d", value)


def unpack_double(blob):
    return struct.unpack(">d", blob)[0]


def pack_mixed(a, b, c):
    return struct.pack(">IHB", a, b, c)


def unpack_mixed(blob):
    return struct.unpack(">IHB", blob)


def pack_with_padding():
    return struct.pack(">BxH", 1, 0xCAFE)


def roundtrip_timestamp(ts):
    blob = struct.pack("!Q", ts)
    return struct.unpack("!Q", blob)[0]
