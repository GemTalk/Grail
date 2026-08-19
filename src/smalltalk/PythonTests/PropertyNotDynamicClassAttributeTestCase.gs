! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PropertyNotDynamicClassAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PropertyNotDynamicClassAttributeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PropertyNotDynamicClassAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PropertyNotDynamicClassAttributeTestCase
!
! ``property'' and ``enum.property'' must not be related by inheritance.
!
! Upstream, enum.property derives from types.DynamicClassAttribute, which derives
! from object.  It RE-IMPLEMENTS the descriptor protocol rather than inheriting
! it, so the two hierarchies never meet and
! ``isinstance(Enum.__dict__['name'], property)'' is False.
!
! Grail shared the implementation the obvious Smalltalk way -- DynamicClassAttribute
! subclassed PropertyDescriptor, which IS the ``property'' builtin -- and that
! isinstance answered True.  The BEHAVIOUR was right; only the relationship was
! wrong, which is why it stayed invisible until something CLASSIFIED on it:
!
!     pydoc.classify_class_attrs:
!         if inspect.isdatadescriptor(value):
!             kind = 'data descriptor'
!             if isinstance(value, property) and value.fset is None:
!                 kind = 'readonly property'
!
! Enum.name and Enum.value are data descriptors with no setter, so ``help(Color)''
! printed ``Readonly properties inherited from enum.Enum:'' where CPython prints
! ``Data descriptors ...''.  That was the last remaining difference in test_enum's
! TestStdLib.test_pydoc.  inspect.classify_class_attrs had already grown a
! DynamicClassAttribute branch upstream does not have, purely to stop the same
! isinstance from reporting kind 'property' -- a second symptom of one cause, and
! deleted with this change.
!
! THE SHAPE OF THE FIX.  The shared behaviour moves to AbstractPropertyDescriptor
! and the two classes hang off it as siblings, so the isinstance answers are
! CPython's and the implementation is still written once.  Everything that means
! ``any property-like descriptor'' -- ___setNameOn___:named:,
! ___isValueDescriptor___:, ___instancePropertyDescriptorFor___:, Enum's
! ___grailMemberDir: -- asks isKindOf: AbstractPropertyDescriptor, which is what
! it always meant.
!
! WHY THE MRO CHECKS ARE NOT DECORATION.  That base stands in for ``object''
! rather than being a class CPython has, so it is hidden from Python-visible
! __mro__ the way PythonInstance is (importlib class >>
! ___withoutImplementationRoots___:for:).  Without that, the split would leak a
! Grail-internal name into TWO builtins' MROs -- including ``property'', whose
! MRO was previously right.  The fixture reaches the property class through
! ``type(a_property)'' rather than by name, because Grail's builtin ``property''
! is a function stand-in and ``property.__mro__'' is an AttributeError there --
! naming it would make the check vacuous rather than false.
!
! Source fixture: tests/python/property_not_dynamic_class_attribute.py
! ===============================================================================

doit
PropertyNotDynamicClassAttributeTestCase comment:
'Tests that enum.property and the ``property'' builtin are siblings rather than
parent and child, as they are upstream, so pydoc and inspect classify the Enum
name/value descriptors as data descriptors rather than readonly properties --
without either class''s Python-visible __mro__ naming the shared base.
Drives tests/python/property_not_dynamic_class_attribute.py.'
%

doit
PropertyNotDynamicClassAttributeTestCase removeAllMethods.
PropertyNotDynamicClassAttributeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PropertyNotDynamicClassAttributeTestCase
setUp
	"Reload tests/python/property_not_dynamic_class_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'property_not_dynamic_class_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/property_not_dynamic_class_attribute.py')
		name: 'property_not_dynamic_class_attribute'.
%

category: 'Grail-Private'
method: PropertyNotDynamicClassAttributeTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The Relationship'
method: PropertyNotDynamicClassAttributeTestCase
testTheTwoDescriptorClassesAreNotRelatedByInheritance
	"Neither direction.  Sharing an implementation superclass is how Smalltalk
	says ``two unrelated classes with the same behaviour''; making one the other's
	parent says something Python can read, and reads it wrongly."

	self assert: (self resultAt: 'dca_is_property') asString equals: 'False'.
	self assert: (self resultAt: 'property_is_dca') asString equals: 'False'.
%

category: 'Grail-Tests - The Relationship'
method: PropertyNotDynamicClassAttributeTestCase
testIsinstanceAnswersCPythonsWayForBothDescriptors
	"The Enum member descriptor is a DynamicClassAttribute and NOT a property;
	a plain property is the reverse.  This is the single fact everything else in
	this file follows from."

	self assert: (self resultAt: 'name_isinstance_property') asString equals: 'False'.
	self assert: (self resultAt: 'name_isinstance_dca') asString equals: 'True'.
	self assert: (self resultAt: 'plain_isinstance_property') asString equals: 'True'.
	self assert: (self resultAt: 'plain_isinstance_dca') asString equals: 'False'.
