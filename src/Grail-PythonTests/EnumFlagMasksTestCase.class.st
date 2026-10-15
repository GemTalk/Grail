Class {
	#name : 'EnumFlagMasksTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumFlagMasksTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumFlagMasksTestCase >> setUp [
	"Reload tests/python/enum_flag_masks.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_flag_masks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_flag_masks.py')
		name: 'enum_flag_masks'.

]

{ #category : 'Grail-Tests - What each mask counts' }
EnumFlagMasksTestCase >> testAllBitsFillsTheGaps [
	"A = 1, B = 2, D = 8: the mask is 11 -- bit 4 is nobody's -- while _all_bits_
	is 15, every position up to the highest one used."

	self assert: (self resultAt: 'gappy') asString equals: '11/11/15'.

]

{ #category : 'Grail-Tests - What each mask counts' }
EnumFlagMasksTestCase >> testAMultiBitMemberCountsInOneMaskOnly [
	"``MASK = 255'' is in _flag_mask_ but not in _singles_mask_, which is the
	space a STRICT/CONFORM flag inverts within."

	self assert: (self resultAt: 'masked') asString equals: '255/3/255'.

]

{ #category : 'Grail-Tests - What each mask counts' }
EnumFlagMasksTestCase >> testANonFlagEnumHasNoneOfThem [
	"CPython sets all three only for a Flag subclass, so reading one off a plain
	Enum is an AttributeError.  Answering 0 would quietly make every enum look
	like an empty flag."

	self assert: (self resultAt: 'not_a_flag') asString
		equals: '_all_bits_:type object ''NotAFlag'' has no attribute ''_all_bits_'';_flag_mask_:type object ''NotAFlag'' has no attribute ''_flag_mask_'';_singles_mask_:type object ''NotAFlag'' has no attribute ''_singles_mask_'''.

]

{ #category : 'Grail-Tests - A custom __new__ that shifts' }
EnumFlagMasksTestCase >> testIntFlag [
	"1 << ord('a'), so the numbers are large enough that _all_bits_ and
	_flag_mask_ could not be confused for one another: all_bits, flag_mask, the
	member's own int value, and ORing a bit nothing names."

	self assert: (self resultAt: 'int_flag') asString equals: 'True;True;True;True'.

]

{ #category : 'Grail-Tests - A custom __new__ that shifts' }
EnumFlagMasksTestCase >> testMixedInFlagWithABoundaryKeyword [
	"The second defect: ``class X(int, Flag, boundary=KEEP)'' is rooted on int,
	so its metaclass answered neither the masks nor the boundary setter -- the
	class statement itself died on a MessageNotUnderstood."

	self assert: (self resultAt: 'mi_flag') asString equals: 'True;True;True;True'.

]

{ #category : 'Grail-Tests - A custom __new__ that shifts' }
EnumFlagMasksTestCase >> testPlainFlag [
	"object.__new__ rather than int.__new__, and a second member at bit 1, so
	the mask is the OR of the two."

	self assert: (self resultAt: 'plain_flag') asString equals: 'True;True;True'.

]
