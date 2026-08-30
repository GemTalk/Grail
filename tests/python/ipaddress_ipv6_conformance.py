"""``ipaddress`` IPv6 support, measured against CPython 3.14.

Grail implements ``ipaddress`` in Smalltalk (``src/smalltalk/Python/ipaddress.gs``)
rather than vendoring CPython's ``ipaddress.py``, so every behaviour below is a
re-implementation and every one of them is a chance to drift.  This file states
the expectations as literals and, run under CPython by
``scripts/check_python_fixtures.sh``, checks them against the real module.

The behaviours that are not obvious from the names, and that a re-implementation
gets wrong -- each of these was measured, not recalled:

* ``str()`` of an IPv4-MAPPED address keeps the dotted quad:
  ``str(ip_address('::ffff:1.2.3.4')) == '::ffff:1.2.3.4'``, not
  ``'::ffff:102:304'``.  CPython compresses only the high-order 96 bits and
  appends ``str(ipv4_mapped)`` (RFC 4291 2.5.5.2).
* ``exploded`` keeps the dotted quad too, in the last field only:
  ``'0000:0000:0000:0000:0000:ffff:1.2.3.4'``.
* the ``::`` run chosen for compression is the LONGEST one, and a run of a
  single zero hextet is never compressed: ``1:0:0:2:0:0:0:3`` -> ``1:0:0:2::3``.
* every category property EXCEPT ``is_site_local`` delegates to ``ipv4_mapped``
  when the address is in ``::ffff:0:0/96`` -- so ``::ffff:127.0.0.1`` is a
  loopback and ``::ffff:8.8.8.8`` is global.
* ``is_private`` is iana-special-registry membership MINUS a carve-out list, so
  ``2001:1::1`` (a listed exception) is global while ``2001:1::3`` is private.
* ``packed`` is a bytes object -- 4 bytes for v4, 16 for v6 -- not an int.
  urllib3's ssl_match_hostname compares two addresses by exactly this attribute.
* ``ip_address`` reports ONE generic ValueError when neither family parses; the
  per-family message is discarded at that level.

Every check runs identically under CPython and under Grail.
"""

import ipaddress
from ipaddress import IPv4Address, IPv6Address, IPv4Network, IPv6Network

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:            # noqa: BLE001 - reported, not raised
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if actual == expected else 'got %r want %r' % (
        actual, expected)


def raises_value_error(fn):
    def run():
        try:
            fn()
        except ValueError:
            return 'ValueError'
        return 'no error'
    return run


# ------------------------------------------------------------ parse + render

check('v6_loopback', lambda: str(ipaddress.ip_address('::1')), '::1')
check('v6_unspecified', lambda: str(ipaddress.ip_address('::')), '::')
check('v6_doc_prefix', lambda: str(ipaddress.ip_address('2001:db8::1')),
      '2001:db8::1')
# Leading zeros inside a hextet are dropped and the case is lowered.
check('v6_leading_zeros_dropped',
      lambda: str(ipaddress.ip_address('2001:0DB8:0000:0000:0000:0000:0000:0001')),
      '2001:db8::1')
check('v6_all_hextets', lambda: str(ipaddress.ip_address('1:2:3:4:5:6:7:8')),
      '1:2:3:4:5:6:7:8')
check('v6_trailing_double_colon', lambda: str(ipaddress.ip_address('1::')), '1::')
check('v6_zeros_written_out', lambda: str(ipaddress.ip_address('0:0:0:0:0:0:0:1')),
      '::1')
# The LONGEST zero run wins, and a single zero hextet is left alone.
check('v6_longest_run_compressed',
      lambda: str(ipaddress.ip_address('1:0:0:2:0:0:0:3')), '1:0:0:2::3')
check('v6_single_zero_not_compressed',
      lambda: str(ipaddress.ip_address('1:0:2:3:4:5:6:7')), '1:0:2:3:4:5:6:7')
# An IPv4-mapped address keeps its dotted quad through str().
check('v6_mapped_keeps_dotted_quad',
      lambda: str(ipaddress.ip_address('::ffff:1.2.3.4')), '::ffff:1.2.3.4')
