Class {
	#name : 'EnumMetaclassExtraMembersTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMetaclassExtraMembersTestCase >> namesAt: key [
	"The list result as an Array of Smalltalk strings, so assertions read
	plainly and do not depend on how a Python list prints."

	| out |
	out := OrderedCollection new.
	(self resultAt: key) do: [:each | out add: each asString].
	^ out asArray

]

{ #category : 'Grail-Private' }
EnumMetaclassExtraMembersTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMetaclassExtraMembersTestCase >> setUp [
	"Reload tests/python/enum_metaclass_extra_members.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_metaclass_extra_members' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_metaclass_extra_members.py')
		name: 'enum_metaclass_extra_members'.

]

{ #category : 'Grail-Tests - Injected members' }
EnumMetaclassExtraMembersTestCase >> testAMetaclassCanAddMembersToTheClassBody [
	"The failing assertion of test_enum's test_extra_member_creation: a
	metaclass injecting ``<NAME>_DESC'' into the classdict must produce FOUR
	members, in declaration order with the injected pair last."

	self assert: (self namesAt: 'members')
		equals: #('ID' 'NAME' 'ID_DESC' 'NAME_DESC').

]

{ #category : 'Grail-Tests - The CPython order' }
EnumMetaclassExtraMembersTestCase >> testAMetaclassThatInjectsNothingLeavesTheEnumAlone [
	"The deferral changes WHEN the build happens, never WHAT it produces: a
	quiet metaclass must still give the ordinary answer, aliases included."

	self assert: (self namesAt: 'quiet_members') equals: #('RED' 'GREEN').
	self assert: (self resultAt: 'quiet_alias_is_canonical') equals: true.

]

{ #category : 'Grail-Tests - Injected members' }
EnumMetaclassExtraMembersTestCase >> testAnInjectedMemberIsFoundByValue [
	"By-value lookup goes through _value2member_map_, so an injected member
	that never reached it would be invisible here even while iterating."

	self assert: (self resultAt: 'lookup_by_value') asString equals: 'NAME_DESC'.

]

{ #category : 'Grail-Tests - Injected members' }
EnumMetaclassExtraMembersTestCase >> testAnInjectedNameIsARealMember [
	"Not merely present in the iteration order: a real singleton member,
	reachable by name and carrying the injected value."

	self assert: (self resultAt: 'injected_is_a_member') equals: true.
	self assert: (self resultAt: 'injected_value') asString equals: '-id'.

]

{ #category : 'Grail-Tests - Recorded gap' }
EnumMetaclassExtraMembersTestCase >> testBypassingEnumMetaNewStillBuildsMembersWhichIsAKnownGap [
	"RECORDED DIVERGENCE.  A metaclass that calls type.__new__ directly
	bypasses EnumMeta.__new__, which IS CPython's builder, so CPython leaves
	the class with NO members.  Grail's builder hangs off type >> __new__:_:_:_:
	-- the very call this metaclass makes -- so the members appear.

	Separating the two would mean giving EnumMeta its own construction entry
	point; nothing in test_enum needs it.  Asserted so the gap is recorded and
	so closing it is a deliberate act rather than a surprise."

	self assert: (self namesAt: 'bypassing_members') equals: #('ONE').

]

{ #category : 'Grail-Tests - The CPython order' }
EnumMetaclassExtraMembersTestCase >> testTheMappingHoldsTheInjectedNamesBeforeSuperNewRuns [
	"The step that has to happen first: _EnumDict.__setitem__ appends an
	injected name to member_names, so the builder can see it at all."

	self assert: (self namesAt: 'trace_entered') equals: #('A' 'B').
	self assert: (self namesAt: 'trace_after_injection')
		equals: #('A' 'B' 'A_X' 'B_X').

]

{ #category : 'Grail-Tests - The CPython order' }
EnumMetaclassExtraMembersTestCase >> testTheMembersExistBySuperNewReturns [
	"...and the step that has to happen second, IN super().__new__ rather than
	before the metaclass ran -- which is the ordering this fixes.  Read from
	inside the metaclass, so a build that happened later would not satisfy it."

	self assert: (self namesAt: 'trace_after_super_new')
		equals: #('A' 'B' 'A_X' 'B_X').
	self assert: (self resultAt: 'traced_x_value') equals: 101.

]
