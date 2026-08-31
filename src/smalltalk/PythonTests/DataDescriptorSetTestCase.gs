! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DataDescriptorSetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DataDescriptorSetTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DataDescriptorSetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DataDescriptorSetTestCase
!
! A class attribute whose OWN TYPE defines ``__set__'' (or ``__delete__'') is a
! DATA DESCRIPTOR, and in CPython it wins over the instance dict in BOTH
! directions: ``obj.x = v'' calls ``type(obj).x.__set__(obj, v)'' and writes
! NOTHING into obj.__dict__; ``del obj.x'' calls __delete__.  A NON-data
! descriptor (only __get__) does the opposite -- the store shadows it -- and
! that half is as load-bearing as this one (functools.cached_property is
! exactly it).
!
! Grail's STORE path recognised only its own ``property'':
! ___instancePropertyDescriptorFor___: asked ``isKindOf:
! AbstractPropertyDescriptor''.  A user's ``class D: __get__/__set__'' was
! invisible to it, so the store wrote the instance dict, __set__ never ran, and
! a read-only descriptor raised nothing -- the corpus works around it by
! enforcing read-only in __setattr__ instead (collections._tuplegetter).
!
! Same defect the READ path had before ___grailPyDefinedAccessorPair___:setter:
! (PR #739) replaced its receiver-KIND tests with a shape question, and fixed
! the same way: ___instanceDataDescriptorFor___: asks whether the value IS a
! data descriptor, whatever class it is, and looks in all three homes a class
! attribute can live in (session overlay, metaclass accessor pair,
! ___dynInstVars___ holder).
!
! Fixture: tests/python/data_descriptor_set.py, which self-verifies under
! CPython 3.14 (scripts/check_python_fixtures.sh).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DataDescriptorSetTestCase removeAllMethods.
DataDescriptorSetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DataDescriptorSetTestCase
setUp
	"Reload tests/python/data_descriptor_set.py fresh each test -- the
	descriptors record their calls in module-level state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'data_descriptor_set' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/data_descriptor_set.py')
		name: 'data_descriptor_set'.
%

category: 'Grail-Setup'
method: DataDescriptorSetTestCase
___check: aName
	"Run one named check from the fixture and answer its Boolean."

	^ (testModule @env1:___pyAttrLoad___: aName)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Setup'
method: DataDescriptorSetTestCase
___assertCheck: aName
	"Assert one named fixture check, naming it in the failure message."

	self assert: (self ___check: aName) equals: true.
%

! ------------------- the store direction

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testStoreCallsDunderSet
	"``obj.d = 7'' runs Recorder.__set__.  Pre-fix it wrote the instance
	dict and __set__ never ran, so calls stayed empty."

	self ___assertCheck: #'set_calls_dunder_set'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testStoreDoesNotShadowInInstanceDict
	"...and leaves obj.__dict__ untouched.  A shadowing entry is what made
	the NEXT read answer the stored value instead of the descriptor's."

	self ___assertCheck: #'set_does_not_shadow_in_instance_dict'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testReadAfterStoreGoesThroughDescriptor
	"The observable consequence of the two above, in one expression."

	self ___assertCheck: #'read_after_set_goes_through_descriptor'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testReadOnlyDescriptorRaises
	"A descriptor whose __set__ raises makes the attribute read-only --
	pre-fix the assignment silently succeeded."

	self ___assertCheck: #'read_only_descriptor_raises'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testReadOnlyDescriptorLeavesReadIntact
	"...and the refused store leaves the read answering the descriptor."

	self ___assertCheck: #'read_only_descriptor_leaves_read_intact'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testValidatingDescriptorAccepts
	"The common real shape: __set__ validates, then writes private backing."

	self ___assertCheck: #'validating_descriptor_accepts'.
%

category: 'Grail-Tests - Store'
method: DataDescriptorSetTestCase
testValidatingDescriptorRejects
	"...and refuses a bad value with the descriptor's own exception."

	self ___assertCheck: #'validating_descriptor_rejects'.
%

! ------------------- the delete direction

category: 'Grail-Tests - Delete'
method: DataDescriptorSetTestCase
testDeleteCallsDunderDelete
	"``del obj.d'' runs Recorder.__delete__."

	self ___assertCheck: #'delete_calls_dunder_delete'.
%

category: 'Grail-Tests - Delete'
method: DataDescriptorSetTestCase
testDeleteOnlyDescriptorDeletes
	"A descriptor with __delete__ but no __set__ still claims the delete."

	self ___assertCheck: #'delete_only_descriptor_deletes'.
%

! ------------------- CPython's shared tp_descr_set slot

category: 'Grail-Tests - Half a descriptor'
method: DataDescriptorSetTestCase
testDeleteWithoutDunderDeleteRaises
	"CPython fills ONE slot from EITHER dunder, so a descriptor with only
	__set__ INTERCEPTS ``del'' and then raises AttributeError('__delete__')
	-- it does not fall through to removing an instance attribute."

	self ___assertCheck: #'delete_without_dunder_delete_raises'.
%

category: 'Grail-Tests - Half a descriptor'
method: DataDescriptorSetTestCase
testStoreWithoutDunderSetRaises
	"The mirror image: only __delete__ still intercepts a STORE, raising
	AttributeError('__set__')."

	self ___assertCheck: #'set_without_dunder_set_raises'.
%

! ------------------- the direction that must NOT change

category: 'Grail-Tests - Non-data descriptor'
method: DataDescriptorSetTestCase
testNonDataDescriptorIsShadowed
	"Only __get__ makes it a NON-data descriptor: the instance store writes
	the dict and shadows it, exactly as before.  cached_property depends on
	this, so a fix that intercepted on __get__ alone would break it."

	self ___assertCheck: #'non_data_descriptor_is_shadowed'.
%

category: 'Grail-Tests - Non-data descriptor'
method: DataDescriptorSetTestCase
testNonDataDescriptorReadsBeforeStore
	"Control for the above -- it really is reached before anything shadows."

	self ___assertCheck: #'non_data_descriptor_reads_before_store'.
%

category: 'Grail-Tests - Non-data descriptor'
method: DataDescriptorSetTestCase
testPlainClassAttributeStillStores
	"An ordinary class attribute is not a descriptor at all: the store still
	takes the fast route into the instance dict and leaves the class alone."

	self ___assertCheck: #'plain_class_attribute_still_stores'.
%

! ------------------- where the class attribute lives

category: 'Grail-Tests - Homes'
method: DataDescriptorSetTestCase
testInheritedDataDescriptorIntercepts
	"Declared on a BASE, claiming a store on a subclass instance."

	self ___assertCheck: #'inherited_data_descriptor_intercepts'.
%

category: 'Grail-Tests - Homes'
method: DataDescriptorSetTestCase
testRuntimeSetattrDescriptorIntercepts
	"Bound by ``Cls.z = Recorder()'' after class creation, so it lives in the
	___dynInstVars___ holder (or the session overlay for a canonical class)
	rather than in a metaclass accessor pair."

	self ___assertCheck: #'runtime_setattr_descriptor_intercepts'.
%

! ------------------- built-in roots, where the read path's kind-gating broke

category: 'Grail-Tests - Built-in subclasses'
method: DataDescriptorSetTestCase
testIntSubclassDescriptor
	"Grail has had type-gating bugs on exactly this boundary (PR #739 on the
	read side), so each root is asserted rather than argued about."

	self ___assertCheck: #'int_subclass_descriptor'.