check('v6_mapped_keeps_dotted_quad_2',
      lambda: str(ipaddress.ip_address('::ffff:192.168.1.1')),
      '::ffff:192.168.1.1')
# An embedded quad that is NOT in ::ffff:0:0/96 renders as hextets.
check('v6_embedded_quad_not_mapped',
      lambda: str(ipaddress.ip_address('::1.2.3.4')), '::102:304')
check('v6_embedded_all_zero_quad',
      lambda: str(ipaddress.ip_address('::0.0.0.0')), '::')

check('v6_int', lambda: int(ipaddress.ip_address('::1')), 1)
check('v6_int_big', lambda: int(ipaddress.ip_address('2001:db8::1')),
      42540766411282592856903984951653826561)
check('v6_int_mapped', lambda: int(ipaddress.ip_address('::ffff:1.2.3.4')),
      281470698652420)

check('v6_exploded', lambda: ipaddress.ip_address('2001:db8::1').exploded,
      '2001:0db8:0000:0000:0000:0000:0000:0001')
check('v6_exploded_zero', lambda: ipaddress.ip_address('::').exploded,
      '0000:0000:0000:0000:0000:0000:0000:0000')
check('v6_exploded_mapped',
      lambda: ipaddress.ip_address('::ffff:1.2.3.4').exploded,
      '0000:0000:0000:0000:0000:ffff:1.2.3.4')
check('v6_compressed', lambda: ipaddress.ip_address('2001:0db8::0:1').compressed,
      '2001:db8::1')
check('v4_exploded', lambda: ipaddress.ip_address('1.2.3.4').exploded, '1.2.3.4')
check('v4_compressed', lambda: ipaddress.ip_address('1.2.3.4').compressed,
      '1.2.3.4')

check('v6_repr', lambda: repr(ipaddress.ip_address('::1')),
      "IPv6Address('::1')")
check('v4_repr', lambda: repr(ipaddress.ip_address('1.2.3.4')),
      "IPv4Address('1.2.3.4')")

# ------------------------------------------------------------------ dispatch

check('dispatch_v4_type', lambda: type(ipaddress.ip_address('1.2.3.4')).__name__,
      'IPv4Address')
check('dispatch_v6_type', lambda: type(ipaddress.ip_address('::1')).__name__,
      'IPv6Address')
check('dispatch_v4_isinstance',
      lambda: (isinstance(ipaddress.ip_address('1.2.3.4'), IPv4Address),
               isinstance(ipaddress.ip_address('1.2.3.4'), IPv6Address)),
      (True, False))
check('dispatch_v6_isinstance',
      lambda: (isinstance(ipaddress.ip_address('::1'), IPv6Address),
               isinstance(ipaddress.ip_address('::1'), IPv4Address)),
      (True, False))
check('dispatch_v4_version', lambda: ipaddress.ip_address('1.2.3.4').version, 4)
check('dispatch_v6_version', lambda: ipaddress.ip_address('::1').version, 6)
check('v4_max_prefixlen', lambda: ipaddress.ip_address('1.2.3.4').max_prefixlen, 32)
check('v6_max_prefixlen', lambda: ipaddress.ip_address('::1').max_prefixlen, 128)

# int arguments: <= 2**32-1 is IPv4, above that is IPv6.
check('int_arg_v4', lambda: str(ipaddress.ip_address(1)), '0.0.0.1')
check('int_arg_v6', lambda: str(ipaddress.ip_address(2 ** 32)), '::1:0:0')
check('int_arg_too_big', raises_value_error(lambda: ipaddress.ip_address(2 ** 128)),
      'ValueError')
check('int_arg_negative', raises_value_error(lambda: ipaddress.ip_address(-1)),
      'ValueError')

