! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IpaddressFullModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IpaddressFullModuleTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IpaddressFullModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IpaddressFullModuleTestCase - the half of ipaddress the subset never had
! ===============================================================================
! Grail's ``ipaddress'' was 1701 lines of hand-written Smalltalk covering
! addresses and a little of networks.  IPv6AddressTestCase used to carry a
! testOmissionsAreDeliberate pinning what it left out -- hosts(), ip_interface(),
! collapse_addresses(), AddressValueError and the rest -- as ABSENT, on the
! argument that a faithful subset beats a half-working port as long as the
! boundary is written down.
!
! CPython's own module is vendored now, so the boundary is gone, and this class
! is the other half of that bargain: the names that test pinned as absent are
! asserted PRESENT AND WORKING.  Network algebra is what they are for, and
! algebra that merely looks right is the failure mode the old test guarded
! against -- so every check is a computed answer, never a hasattr.
!
! tests/python/ipaddress_full_module.py holds the 15 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IpaddressFullModuleTestCase removeAllMethods.
IpaddressFullModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IpaddressFullModuleTestCase
setUp

	importlib @env1:modules removeKey: #'ipaddress_full_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ipaddress_full_module.py')
		name: 'ipaddress_full_module'
%

category: 'Grail-Helpers'
method: IpaddressFullModuleTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: IpaddressFullModuleTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - ipaddress'
method: IpaddressFullModuleTestCase
testTheNetworkAlgebraComputesCorrectAnswers

	self assertAll: #('hosts_enumerates_the_usable_addresses'
		'subnets_and_supernet_answer_each_other'
		'address_exclude_removes_a_subnet'
		'subnet_of_and_supernet_of'
		'collapse_addresses_merges_two_halves'
		'summarize_address_range_covers_the_range')
%

category: 'Grail-Tests - ipaddress'
method: IpaddressFullModuleTestCase
testTheInterfaceClassesAndEverySpelling

	self assertAll: #('ip_interface_knows_its_network_and_address'
		'the_interface_classes_are_there_by_family'
		'a_network_prints_in_every_spelling'
		'netmask_and_hostmask_are_addresses'
		'reverse_pointer_for_both_families')
%

category: 'Grail-Tests - ipaddress'
method: IpaddressFullModuleTestCase
testTheSpecificErrorClassesAreRaisedAndStillCaughtAsValueError

	self assertAll: #('the_error_classes_exist_and_subclass_value_error'
		'a_bad_address_raises_the_specific_error'
		'a_bad_netmask_raises_the_specific_error'
		'both_are_still_caught_as_a_value_error')
%

category: 'Grail-Tests - ipaddress'
method: IpaddressFullModuleTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15
%
