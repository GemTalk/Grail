"""Fixture for Env1PlumbingSendsTestCase (issue #1155).

Every name this file defines or reads is spelled ``zz_...``, apart from the
builtins listed in the test's ``___expectedBuiltinNames___``.  So when the test
decodes the env-1 sends of the methods compiled from this file, any other
non-dunder Python name it finds is Grail's own plumbing sent in env 1 -- the
thing a sender search cannot tell apart from a Python call.

The module body runs at import, so it only binds; the functions exercise the
statement and expression forms and are never called.
"""

from os import path as zz_path
import os as zz_os

zz_g = 1
zz_t = (1, 2)
zz_l = [1, 2, *zz_t]
zz_d = {'a': 1, **{'b': 2}}
zz_s = {1, 2}
zz_fs = f"{zz_g!r:>4}"
zz_sl = zz_l[1:2]
zz_a, *zz_b = zz_l
zz_g += 1
del zz_d['a']
assert zz_g, "zz"
zz_comp = [zz_j for zz_j in zz_l if zz_j]


def zz_deco(zz_f):
    return zz_f


class zz_Meta(type):
    pass


class zz_Base:
    zz_attr = 1
    __slots__ = ()


@zz_deco
class zz_C(zz_Base, metaclass=zz_Meta):
    zz_x: zz_Base = 3

    def __init__(self, zz_v=1, *zz_args, zz_k=2, **zz_kw):
        super().__init__()
        self.zz_v = zz_v

    @property
    def zz_p(self):
        return self.zz_v

    @staticmethod
    def zz_sm():
        return 1

    def zz_helper(self, zz_q):
        return zz_q

    def zz_call(self):
        # self.zz_helper(...) on the class's own method compiles to a DIRECT
        # send of zz_helper: -- the case a selector pool can see.  An
        # attribute call on any other receiver (zz_r.zz_m(...) in zz_f) loads
        # the attribute by a Symbol argument and sends nothing by that name.
        return self.zz_helper(1)

    @classmethod
    def zz_cm(cls):
        return cls

    def zz_m(self, zz_o):
        global zz_g
        zz_n = 0

        def zz_inner():
            nonlocal zz_n
            zz_n += 1
            return zz_n

        zz_lam = lambda zz_q: self.zz_helper(zz_q)
        try:
            with zz_o as zz_w:
                pass
        except (zz_Err1, zz_Err2) as zz_e:
            raise zz_Err1 from zz_e
        else:
            pass
        finally:
            zz_g = 2
        for zz_i in zz_o:
            if zz_i:
                continue
            break
        else:
            pass
        while zz_n < 3:
            zz_n += 1
        zz_ls = [zz_j for zz_j in zz_o if zz_j]
        zz_dc = {zz_j: zz_j for zz_j in zz_o}
        zz_st = {zz_j for zz_j in zz_o}
        zz_gen = (zz_j for zz_j in zz_o)
        zz_o.zz_attr = zz_o.zz_other
        zz_o[0] = zz_o[1:2]
        del zz_o.zz_attr
        assert zz_o, zz_n
        return (zz_inner() + zz_lam(1) - (zz_n if zz_n else -zz_n) * 2 ** 3 // 4 % 5,
                zz_n is None, zz_n in zz_o, not zz_n, zz_n < zz_n <= zz_n,
                zz_n and zz_n or zz_n, f"{zz_n}{zz_o!s}", zz_ls, zz_dc, zz_st, zz_gen)

    def zz_genf(self):
        yield 1
        zz_y = yield from self.zz_o2
        return zz_y

    async def zz_af(self, zz_o):
        await zz_o
        async with zz_o:
            pass
        async for zz_i in zz_o:
            pass
        return [zz_j async for zz_j in zz_o]

    def zz_match(self, zz_o):
        match zz_o:
            case [zz_a, zz_b]:
                return zz_a
            case {"k": zz_v}:
                return zz_v
            case zz_C(zz_v=zz_x):
                return zz_x
            case _:
                return None


class zz_Err1(Exception):
    pass


class zz_Err2(Exception):
    pass


def zz_f(zz_a, /, zz_b=2, *zz_rest, zz_c=3, **zz_kw):
    zz_r = zz_C(1, *zz_rest, zz_k=3, **zz_kw)
    zz_r.zz_m(zz_a)
    zz_os.zz_attr
    zz_s2 = {zz_a, *zz_rest}
    zz_d2 = {'a': zz_a, **zz_kw}
    zz_l2 = [zz_a, *zz_rest]
    zz_t2 = (zz_a, *zz_rest)
    zz_x2, *zz_y2 = zz_l2
    del zz_d2['a']
    zz_b += 1
    return zz_r, zz_s2, zz_d2, zz_t2, zz_x2, zz_y2, f"{zz_b!r:>4}", zz_l2[1:2]


def zz_fgen(zz_a):
    # A generator lambda keeps this def on the text path; zz_f stays IR.
    zz_genlam = lambda: (yield zz_a)
    return zz_genlam


zz_mod_genlam = lambda: (yield zz_g)
zz_mod_s2 = {zz_g, *zz_t}
zz_mod_d2 = {'a': zz_g, **zz_d}
zz_mod_r = zz_deco(zz_C)
zz_mod_gx = (zz_j for zz_j in zz_l)