# The classes are callable in their own right.
check('ctor_v6_str', lambda: str(IPv6Address('::2')), '::2')
check('ctor_v6_int', lambda: str(IPv6Address(1)), '::1')
check('ctor_v6_bytes', lambda: str(IPv6Address(b'\x00' * 15 + b'\x01')), '::1')
check('ctor_v4_str', lambda: str(IPv4Address('5.6.7.8')), '5.6.7.8')
check('ctor_v4_int', lambda: str(IPv4Address(1)), '0.0.0.1')
check('ctor_v4_bytes', lambda: str(IPv4Address(b'\x01\x02\x03\x04')), '1.2.3.4')

# ------------------------------------------------------------------- packed

check('packed_v4_is_bytes',
      lambda: list(ipaddress.ip_address('1.2.3.4').packed), [1, 2, 3, 4])
check('packed_v4_high',
      lambda: list(ipaddress.ip_address('255.255.255.255').packed),
      [255, 255, 255, 255])
check('packed_v6_len', lambda: len(ipaddress.ip_address('::1').packed), 16)
check('packed_v6_loopback', lambda: list(ipaddress.ip_address('::1').packed),
      [0] * 15 + [1])
check('packed_v6_mapped',
      lambda: list(ipaddress.ip_address('::ffff:1.2.3.4').packed),
      [0] * 10 + [255, 255, 1, 2, 3, 4])
# What urllib3's ssl_match_hostname actually does.
check('packed_equality_v6',
      lambda: (ipaddress.ip_address('2001:db8::1').packed
               == ipaddress.ip_address('2001:0db8:0:0:0:0:0:1').packed),
      True)
check('packed_inequality_across_families',
      lambda: (ipaddress.ip_address('1.2.3.4').packed
               == ipaddress.ip_address('::1.2.3.4').packed),
      False)

# ---------------------------------------------------------------- rejections

for _bad in ('', ':', ':::', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7', '::1::2',
             '1:2:3:4:5:6:7:8:', ':1:2:3:4:5:6:7', '12345::',
             '1:2:3:4:5:6:7:xyz', 'gg::1', '::1/64', '1:2:3:4:5:6:1.2.3.4.5',
             '2001:db8::1%', '999.0.0.1', '1.2.3', '1.2.3.4.5', '0x1::',
             '1:2:3:4:5:6:7:8%eth0%x', '::ffff:1.2.3.4.5', '1::2::3',
             '02001:db8::1'):
    check('reject_%s' % (_bad or 'empty',),
          raises_value_error(lambda s=_bad: ipaddress.ip_address(s)),
          'ValueError')

# A lone dotted quad is an IPv4 address, not a rejection.
check('accept_bare_quad', lambda: str(ipaddress.ip_address('1.2.3.4')), '1.2.3.4')

# ------------------------------------------------------------- category bits

def _cats(s):
    a = ipaddress.ip_address(s)
    return (a.is_loopback, a.is_private, a.is_global, a.is_link_local,
            a.is_multicast, a.is_unspecified, a.is_reserved)


#                         loopbk private global  link  mcast unspec reserved
check('cat_loopback', lambda: _cats('::1'),
      (True,  True,  False, False, False, False, True))
check('cat_unspecified', lambda: _cats('::'),
      (False, True,  False, False, False, True,  True))
check('cat_link_local', lambda: _cats('fe80::1'),
      (False, True,  False, True,  False, False, False))
check('cat_multicast', lambda: _cats('ff02::1'),
      (False, False, True,  False, True,  False, False))
check('cat_unique_local', lambda: _cats('fc00::1'),
      (False, True,  False, False, False, False, False))
check('cat_documentation', lambda: _cats('2001:db8::1'),
      (False, True,  False, False, False, False, False))
check('cat_public', lambda: _cats('2606:4700::1111'),
      (False, False, True,  False, False, False, False))
check('cat_rfc9637', lambda: _cats('3fff::1'),
      (False, True,  False, False, False, False, False))
check('cat_nat64', lambda: _cats('64:ff9b:1::1'),
      (False, True,  False, False, False, False, True))
# 2001::/23 is private, but 2001:1::1 is one of the carve-outs and 2001:1::3
# is not -- the exception list is what separates them.
check('cat_private_exception', lambda: _cats('2001:1::1'),
      (False, False, True,  False, False, False, False))