%

category: 'Grail-Tests - The Relationship'
method: PropertyNotDynamicClassAttributeTestCase
testNeitherMroNamesTheSharedImplementationBase
	"Both are rooted directly at object upstream, so each MRO is exactly two
	long.  A leak here would be a REGRESSION for ``property'', whose MRO was
	right before the split -- which is why it is asserted rather than assumed."

	self assert: (self resultAt: 'property_mro_len') asString equals: '2'.
	self assert: (self resultAt: 'property_mro_tail') asString equals: 'True'.
	self assert: (self resultAt: 'dca_mro_len') asString equals: '2'.
	self assert: (self resultAt: 'dca_mro_tail') asString equals: 'True'.
%

category: 'Grail-Tests - Classification'
method: PropertyNotDynamicClassAttributeTestCase
testPydocClassifiesTheEnumMemberDescriptorsAsDataDescriptors
	"'data descriptor', not 'readonly property'.  Both branches of pydoc's test
	run: the descriptor IS a data descriptor, and is NOT a property."

	self assert: (self resultAt: 'name_isdatadescriptor') asString equals: 'True'.
	self assert: (self resultAt: 'pydoc_kind_name') asString equals: '''data descriptor'''.
	self assert: (self resultAt: 'pydoc_kind_value') asString equals: '''data descriptor'''.
%

category: 'Grail-Tests - Classification'
method: PropertyNotDynamicClassAttributeTestCase
testInspectClassifiesThemAsDataWithNoSpecialCase
	"inspect.classify_class_attrs has no DynamicClassAttribute branch upstream;
	``name'' reaches the 'data' fallback only because the property test above is
	False.  Grail's compensating branch is deleted, so this is what proves the
	fallthrough rather than the workaround is answering."

	self assert: (self resultAt: 'inspect_kind_name') asString equals: '''data'''.
	self assert: (self resultAt: 'inspect_kind_value') asString equals: '''data'''.
%

category: 'Grail-Tests - Classification'
method: PropertyNotDynamicClassAttributeTestCase
testARealPropertyStillClassifiesAsOne
	"The other half of the change: making the enum descriptor stop reading as a
	property must not stop a property from reading as one."

	self assert: (self resultAt: 'pydoc_kind_prop') asString equals: '''readonly property'''.
	self assert: (self resultAt: 'inspect_kind_prop') asString equals: '''property'''.
%

category: 'Grail-Tests - Classification'
method: PropertyNotDynamicClassAttributeTestCase
testHelpOnAnEnumPrintsCPythonsHeading
	"The observable end of it.  help(Color) is now byte-identical to CPython's
	for this class; the heading is the line that was wrong."

	self assert: (self resultAt: 'help_says_data_descriptors') asString equals: 'True'.
	self assert: (self resultAt: 'help_says_readonly_props') asString equals: 'False'.
%

category: 'Grail-Tests - Behaviour Preserved'
method: PropertyNotDynamicClassAttributeTestCase
testTheSharedDescriptorBehaviourStillReachesBothClasses
	"fget/fset/fdel, the doc handling, the getter/setter copies and __set_name__
	all moved to the abstract base; nothing about either class's descriptor
	protocol may change.  The last assertion covers the ONE method the subclass
	adds -- an enum.property refuses CLASS access -- which is the behaviour the
	class exists for."

	self assert: (self resultAt: 'name_fget_present') asString equals: 'True'.
	self assert: (self resultAt: 'name_doc') asString equals: '''The name of the Enum member.'''.
	self assert: (self resultAt: 'plain_fset_none') asString equals: 'True'.
	self assert: (self resultAt: 'plain_setter_has_fset') asString equals: 'True'.
	self assert: (self resultAt: 'prop_set_name') asString equals: '''p'''.
	self assert: (self resultAt: 'class_access') asString equals: '''AttributeError'''.
%

category: 'Grail-Tests - Recorded Gaps'
method: PropertyNotDynamicClassAttributeTestCase
testRecordedGapsStillHold
	"Both are long-standing and orthogonal to this change; asserted so they are
	noticed when they close rather than drifting unnoticed.

	(1) Upstream these are TWO classes -- enum.property derives from
	types.DynamicClassAttribute.  Grail's types.py aliases one to the other, so
	they are one object.  Nothing in test_enum reads the difference; what it does
	read -- that neither is a ``property'' -- is asserted above.

	(2) The DECORATOR form ``@property def q'' is compiled by ClassDefAst into a
	plain getter METHOD, so no descriptor is stored and both classifiers answer
	'method' where CPython answers 'readonly property' / 'property'.  The CALL
	form, which does store one, is what the classification tests above use."

	self assert: (self resultAt: 'dca_is_enum_property') asString equals: 'True'.
	self assert: (self resultAt: 'decorated_pydoc_kind') asString equals: '''method'''.
	self assert: (self resultAt: 'decorated_inspect_kind') asString equals: '''method'''.
%