%

category: 'Grail-Tests - Built-in subclasses'
method: DataDescriptorSetTestCase
testStrSubclassDescriptor

	self ___assertCheck: #'str_subclass_descriptor'.
%

category: 'Grail-Tests - Built-in subclasses'
method: DataDescriptorSetTestCase
testTupleSubclassDescriptor

	self ___assertCheck: #'tuple_subclass_descriptor'.
%

category: 'Grail-Tests - Built-in subclasses'
method: DataDescriptorSetTestCase
testListSubclassDescriptor

	self ___assertCheck: #'list_subclass_descriptor'.
%

! ------------------- @property, both forms, still right

category: 'Grail-Tests - Property'
method: DataDescriptorSetTestCase
testPropertySetterStillFires
	"The @property decorator form is claimed EARLIER (object >>
	__setattr__'s accessor-pair dispatch) and must keep working."

	self ___assertCheck: #'property_setter_still_fires'.
%

category: 'Grail-Tests - Property'
method: DataDescriptorSetTestCase
testReadOnlyPropertyMessage
	"``property 'p' of 'HasProp' object has no setter'' -- CPython's exact
	text.  The synthesized read-only setter used to raise through env-0
	``AttributeError signal:'' with a partial message, which reached Python
	as an AttributeError whose str() was EMPTY."

	self ___assertCheck: #'read_only_property_message'.
%

! ------------------- and the whole fixture, naming what failed

category: 'Grail-Tests - All'
method: DataDescriptorSetTestCase
testEveryCheckPasses
	"Backstop: every check in the fixture, with the FAILING NAMES in the
	message.  A per-check test says which assertion broke; this one catches
	a check added to the fixture and not yet wired to a test method."

	| bad |
	bad := (testModule @env1:___pyAttrLoad___: #'failures')
		@env1:___pyCallValue___: #() kw: nil.
	self assert: bad @env0:isEmpty
		description: 'fixture checks failed: '
			, (bad @env0:inject: '' into: [:acc :each | acc , ' ' , each @env0:asString]).
%