check('cat_private_non_exception', lambda: _cats('2001:1::3'),
      (False, True,  False, False, False, False, False))

# is_site_local is the ONE property that does not delegate to ipv4_mapped.
check('site_local_true', lambda: ipaddress.ip_address('fec0::1').is_site_local,
      True)
check('site_local_false', lambda: ipaddress.ip_address('fe80::1').is_site_local,
      False)
check('site_local_on_v4_mapped',
      lambda: ipaddress.ip_address('::ffff:1.2.3.4').is_site_local, False)

# Everything else DOES delegate: the v4 semantics show through.
check('mapped_delegates_loopback', lambda: _cats('::ffff:127.0.0.1'),
      (True,  True,  False, False, False, False, False))
check('mapped_delegates_global', lambda: _cats('::ffff:8.8.8.8'),
      (False, False, True,  False, False, False, False))
check('mapped_delegates_private', lambda: _cats('::ffff:192.168.1.1'),
      (False, True,  False, False, False, False, False))

check('ipv4_mapped_present',
      lambda: str(ipaddress.ip_address('::ffff:1.2.3.4').ipv4_mapped), '1.2.3.4')
check('ipv4_mapped_absent',
      lambda: ipaddress.ip_address('2001:db8::1').ipv4_mapped, None)
check('sixtofour_present',
      lambda: str(ipaddress.ip_address('2002:c000:204::').sixtofour), '192.0.2.4')
check('sixtofour_absent',
      lambda: ipaddress.ip_address('2001:db8::1').sixtofour, None)

# ------------------------------------------------------------------- scope id

check('scope_str', lambda: str(ipaddress.ip_address('fe80::1%eth0')),
      'fe80::1%eth0')
check('scope_id', lambda: ipaddress.ip_address('fe80::1%eth0').scope_id, 'eth0')
check('scope_id_absent', lambda: ipaddress.ip_address('fe80::1').scope_id, None)
check('scope_int_ignores_zone',
      lambda: int(ipaddress.ip_address('fe80::1%eth0')),
      338288524927261089654018896841347694593)
# A zone makes two otherwise-equal addresses unequal.
check('scope_breaks_equality',
      lambda: (ipaddress.ip_address('fe80::1%eth0')
               == ipaddress.ip_address('fe80::1')),
      False)
check('scope_equal_when_same',
      lambda: (ipaddress.ip_address('fe80::1%eth0')
               == ipaddress.ip_address('fe80::1%eth0')),
      True)

# ------------------------------------------------------------ equality, order

check('eq_same', lambda: (ipaddress.ip_address('::1')
                          == ipaddress.ip_address('::1')), True)
check('eq_different', lambda: (ipaddress.ip_address('::1')
                               == ipaddress.ip_address('::2')), False)
# Same integer value, different family: NOT equal.
check('eq_across_families', lambda: (ipaddress.ip_address('::1')
                                     == ipaddress.ip_address('0.0.0.1')), False)
check('hash_same', lambda: (hash(ipaddress.ip_address('2001:db8::1'))
                            == hash(ipaddress.ip_address('2001:0db8::1'))), True)
check('lt_within_family', lambda: (ipaddress.ip_address('::1')
                                   < ipaddress.ip_address('::2')), True)


def _cross_family_lt():
    try:
        ipaddress.ip_address('::1') < ipaddress.ip_address('1.2.3.4')
    except TypeError:
        return 'TypeError'
    return 'no error'


check('lt_across_families_raises', _cross_family_lt, 'TypeError')

# --------------------------------------------------------------- ip_network

check('net_v6_type', lambda: type(ipaddress.ip_network('2001:db8::/32')).__name__,
      'IPv6Network')
check('net_v4_type', lambda: type(ipaddress.ip_network('192.168.1.0/24')).__name__,
      'IPv4Network')
check('net_v6_str', lambda: str(ipaddress.ip_network('2001:0db8::/32')),
      '2001:db8::/32')
check('net_v6_bare_address', lambda: str(ipaddress.ip_network('::1')), '::1/128')
check('net_v6_network_address',
      lambda: str(ipaddress.ip_network('2001:db8::/32').network_address),
      '2001:db8::')
