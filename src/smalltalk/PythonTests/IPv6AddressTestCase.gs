! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IPv6AddressTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IPv6AddressTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IPv6AddressTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IPv6AddressTestCase - ipaddress IPv6 support
! ===============================================================================
! Grail implements ``ipaddress'' in Smalltalk (src/smalltalk/Python/ipaddress.gs)
! rather than vendoring CPython's ipaddress.py, so every behaviour here is a
! re-implementation rather than a copy, and every one of them is a chance to
! drift.  tests/python/ipaddress_ipv6_conformance.py states the expectations as
! literals and scripts/check_python_fixtures.sh runs it under real CPython 3.14,
! so what this class asserts is measured against CPython and not against Grail's
! own behaviour.
!
! WHY VENDORING WAS NOT THE ROUTE (measured, not assumed): CPython 3.14's
! ipaddress.py dropped into src/python/stdlib/ compiles under Grail and builds
! its classes, then dies in module-level init on two SHARED-machinery gaps --
! int.from_bytes() rejects the iterable-of-ints form that _ip_int_from_string
! uses, and a subclass that declares no __slots__ inherits strict-slots from a
! base that declares __slots__ = () (CPython gives such a subclass a __dict__),
! so IPv4Network.__init__'s ``self.network_address = ...'' is an AttributeError.
! Both are real defects worth fixing on their own; neither belongs in a leaf
! stdlib module's PR.
!
! The surface deliberately NOT implemented is listed in the ipaddress module
! comment and pinned by testOmissionsAreDeliberate below.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IPv6AddressTestCase removeAllMethods.
IPv6AddressTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - ipaddress'
method: IPv6AddressTestCase
testIPv6MatchesCPython
	"Every check in tests/python/ipaddress_ipv6_conformance.py, which the
	fixture gate also runs under CPython 3.14.

	The keys are listed rather than iterated so that a check DISAPPEARING is
	a failure too -- a fixture that stopped defining RESULTS entirely would
	otherwise pass this test with an empty loop."

	| mod results keys |
	importlib @env1:modules removeKey: #'ipaddress_ipv6_conformance' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ipaddress_ipv6_conformance.py')
		name: 'ipaddress_ipv6_conformance'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	keys :=
	#('accept_bare_quad' 'cat_documentation' 'cat_link_local' 'cat_loopback'
	  'cat_multicast' 'cat_nat64' 'cat_private_exception'
	  'cat_private_non_exception' 'cat_public' 'cat_rfc9637'
	  'cat_unique_local' 'cat_unspecified' 'ctor_v4_bytes' 'ctor_v4_int'
	  'ctor_v4_str' 'ctor_v6_bytes' 'ctor_v6_int' 'ctor_v6_str'
	  'dispatch_v4_isinstance' 'dispatch_v4_type' 'dispatch_v4_version'
	  'dispatch_v6_isinstance' 'dispatch_v6_type' 'dispatch_v6_version'
	  'eq_across_families' 'eq_different' 'eq_same' 'hash_same'
	  'int_arg_negative' 'int_arg_too_big' 'int_arg_v4' 'int_arg_v6'
	  'ipv4_mapped_absent' 'ipv4_mapped_present' 'lt_across_families_raises'
	  'lt_within_family' 'mapped_delegates_global' 'mapped_delegates_loopback'
	  'mapped_delegates_private' 'net_bad_prefix' 'net_class_ctor_v4'
	  'net_class_ctor_v6' 'net_contains_default_route' 'net_contains_inside'
	  'net_contains_link_local' 'net_contains_outside'
	  'net_contains_wrong_family' 'net_eq' 'net_eq_across_families'
	  'net_garbage' 'net_v4_prefix_too_big' 'net_v4_still_works' 'net_v4_type'
	  'net_v6_bare_address' 'net_v6_broadcast' 'net_v6_default_route_num'
	  'net_v6_exploded' 'net_v6_network_address' 'net_v6_non_strict_coerces'
	  'net_v6_num_addresses' 'net_v6_prefix_too_big' 'net_v6_prefixlen'
	  'net_v6_repr' 'net_v6_str' 'net_v6_strict_rejects_host_bits'
	  'net_v6_type' 'net_v6_version' 'packed_equality_v6'
	  'packed_inequality_across_families' 'packed_v4_high'
	  'packed_v4_is_bytes' 'packed_v6_len' 'packed_v6_loopback'
	  'packed_v6_mapped' 'reject_02001:db8::1' 'reject_0x1::' 'reject_1.2.3'
	  'reject_1.2.3.4.5' 'reject_12345::' 'reject_1:2:3:4:5:6:1.2.3.4.5'
	  'reject_1:2:3:4:5:6:7' 'reject_1:2:3:4:5:6:7:8%eth0%x'
	  'reject_1:2:3:4:5:6:7:8:' 'reject_1:2:3:4:5:6:7:8:9'
	  'reject_1:2:3:4:5:6:7:xyz' 'reject_1::2::3' 'reject_2001:db8::1%'
	  'reject_999.0.0.1' 'reject_:' 'reject_:1:2:3:4:5:6:7' 'reject_::1/64'
	  'reject_::1::2' 'reject_:::' 'reject_::ffff:1.2.3.4.5' 'reject_empty'
	  'reject_gg::1' 'scope_breaks_equality' 'scope_equal_when_same'
	  'scope_id' 'scope_id_absent' 'scope_int_ignores_zone' 'scope_str'
	  'site_local_false' 'site_local_on_v4_mapped' 'site_local_true'
	  'sixtofour_absent' 'sixtofour_present' 'urllib3_shape' 'v4_compressed'
	  'v4_exploded' 'v4_max_prefixlen' 'v4_repr' 'v6_all_hextets'
	  'v6_compressed' 'v6_doc_prefix' 'v6_embedded_all_zero_quad'
	  'v6_embedded_quad_not_mapped' 'v6_exploded' 'v6_exploded_mapped'
	  'v6_exploded_zero' 'v6_int' 'v6_int_big' 'v6_int_mapped'
	  'v6_leading_zeros_dropped' 'v6_longest_run_compressed' 'v6_loopback'
	  'v6_mapped_keeps_dotted_quad' 'v6_mapped_keeps_dotted_quad_2'
	  'v6_max_prefixlen' 'v6_repr' 'v6_single_zero_not_compressed'
	  'v6_trailing_double_colon' 'v6_unspecified' 'v6_zeros_written_out').
	keys do: [:key |
		self
			assert: ((results @env1:__getitem__: key) = true)
			description: key , ' -> ' , (results @env1:__getitem__: key) printString].
	self assert: keys size equals: 134
