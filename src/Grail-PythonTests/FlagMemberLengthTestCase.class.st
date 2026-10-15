Class {
	#name : 'FlagMemberLengthTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FlagMemberLengthTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
FlagMemberLengthTestCase >> setUp [
	"Reload tests/python/flag_member_length.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'flag_member_length' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flag_member_length.py')
		name: 'flag_member_length'.

]

{ #category : 'Grail-Tests - len(member)' }
FlagMemberLengthTestCase >> testFlagMemberLength [
	"BLACK/GREEN/PURPLE/WHITE -> 0/1/2/3 set bits."

	self assert: (self resultAt: 'flag_lens') asString equals: '0,1,2,3'.

]

{ #category : 'Grail-Tests - len(member)' }
FlagMemberLengthTestCase >> testIntFlagMemberLength [
	"IntFlag is AbstractPyInt-rooted and does not inherit Flag, so it needs its
	own __len__ -- the second of the two failing test_member_length cases."

	self assert: (self resultAt: 'intflag_lens') asString equals: '0,1,2,3'.

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
FlagMemberLengthTestCase >> testIterationStillDecomposes [
	"__iter__ moved onto the shared helper, so pin it: a multi-bit member is
	decomposed into its canonical single-bit components, never yielded whole,
	and a zero member yields nothing."

	self assert: (self resultAt: 'iter') asString
		equals: '-;GREEN;RED,BLUE;RED,GREEN,BLUE'.
	self assert: (self resultAt: 'iter_int') asString
		equals: '-;GREEN;RED,BLUE;RED,GREEN,BLUE'.

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
FlagMemberLengthTestCase >> testLenAgreesWithIteration [
	"The two now come from one decomposition, so they cannot drift."

	self assert: (self resultAt: 'agree').

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
FlagMemberLengthTestCase >> testLenOfTheClassStillCountsMembers [
	"Only INSTANCE access is shadowed: len(Color) must still be the canonical
	member count, not a bit count."

	self assert: (self resultAt: 'class_lens') asString equals: '3/3'.

]

{ #category : 'Grail-Tests - Unbound off the class' }
FlagMemberLengthTestCase >> testUnboundClassLenReachesTheMemberMethod [
	"``Color.__len__(member)'' -- the exact spelling test_member_length uses,
	and the one that was resolving to the metaclass method."

	self assert: (self resultAt: 'unbound') asString equals: '0,1,2,3'.
	self assert: (self resultAt: 'unbound_int') asString equals: '0,1,2,3'.

]
