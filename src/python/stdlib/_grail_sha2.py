"""SHA-224 and SHA-384 for Grail's hashlib, in pure Python.

GemStone's kernel computes MD5, SHA-1, SHA-256, SHA-512 and SHA-3 (the
``ByteArray >> sha*SumBytes'' primitives hashlib.gs uses) but not these two,
and PyJWT signs ES384/RS384/HS384 with SHA-384 -- ``hashlib.sha384'' was an
AttributeError for every FastAPI security tutorial (docs/Support_FastAPI.md,
Phase 6).  Each is its family's compression function with different initial
values, truncated, so they cannot be had from the SHA-256 / SHA-512
primitives: the compressions are written out here, FIPS 180-4 section 6.

Only whole messages are hashed -- hashlib.gs buffers ``update()'' data and
digests the buffer, as it does for every algorithm.
"""

_K256 = (
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
)

_K512 = (
    0x428a2f98d728ae22, 0x7137449123ef65cd, 0xb5c0fbcfec4d3b2f, 0xe9b5dba58189dbbc,
    0x3956c25bf348b538, 0x59f111f1b605d019, 0x923f82a4af194f9b, 0xab1c5ed5da6d8118,
    0xd807aa98a3030242, 0x12835b0145706fbe, 0x243185be4ee4b28c, 0x550c7dc3d5ffb4e2,
    0x72be5d74f27b896f, 0x80deb1fe3b1696b1, 0x9bdc06a725c71235, 0xc19bf174cf692694,
    0xe49b69c19ef14ad2, 0xefbe4786384f25e3, 0x0fc19dc68b8cd5b5, 0x240ca1cc77ac9c65,
    0x2de92c6f592b0275, 0x4a7484aa6ea6e483, 0x5cb0a9dcbd41fbd4, 0x76f988da831153b5,
    0x983e5152ee66dfab, 0xa831c66d2db43210, 0xb00327c898fb213f, 0xbf597fc7beef0ee4,
    0xc6e00bf33da88fc2, 0xd5a79147930aa725, 0x06ca6351e003826f, 0x142929670a0e6e70,
    0x27b70a8546d22ffc, 0x2e1b21385c26c926, 0x4d2c6dfc5ac42aed, 0x53380d139d95b3df,
    0x650a73548baf63de, 0x766a0abb3c77b2a8, 0x81c2c92e47edaee6, 0x92722c851482353b,
    0xa2bfe8a14cf10364, 0xa81a664bbc423001, 0xc24b8b70d0f89791, 0xc76c51a30654be30,
    0xd192e819d6ef5218, 0xd69906245565a910, 0xf40e35855771202a, 0x106aa07032bbd1b8,
    0x19a4c116b8d2d0c8, 0x1e376c085141ab53, 0x2748774cdf8eeb99, 0x34b0bcb5e19b48a8,
    0x391c0cb3c5c95a63, 0x4ed8aa4ae3418acb, 0x5b9cca4f7763e373, 0x682e6ff3d6b2b8a3,
    0x748f82ee5defb2fc, 0x78a5636f43172f60, 0x84c87814a1f0ab72, 0x8cc702081a6439ec,
    0x90befffa23631e28, 0xa4506cebde82bde9, 0xbef9a3f7b2c67915, 0xc67178f2e372532b,
    0xca273eceea26619c, 0xd186b8c721c0c207, 0xeada7dd6cde0eb1e, 0xf57d4f7fee6ed178,
    0x06f067aa72176fba, 0x0a637dc5a2c898a6, 0x113f9804bef90dae, 0x1b710b35131c471b,
    0x28db77f523047d84, 0x32caab7b40c72493, 0x3c9ebe0a15c9bebc, 0x431d67c49c100d4c,
    0x4cc5d4becb3e42b6, 0x597f299cfc657e2a, 0x5fcb6fab3ad6faec, 0x6c44198c4a475817,
)

_IV224 = (0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
          0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4)
_IV384 = (0xcbbb9d5dc1059ed8, 0x629a292a367cd507, 0x9159015a3070dd17,
          0x152fecd8f70e5939, 0x67332667ffc00b31, 0x8eb44a8768581511,
          0xdb0c2e0d64f98fa7, 0x47b5481dbefa4fa4)


def _sha2(data, iv, k, bits, rounds, block, sigma, out_words):
    mask = (1 << bits) - 1
    wbytes = bits // 8

    def rotr(x, n):
        return ((x >> n) | (x << (bits - n))) & mask

    s0a, s0b, s0c, s1a, s1b, s1c, S0a, S0b, S0c, S1a, S1b, S1c = sigma
    msg = bytes(data)
    length_bits = len(msg) * 8
    msg += b'\x80'
    msg += b'\x00' * ((block - (len(msg) + 2 * wbytes) % block) % block)
    msg += length_bits.to_bytes(2 * wbytes, 'big')
    h = list(iv)
    for off in range(0, len(msg), block):
        w = [int.from_bytes(msg[off + i * wbytes:off + (i + 1) * wbytes], 'big')
             for i in range(16)]
        for i in range(16, rounds):
            x, y = w[i - 15], w[i - 2]
            s0 = rotr(x, s0a) ^ rotr(x, s0b) ^ (x >> s0c)
            s1 = rotr(y, s1a) ^ rotr(y, s1b) ^ (y >> s1c)
            w.append((w[i - 16] + s0 + w[i - 7] + s1) & mask)
        a, b, c, d, e, f, g, hh = h
        for i in range(rounds):
            S1 = rotr(e, S1a) ^ rotr(e, S1b) ^ rotr(e, S1c)
            ch = (e & f) ^ (~e & mask & g)
            t1 = (hh + S1 + ch + k[i] + w[i]) & mask
            S0 = rotr(a, S0a) ^ rotr(a, S0b) ^ rotr(a, S0c)
            maj = (a & b) ^ (a & c) ^ (b & c)
            t2 = (S0 + maj) & mask
            hh, g, f, e, d, c, b, a = g, f, e, (d + t1) & mask, c, b, a, (t1 + t2) & mask
        h = [(x + y) & mask for x, y in zip(h, (a, b, c, d, e, f, g, hh))]
    return b''.join(x.to_bytes(wbytes, 'big') for x in h[:out_words])


def sha224_digest(data):
    return _sha2(data, _IV224, _K256, 32, 64, 64,
                 (7, 18, 3, 17, 19, 10, 2, 13, 22, 6, 11, 25), 7)


def sha384_digest(data):
    return _sha2(data, _IV384, _K512, 64, 80, 128,
                 (1, 8, 7, 19, 61, 6, 28, 34, 39, 14, 18, 41), 6)
