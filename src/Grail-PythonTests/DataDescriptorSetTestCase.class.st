Class {
	#name : 'DataDescriptorSetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
DataDescriptorSetTestCase >> ___assertCheck: aName [
	"Assert one named fixture check, naming it in the failure message."

	self assert: (self ___check: aName) equals: true.

]

{ #category : 'Grail-Setup' }
DataDescriptorSetTestCase >> ___check: aName [
	"Run one named check from the fixture and answer its Boolean."

	^ (testModule @env1:___pyAttrLoad___: aName)
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Setup' }
DataDescriptorSetTestCase >> setUp [
	"Reload tests/python/data_descriptor_set.py fresh each test -- the
	descriptors record their calls in module-level state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'data_descriptor_set' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/data_descriptor_set.py')
		name: 'data_descriptor_set'.

]

{ #category : 'Grail-Tests - Stored Property' }
DataDescriptorSetTestCase >> testAStoredPropertyNearerThanTheCompiledOneTakesTheStore [
	"A store on an instance is decided by the NEAREST class in the MRO that
	has the name, as in CPython (#1407).  A subclass's property STORED as a
	class attribute -- under a class-body ``if'', or ``Sub.p = property(...)''
	at run time -- used to lose every store to the inherited @property's
	compiled setter: the subclass setter never ran and a read-only one did not
	raise.  The same holds for ``self.p = v'' inside a method, whose inferred
	slot pair wrote the instance directly, and for setattr() and
	object.__setattr__.  A nearer plain value or non-data descriptor sends the
	store to the instance dict.

	Controls: the base itself, a DECLARED subclass @property, and a compiled
	pair nearer than a FARTHER stored property, all unchanged.  On main's code
	9 of the 12 checks fail.

	See tests/python/stored_property_over_inherited_property.py (CPython
	3.14's values)."

	| fixture answers expected b keys |
	importlib @env1:modules removeKey: #'stored_property_over_inherited_property' ifAbsent: [].
	[fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stored_property_over_inherited_property.py')
		name: 'stored_property_over_inherited_property'.
	 answers := fixture @env1:___pyAttrLoad___: #'r'.
	 expected := fixture @env1:___pyAttrLoad___: #'EXPECTED'.
	 b := (Python at: #'builtins') @env1:instance.
	 keys := fixture @env1:___pyAttrLoad___: #'KEYS'.
	 self assert: (keys @env1:__len__) equals: 12.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (answers @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'stored_property_over_inherited_property' ifAbsent: []]

]

{ #category : 'Grail-Tests - Delete' }
DataDescriptorSetTestCase >> testDeleteCallsDunderDelete [
	"``del obj.d'' runs Recorder.__delete__."

	self ___assertCheck: #'delete_calls_dunder_delete'.

]

{ #category : 'Grail-Tests - Delete' }
DataDescriptorSetTestCase >> testDeleteOnlyDescriptorDeletes [
	"A descriptor with __delete__ but no __set__ still claims the delete."

	self ___assertCheck: #'delete_only_descriptor_deletes'.

]

{ #category : 'Grail-Tests - Half a descriptor' }
DataDescriptorSetTestCase >> testDeleteWithoutDunderDeleteRaises [
	"CPython fills ONE slot from EITHER dunder, so a descriptor with only
	__set__ INTERCEPTS ``del'' and then raises AttributeError('__delete__')
	-- it does not fall through to removing an instance attribute."

	self ___assertCheck: #'delete_without_dunder_delete_raises'.

]

{ #category : 'Grail-Tests - All' }
DataDescriptorSetTestCase >> testEveryCheckPasses [
	"Backstop: every check in the fixture, with the FAILING NAMES in the
	message.  A per-check test says which assertion broke; this one catches
	a check added to the fixture and not yet wired to a test method."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #'failures')
		@env1:___pyCallValue___: #() kw: nil.
	self assert: bad @env0:isEmpty
		description: 'fixture checks failed: '
			, (bad @env0:inject: '' into: [:acc :each | acc , ' ' , each @env0:asString]).

]

{ #category : 'Grail-Tests - Homes' }
DataDescriptorSetTestCase >> testInheritedDataDescriptorIntercepts [
	"Declared on a BASE, claiming a store on a subclass instance."

	self ___assertCheck: #'inherited_data_descriptor_intercepts'.

]

{ #category : 'Grail-Tests - Built-in subclasses' }
DataDescriptorSetTestCase >> testIntSubclassDescriptor [
	"Grail has had type-gating bugs on exactly this boundary (PR #739 on the
	read side), so each root is asserted rather than argued about."

	self ___assertCheck: #'int_subclass_descriptor'.

]

{ #category : 'Grail-Tests - Built-in subclasses' }
DataDescriptorSetTestCase >> testListSubclassDescriptor [

	self ___assertCheck: #'list_subclass_descriptor'.

]

{ #category : 'Grail-Tests - Non-data descriptor' }
DataDescriptorSetTestCase >> testNonDataDescriptorIsShadowed [
	"Only __get__ makes it a NON-data descriptor: the instance store writes
	the dict and shadows it, exactly as before.  cached_property depends on
	this, so a fix that intercepted on __get__ alone would break it."

	self ___assertCheck: #'non_data_descriptor_is_shadowed'.

]

{ #category : 'Grail-Tests - Non-data descriptor' }
DataDescriptorSetTestCase >> testNonDataDescriptorReadsBeforeStore [
	"Control for the above -- it really is reached before anything shadows."

	self ___assertCheck: #'non_data_descriptor_reads_before_store'.

]

{ #category : 'Grail-Tests - Non-data descriptor' }
DataDescriptorSetTestCase >> testPlainClassAttributeStillStores [
	"An ordinary class attribute is not a descriptor at all: the store still
	takes the fast route into the instance dict and leaves the class alone."

	self ___assertCheck: #'plain_class_attribute_still_stores'.

]

{ #category : 'Grail-Tests - Property' }
DataDescriptorSetTestCase >> testPropertySetterStillFires [
	"The @property decorator form is claimed EARLIER (object >>
	__setattr__'s accessor-pair dispatch) and must keep working."

	self ___assertCheck: #'property_setter_still_fires'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testReadAfterStoreGoesThroughDescriptor [
	"The observable consequence of the two above, in one expression."

	self ___assertCheck: #'read_after_set_goes_through_descriptor'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testReadOnlyDescriptorLeavesReadIntact [
	"...and the refused store leaves the read answering the descriptor."

	self ___assertCheck: #'read_only_descriptor_leaves_read_intact'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testReadOnlyDescriptorRaises [
	"A descriptor whose __set__ raises makes the attribute read-only --
	pre-fix the assignment silently succeeded."

	self ___assertCheck: #'read_only_descriptor_raises'.

]

{ #category : 'Grail-Tests - Property' }
DataDescriptorSetTestCase >> testReadOnlyPropertyMessage [
	"``property 'p' of 'HasProp' object has no setter'' -- CPython's exact
	text.  The synthesized read-only setter used to raise through env-0
	``AttributeError signal:'' with a partial message, which reached Python
	as an AttributeError whose str() was EMPTY."

	self ___assertCheck: #'read_only_property_message'.

]

{ #category : 'Grail-Tests - Homes' }
DataDescriptorSetTestCase >> testRuntimeSetattrDescriptorIntercepts [
	"Bound by ``Cls.z = Recorder()'' after class creation, so it lives in the
	___dynInstVars___ holder (or the session overlay for a canonical class)
	rather than in a metaclass accessor pair."

	self ___assertCheck: #'runtime_setattr_descriptor_intercepts'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testStoreCallsDunderSet [
	"``obj.d = 7'' runs Recorder.__set__.  Pre-fix it wrote the instance
	dict and __set__ never ran, so calls stayed empty."

	self ___assertCheck: #'set_calls_dunder_set'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testStoreDoesNotShadowInInstanceDict [
	"...and leaves obj.__dict__ untouched.  A shadowing entry is what made
	the NEXT read answer the stored value instead of the descriptor's."

	self ___assertCheck: #'set_does_not_shadow_in_instance_dict'.

]

{ #category : 'Grail-Tests - Half a descriptor' }
DataDescriptorSetTestCase >> testStoreWithoutDunderSetRaises [
	"The mirror image: only __delete__ still intercepts a STORE, raising
	AttributeError('__set__')."

	self ___assertCheck: #'set_without_dunder_set_raises'.

]

{ #category : 'Grail-Tests - Built-in subclasses' }
DataDescriptorSetTestCase >> testStrSubclassDescriptor [

	self ___assertCheck: #'str_subclass_descriptor'.

]

{ #category : 'Grail-Tests - Built-in subclasses' }
DataDescriptorSetTestCase >> testTupleSubclassDescriptor [

	self ___assertCheck: #'tuple_subclass_descriptor'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testValidatingDescriptorAccepts [
	"The common real shape: __set__ validates, then writes private backing."

	self ___assertCheck: #'validating_descriptor_accepts'.

]

{ #category : 'Grail-Tests - Store' }
DataDescriptorSetTestCase >> testValidatingDescriptorRejects [
	"...and refuses a bad value with the descriptor's own exception."

	self ___assertCheck: #'validating_descriptor_rejects'.

]
