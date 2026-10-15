"Tests that enum.property and the ``property' builtin are siblings rather than
parent and child, as they are upstream, so pydoc and inspect classify the Enum
name/value descriptors as data descriptors rather than readonly properties --
without either class's Python-visible __mro__ naming the shared base.
Drives tests/python/property_not_dynamic_class_attribute.py."
Class {
	#name : 'PropertyNotDynamicClassAttributeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PropertyNotDynamicClassAttributeTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
PropertyNotDynamicClassAttributeTestCase >> setUp [
	"Reload tests/python/property_not_dynamic_class_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'property_not_dynamic_class_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/property_not_dynamic_class_attribute.py')
		name: 'property_not_dynamic_class_attribute'.

]

{ #category : 'Grail-Tests - Classification' }
PropertyNotDynamicClassAttributeTestCase >> testARealPropertyStillClassifiesAsOne [
	"The other half of the change: making the enum descriptor stop reading as a
	property must not stop a property from reading as one."

	self assert: (self resultAt: 'pydoc_kind_prop') asString equals: '''readonly property'''.
	self assert: (self resultAt: 'inspect_kind_prop') asString equals: '''property'''.

]

{ #category : 'Grail-Tests - Classification' }
PropertyNotDynamicClassAttributeTestCase >> testHelpOnAnEnumPrintsCPythonsHeading [
	"The observable end of it.  help(Color) is now byte-identical to CPython's
	for this class; the heading is the line that was wrong."

	self assert: (self resultAt: 'help_says_data_descriptors') asString equals: 'True'.
	self assert: (self resultAt: 'help_says_readonly_props') asString equals: 'False'.

]

{ #category : 'Grail-Tests - Classification' }
PropertyNotDynamicClassAttributeTestCase >> testInspectClassifiesThemAsDataWithNoSpecialCase [
	"inspect.classify_class_attrs has no DynamicClassAttribute branch upstream;
	``name'' reaches the 'data' fallback only because the property test above is
	False.  Grail's compensating branch is deleted, so this is what proves the
	fallthrough rather than the workaround is answering."

	self assert: (self resultAt: 'inspect_kind_name') asString equals: '''data'''.
	self assert: (self resultAt: 'inspect_kind_value') asString equals: '''data'''.

]

{ #category : 'Grail-Tests - The Relationship' }
PropertyNotDynamicClassAttributeTestCase >> testIsinstanceAnswersCPythonsWayForBothDescriptors [
	"The Enum member descriptor is a DynamicClassAttribute and NOT a property;
	a plain property is the reverse.  This is the single fact everything else in
	this file follows from."

	self assert: (self resultAt: 'name_isinstance_property') asString equals: 'False'.
	self assert: (self resultAt: 'name_isinstance_dca') asString equals: 'True'.
	self assert: (self resultAt: 'plain_isinstance_property') asString equals: 'True'.
	self assert: (self resultAt: 'plain_isinstance_dca') asString equals: 'False'.

]

{ #category : 'Grail-Tests - The Relationship' }
PropertyNotDynamicClassAttributeTestCase >> testNeitherMroNamesTheSharedImplementationBase [
	"Both are rooted directly at object upstream, so each MRO is exactly two
	long.  A leak here would be a REGRESSION for ``property'', whose MRO was
	right before the split -- which is why it is asserted rather than assumed."

	self assert: (self resultAt: 'property_mro_len') asString equals: '2'.
	self assert: (self resultAt: 'property_mro_tail') asString equals: 'True'.
	self assert: (self resultAt: 'dca_mro_len') asString equals: '2'.
	self assert: (self resultAt: 'dca_mro_tail') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Classification' }
PropertyNotDynamicClassAttributeTestCase >> testPydocClassifiesTheEnumMemberDescriptorsAsDataDescriptors [
	"'data descriptor', not 'readonly property'.  Both branches of pydoc's test
	run: the descriptor IS a data descriptor, and is NOT a property."

	self assert: (self resultAt: 'name_isdatadescriptor') asString equals: 'True'.
	self assert: (self resultAt: 'pydoc_kind_name') asString equals: '''data descriptor'''.
	self assert: (self resultAt: 'pydoc_kind_value') asString equals: '''data descriptor'''.

]

{ #category : 'Grail-Tests - Recorded Gaps' }
PropertyNotDynamicClassAttributeTestCase >> testRecordedGapsStillHold [
	"The first is long-standing; asserted so it is noticed when it closes rather
	than drifting unnoticed.  The second has closed.

	(1) Upstream these are TWO classes -- enum.property derives from
	types.DynamicClassAttribute.  Grail's types.py aliases one to the other, so
	they are one object.  Nothing in test_enum reads the difference; what it does
	read -- that neither is a ``property'' -- is asserted above.

	(2) The DECORATOR form ``@property def q'' compiles to a getter METHOD.  It is
	no longer a gap: a read off the class answers a property built from it and
	the class __dict__ holds the same property, so pydoc and inspect both agree
	with CPython.  Asserted here, where the gap was recorded, so a regression
	returns to the same place."

	self assert: (self resultAt: 'dca_is_enum_property') asString equals: 'True'.
	self assert: (self resultAt: 'decorated_pydoc_kind') asString equals: '''readonly property'''.
	self assert: (self resultAt: 'decorated_inspect_kind') asString equals: '''property'''.
	"Only the BUILTIN property is entered (___grailBuiltinPropertyNames___)."
	self assert: (self resultAt: 'enum_property_dict_entry_is_not_a_property') asString equals: 'False'.

]

{ #category : 'Grail-Tests - Behaviour Preserved' }
PropertyNotDynamicClassAttributeTestCase >> testTheSharedDescriptorBehaviourStillReachesBothClasses [
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

]

{ #category : 'Grail-Tests - The Relationship' }
PropertyNotDynamicClassAttributeTestCase >> testTheTwoDescriptorClassesAreNotRelatedByInheritance [
	"Neither direction.  Sharing an implementation superclass is how Smalltalk
	says ``two unrelated classes with the same behaviour''; making one the other's
	parent says something Python can read, and reads it wrongly."

	self assert: (self resultAt: 'dca_is_property') asString equals: 'False'.
	self assert: (self resultAt: 'property_is_dca') asString equals: 'False'.

]