check('net_v6_broadcast',
      lambda: str(ipaddress.ip_network('2001:db8::/32').broadcast_address),
      '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff')
check('net_v6_num_addresses',
      lambda: ipaddress.ip_network('2001:db8::/32').num_addresses, 2 ** 96)
check('net_v6_default_route_num',
      lambda: ipaddress.ip_network('::/0').num_addresses, 2 ** 128)
check('net_v6_prefixlen',
      lambda: ipaddress.ip_network('fe80::/10').prefixlen, 10)
check('net_v6_version', lambda: ipaddress.ip_network('::/0').version, 6)
check('net_v6_repr', lambda: repr(ipaddress.ip_network('2001:db8::/32')),
      "IPv6Network('2001:db8::/32')")
check('net_v6_exploded', lambda: ipaddress.ip_network('2001:db8::/32').exploded,
      '2001:0db8:0000:0000:0000:0000:0000:0000/32')
check('net_v6_strict_rejects_host_bits',
      raises_value_error(lambda: ipaddress.ip_network('2001:db8::1/32')),
      'ValueError')
check('net_v6_non_strict_coerces',
      lambda: str(ipaddress.ip_network('2001:db8::1/32', strict=False)),
      '2001:db8::/32')
check('net_v6_prefix_too_big',
      raises_value_error(lambda: ipaddress.ip_network('2001:db8::/129')),
      'ValueError')
check('net_v4_prefix_too_big',
      raises_value_error(lambda: ipaddress.ip_network('1.2.3.4/33')), 'ValueError')
check('net_garbage', raises_value_error(lambda: ipaddress.ip_network('zzz/32')),
      'ValueError')
check('net_bad_prefix',
      raises_value_error(lambda: ipaddress.ip_network('2001:db8::/x')),
      'ValueError')

check('net_contains_inside',
      lambda: ipaddress.ip_address('2001:db8::1')
      in ipaddress.ip_network('2001:db8::/32'), True)
check('net_contains_outside',
      lambda: ipaddress.ip_address('2001:db9::1')
      in ipaddress.ip_network('2001:db8::/32'), False)
check('net_contains_default_route',
      lambda: ipaddress.ip_address('2606:4700::1111')
      in ipaddress.ip_network('::/0'), True)
check('net_contains_link_local',
      lambda: ipaddress.ip_address('fe80::abcd')
      in ipaddress.ip_network('fe80::/10'), True)
# An address of the other family is never in the network.
check('net_contains_wrong_family',
      lambda: ipaddress.ip_address('192.168.1.1')
      in ipaddress.ip_network('2001:db8::/32'), False)
check('net_v4_still_works',
      lambda: (str(ipaddress.ip_network('192.168.1.0/24')),
               str(ipaddress.ip_network('192.168.1.0/24').broadcast_address),
               ipaddress.ip_address('192.168.1.50')
               in ipaddress.ip_network('192.168.1.0/24')),
      ('192.168.1.0/24', '192.168.1.255', True))

check('net_class_ctor_v6', lambda: str(IPv6Network('2001:db8::/32')),
      '2001:db8::/32')
check('net_class_ctor_v4', lambda: str(IPv4Network('10.0.0.0/8')), '10.0.0.0/8')
check('net_eq', lambda: (ipaddress.ip_network('2001:db8::/32')
                         == ipaddress.ip_network('2001:0db8::/32')), True)
check('net_eq_across_families',
      lambda: (ipaddress.ip_network('::/0')
               == ipaddress.ip_network('0.0.0.0/0')), False)


# ------------------------------------------------ what urllib3 actually needs

def _urllib3_shape():
    """ssl_match_hostname's two uses, verbatim in shape."""
    host_ip = ipaddress.ip_address('2001:db8::1')
    ip = ipaddress.ip_address('2001:0db8:0000:0000:0000:0000:0000:0001 '.rstrip())
    return (isinstance(host_ip, (IPv4Address, IPv6Address)),
            bool(ip.packed == host_ip.packed))


check('urllib3_shape', _urllib3_shape, (True, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
