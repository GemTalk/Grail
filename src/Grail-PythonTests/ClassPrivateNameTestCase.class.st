Class {
	#name : 'ClassPrivateNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassPrivateNameTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassPrivateNameTestCase >> setUp [
	"Reload tests/python/class_private_names.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_private_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_private_names.py')
		name: 'class_private_names'.

]

{ #category : 'Grail-Tests - The binding is mangled' }
ClassPrivateNameTestCase >> testAnnotatedAssignmentMangles [
	"``__a: int = 5'' declares _Annotated__a, as the plain assignment does."

	self assert: (self resultAt: 'annotated') asString equals: '5/5'.

]

{ #category : 'Grail-Tests - The binding is mangled' }
ClassPrivateNameTestCase >> testClassBodyBindingDeclaresTheMangledName [
	"``__x = 1'' in class C declares _C__x and NOT __x -- the half that was
	missing, and the reason self.__x could not find it."

	self assert: (self resultAt: 'mangled') equals: 1.
	self assert: (self resultAt: 'unmangled') asString equals: 'MISSING'.

]

{ #category : 'Grail-Tests - Enums' }
ClassPrivateNameTestCase >> testEnumPrivateNamesAreAttributesNotMembers [
	"CPython's _is_private, checked BEFORE _is_sunder.  Both of these used to
	raise: __major_ read as a reserved sunder."

	self assert: (self resultAt: 'enum_corporal') asString equals: 'Radar'.
	self assert: (self resultAt: 'enum_major') asString equals: 'Hoolihan'.
	self assert: (self resultAt: 'enum_members') asString equals: 'ONE'.

]

{ #category : 'Grail-Tests - Enums' }
ClassPrivateNameTestCase >> testGenuineSunderStillRejected [
	"The corrected _is_sunder must still catch a real one."

	self assert: (self resultAt: 'sunder_rejected') asString equals: 'ValueError'.

]

{ #category : 'Grail-Tests - Per-class, which is the point' }
ClassPrivateNameTestCase >> testInstanceStoreShadowsTheClassDefault [
	"``self.__n = self.__n + 1'' reads the class default the first time and
	writes an INSTANCE attribute; the class attribute is untouched."

	self assert: (self resultAt: 'bump') asString equals: '1,2'.
	self assert: (self resultAt: 'class_default_intact') equals: 0.

]

{ #category : 'Grail-Tests - The binding is mangled' }
ClassPrivateNameTestCase >> testLaterClassBodyReferenceSeesIt [
	"``__y = __x + 1'' -- a bare name read in the same body.  The name SETS the
	NameAst branches consult are mangled too, so the read finds the accessor
	instead of falling through to the module global."

	self assert: (self resultAt: 'prior_ref') equals: 2.

]

{ #category : 'Grail-Tests - The binding is mangled' }
ClassPrivateNameTestCase >> testMethodReadsTheClassLevelDefault [
	"The idiom the gap broke: a private attribute with a class-body default,
	read through self."

	self assert: (self resultAt: 'via_method') equals: 1.
	self assert: (self resultAt: 'via_method_y') equals: 2.

]

{ #category : 'Grail-Tests - The binding is mangled' }
ClassPrivateNameTestCase >> testPrivateMethodStillReachable [
	"``def __helper'' already mangled; pin it, since ___boundTargetNames___ now
	reports the mangled name and the sibling-name sets are matched against it."

	self assert: (self resultAt: 'private_method') asString equals: 'helped'.

]

{ #category : 'Grail-Tests - Names that must NOT mangle' }
ClassPrivateNameTestCase >> testSingleUnderscoreAndDunderUntouched [
	"One leading underscore is not private, and a dunder never mangles -- which
	is what keeps __init__ / __slots__ / Grail's own ___internal___ names, and
	every read of them, working."

	self assert: (self resultAt: 'single_underscore') equals: 3.
	self assert: (self resultAt: 'dunder') equals: 4.

]

{ #category : 'Grail-Tests - Per-class, which is the point' }
ClassPrivateNameTestCase >> testSubclassGetsItsOwnSlot [
	"Mangling is what makes a private attribute per-class: Derived's __slot is a
	different name from Base's, so Base's method keeps reading Base's."

	self assert: (self resultAt: 'base_sees_base') asString equals: 'base'.
	self assert: (self resultAt: 'derived_sees_derived') asString equals: 'derived'.
	self assert: (self resultAt: 'both_slots') asString equals: 'base/derived'.

]
