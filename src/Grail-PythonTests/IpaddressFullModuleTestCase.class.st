Class {
	#name : 'IpaddressFullModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
IpaddressFullModuleTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
IpaddressFullModuleTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
IpaddressFullModuleTestCase >> setUp [

	importlib @env1:modules removeKey: #'ipaddress_full_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ipaddress_full_module.py')
		name: 'ipaddress_full_module'

]

{ #category : 'Grail-Tests - ipaddress' }
IpaddressFullModuleTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests - ipaddress' }
IpaddressFullModuleTestCase >> testTheInterfaceClassesAndEverySpelling [

	self assertAll: #('ip_interface_knows_its_network_and_address'
		'the_interface_classes_are_there_by_family'
		'a_network_prints_in_every_spelling'
		'netmask_and_hostmask_are_addresses'
		'reverse_pointer_for_both_families')

]

{ #category : 'Grail-Tests - ipaddress' }
IpaddressFullModuleTestCase >> testTheNetworkAlgebraComputesCorrectAnswers [

	self assertAll: #('hosts_enumerates_the_usable_addresses'
		'subnets_and_supernet_answer_each_other'
		'address_exclude_removes_a_subnet'
		'subnet_of_and_supernet_of'
		'collapse_addresses_merges_two_halves'
		'summarize_address_range_covers_the_range')

]

{ #category : 'Grail-Tests - ipaddress' }
IpaddressFullModuleTestCase >> testTheSpecificErrorClassesAreRaisedAndStillCaughtAsValueError [

	self assertAll: #('the_error_classes_exist_and_subclass_value_error'
		'a_bad_address_raises_the_specific_error'
		'a_bad_netmask_raises_the_specific_error'
		'both_are_still_caught_as_a_value_error')

]