%

category: 'Grail-Tests - ipaddress'
method: IPv6AddressTestCase
testImportShapes
	"The spellings the real callers use.  urllib3's ssl_match_hostname.py
	opens with

	    import ipaddress
	    from ipaddress import IPv4Address, IPv6Address

	and that second line was the ImportError that stopped ``import urllib3''
	dead.  The names must bind the CLASSES, not constructor methods, or
	isinstance() cannot discriminate."

	self assert: (self eval:
'from ipaddress import IPv4Address, IPv6Address
IPv4Address.__name__ + '','' + IPv6Address.__name__
') equals: 'IPv4Address,IPv6Address'.
	self assert: (self eval:
'from ipaddress import IPv4Address, IPv6Address
import ipaddress
a = ipaddress.ip_address(''::1'')
isinstance(a, (IPv4Address, IPv6Address)) and isinstance(a, IPv6Address)
') equals: true.
	self assert: (self eval:
'from ipaddress import IPv4Network, IPv6Network
IPv4Network.__name__ + '','' + IPv6Network.__name__
') equals: 'IPv4Network,IPv6Network'.
	self assert: (self eval:
'import ipaddress
ipaddress.IPv6Address(''2001:db8::1'').exploded
') equals: '2001:0db8:0000:0000:0000:0000:0000:0001'
%

category: 'Grail-Tests - ipaddress'
method: IPv6AddressTestCase
testOmissionsAreDeliberate
	"The half of CPython's ipaddress that Grail does NOT provide.

	A faithful subset beats a half-working full port, but only if the
	boundary is written down: stubbing hosts() or ip_interface() would let
	code that needs real network algebra get something that merely looks
	like it.  This test pins the boundary as a decision rather than an
	oversight -- adding any of these should fail here first.

	AddressValueError / NetmaskValueError are on the list because Grail
	raises plain ValueError, which those CPython classes SUBCLASS -- so
	``except ValueError'' code (urllib3's match_hostname) is unaffected,
	while ``except ipaddress.AddressValueError'' is not available."

	self assert: (self eval:
'import ipaddress
present = []
for name in (''ip_interface'', ''IPv4Interface'', ''IPv6Interface'',
             ''collapse_addresses'', ''summarize_address_range'',
             ''get_mixed_type_key'', ''AddressValueError'',
             ''NetmaskValueError''):
    if hasattr(ipaddress, name):
        present.append(name)
len(present)
') equals: 0.
	self assert: (self eval:
'import ipaddress
n = ipaddress.ip_network(''2001:db8::/32'')
present = []
for name in (''hosts'', ''subnets'', ''supernet'', ''address_exclude'',
             ''subnet_of'', ''supernet_of'', ''netmask'', ''hostmask'',
             ''with_prefixlen'', ''with_netmask'', ''with_hostmask''):
    if hasattr(n, name):
        present.append(name)
len(present)
') equals: 0.
	self assert: (self eval:
'import ipaddress
a = ipaddress.ip_address(''::1'')
present = []
for name in (''reverse_pointer'', ''teredo''):
    if hasattr(a, name):
        present.append(name)
len(present)
') equals: 0
%
