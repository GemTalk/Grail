"""The half of ipaddress the Smalltalk module never had.

Grail's `ipaddress` was 1701 lines of hand-written Smalltalk covering addresses
and a little of networks.  `IPv6AddressTestCase >> testOmissionsAreDeliberate`
pinned what it left out -- `hosts()`, `ip_interface`, `collapse_addresses`,
`AddressValueError` and the rest -- on the argument that a faithful subset
beats a half-working port, as long as the boundary is written down.

CPython's own module is here now, so the boundary is gone, and this fixture is
the other half of that bargain: the names that test pinned as ABSENT are
checked as PRESENT AND WORKING.  Network algebra is what they are for, and
algebra that merely looks right is the failure mode the old test guarded
against -- so every check below is a computed answer, not a `hasattr`.

Every expectation here was measured against CPython 3.14.
"""

import ipaddress

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _raised(fn, as_=None):
    """The exception's class name, or 'caught' when as_ catches it."""
    try:
        fn()
    except BaseException as exc:
        if as_ is not None:
            return 'caught' if isinstance(exc, as_) else type(exc).__name__
        return type(exc).__name__
    return 'no error'


# ----------------------------------------------------------- network algebra

check('hosts_enumerates_the_usable_addresses',
      [str(h) for h in ipaddress.ip_network('10.0.0.0/29').hosts()],
      ['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.5', '10.0.0.6'])
check('subnets_and_supernet_answer_each_other',
      ([str(n) for n in ipaddress.ip_network('10.0.0.0/30').subnets()],
       str(ipaddress.ip_network('10.0.0.0/30').supernet())),
      (['10.0.0.0/31', '10.0.0.2/31'], '10.0.0.0/29'))
check('address_exclude_removes_a_subnet',
      sorted(str(n) for n in
             ipaddress.ip_network('10.0.0.0/24')
             .address_exclude(ipaddress.ip_network('10.0.0.0/25'))),
      ['10.0.0.128/25'])
check('subnet_of_and_supernet_of',
      (ipaddress.ip_network('10.0.0.0/25').subnet_of(ipaddress.ip_network('10.0.0.0/24')),
       ipaddress.ip_network('10.0.0.0/24').supernet_of(ipaddress.ip_network('10.0.0.0/25'))),
      (True, True))
check('collapse_addresses_merges_two_halves',
      [str(n) for n in ipaddress.collapse_addresses(
          [ipaddress.ip_network('10.0.0.0/25'), ipaddress.ip_network('10.0.0.128/25')])],
      ['10.0.0.0/24'])
check('summarize_address_range_covers_the_range',
      [str(n) for n in ipaddress.summarize_address_range(
          ipaddress.IPv4Address('10.0.0.1'), ipaddress.IPv4Address('10.0.0.5'))],
      ['10.0.0.1/32', '10.0.0.2/31', '10.0.0.4/31'])

# ----------------------------------------------------------- interfaces

check('ip_interface_knows_its_network_and_address',
      (str(ipaddress.ip_interface('10.0.0.5/24').network),
       str(ipaddress.ip_interface('10.0.0.5/24').ip)),
      ('10.0.0.0/24', '10.0.0.5'))
check('the_interface_classes_are_there_by_family',
      (type(ipaddress.ip_interface('10.0.0.5/24')).__name__,
       type(ipaddress.ip_interface('2001:db8::1/64')).__name__),
      ('IPv4Interface', 'IPv6Interface'))

# ----------------------------------------------------------- the spellings

check('a_network_prints_in_every_spelling',
      (ipaddress.ip_network('10.0.0.0/24').with_prefixlen,
       ipaddress.ip_network('10.0.0.0/24').with_netmask,
       ipaddress.ip_network('10.0.0.0/24').with_hostmask),
      ('10.0.0.0/24', '10.0.0.0/255.255.255.0', '10.0.0.0/0.0.0.255'))
check('netmask_and_hostmask_are_addresses',
      (str(ipaddress.ip_network('10.0.0.0/24').netmask),
       str(ipaddress.ip_network('10.0.0.0/24').hostmask)),
      ('255.255.255.0', '0.0.0.255'))
check('reverse_pointer_for_both_families',
      (ipaddress.ip_address('1.2.3.4').reverse_pointer,
       ipaddress.ip_address('::1').reverse_pointer[-9:]),
      ('4.3.2.1.in-addr.arpa', '.ip6.arpa'))

# ----------------------------------------------------------- the errors

check('the_error_classes_exist_and_subclass_value_error',
      (issubclass(ipaddress.AddressValueError, ValueError),
       issubclass(ipaddress.NetmaskValueError, ValueError)),
      (True, True))
check('a_bad_address_raises_the_specific_error',
      _raised(lambda: ipaddress.IPv4Address('999.1.1.1')), 'AddressValueError')
# ip_network() wraps the netmask failure in a plain ValueError; the specific
# class is what the FAMILY constructor raises.  Measured, not assumed.
check('a_bad_netmask_raises_the_specific_error',
      (_raised(lambda: ipaddress.ip_network('10.0.0.0/33')),
       _raised(lambda: ipaddress.IPv4Network('10.0.0.0/33'))),
      ('ValueError', 'NetmaskValueError'))
check('both_are_still_caught_as_a_value_error',
      _raised(lambda: ipaddress.IPv4Address('999.1.1.1'), ValueError), 'caught')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
