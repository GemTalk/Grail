Class {
	#name : 'EnumDescriptorMemberTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDescriptorMemberTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumDescriptorMemberTestCase >> setUp [
	"Reload tests/python/enum_descriptor_member.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_descriptor_member' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_descriptor_member.py')
		name: 'enum_descriptor_member'.

]

{ #category : 'Grail-Private' }
EnumDescriptorMemberTestCase >> stringAt: key [
	"The fixture joins every sequence it reports into a comma-separated STRING,
	so an assertion is a plain string compare -- no list marshalling between
	the Python and Smalltalk sides."

	^ (self resultAt: key) asString

]

{ #category : 'Grail-Tests - Class as decorator' }
EnumDescriptorMemberTestCase >> testClassAppliesAsDecoratorAtEveryScope [
	"A class reached through the INDIRECT call protocol constructs.  Only the
	function-local scope worked before: the module-level and class-body
	decorator emitters wrap their rebinding store in an error-swallowing guard,
	so the TypeError this used to raise left the decorator silently unapplied
	and the plain function in place."

	self assert: (self stringAt: 'module_decorator') equals: 'Wrap'.
	self assert: (self stringAt: 'classbody_decorator') equals: 'Wrap'.
	self assert: (self stringAt: 'function_decorator') equals: 'Wrap'.

]

{ #category : 'Grail-Tests - Descriptor is not a member' }
EnumDescriptorMemberTestCase >> testClassBodyDescriptorIsNotAMember [
	"``class E(Enum): x = property(f)'' -- x is an ordinary class attribute,
	not a member, so it is absent from iteration (CPython _EnumDict)."

	self assert: (self stringAt: 'classbody_members') equals: 'A,B'.

]

{ #category : 'Grail-Tests - Descriptor is not a member' }
EnumDescriptorMemberTestCase >> testFunctionalDescriptorIsNotAMember [
	"Enum('BaseEnum', {'first': enum.property(f)}) has NO members.  Grail used
	to build ``<BaseEnum.first: <PropertyDescriptor object>>'' here."

	self assert: (self stringAt: 'base_members') equals: ''.

]

{ #category : 'Grail-Tests - Descriptor is not a member' }
EnumDescriptorMemberTestCase >> testMemberLessDescriptorBaseIsExtendable [
	"An enum holding only descriptors keeps NO members, so it is still legal to
	subclass -- CPython forbids extending an enum that HAS members, which is
	what a descriptor counted as a member would have made this."

	self assert: (self stringAt: 'main_members') equals: 'first,second,third'.
	self assert: (self stringAt: 'main_values') equals: '1,2,3'.

]

{ #category : 'Grail-Tests - Descriptor is not a member' }
EnumDescriptorMemberTestCase >> testMemberShadowingDescriptorRedirects [
	"CPython's _proto_member.__set_name__ redirect: a member whose name shadows
	an inherited descriptor answers the MEMBER off the class and the
	DESCRIPTOR off a member instance."

	self assert: (self stringAt: 'main_first_repr') equals: '<MainEnum.first: 1>'.
	self assert: (self stringAt: 'member_first')
		equals: 'first is first!,second is first!,third is first!'.

]

{ #category : 'Grail-Tests - Class as decorator' }
EnumDescriptorMemberTestCase >> testNonCallableStillRaises [
	"The default stays a TypeError for a receiver that is genuinely not
	callable -- only Behaviors were carved out."

	self assert: (self stringAt: 'non_callable') equals: 'TypeError'.

]
