! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassAttributeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassAttributeTestCase
!
! Class-level dynamic attribute storage.  Pre-fix the only class-side
! attribute mechanism was the auto-generated classInstVar slots that
! ClassDefAst declared at class-build time (for ``class C: x = 1''
! pre-declared bodies and @property pairs).  Setting a brand-new
! name on a class — ``C.brand_new = 42'' — MNU'd because there was
! no slot to write into.
!
! Fix: each generated Python class gets a class instVar
! ``dynInstVars'' holding an Object new whose dynamic instVars
! provide a dict-like store for class-level attributes.  Class-side
! attribute load / store / delete probe it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassAttributeTestCase removeAllMethods.
ClassAttributeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassAttributeTestCase
setUp
	"Reload tests/python/class_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attribute.py')
		name: 'class_attribute'.
%

! --- Direct C.attr = v store / read ---

category: 'Grail-Tests - Direct store'
method: ClassAttributeTestCase
testBrandNewAttrStoreThenRead
	"Setting a brand-new attribute on a class lands in its dynInstVars,
	and the class attribute load reads it back."

	self assert: (testModule @env1:___pyAttrLoad___: #brand_new_read) equals: 42.
%

category: 'Grail-Tests - Direct store'
method: ClassAttributeTestCase
testPreDeclaredAttrStillReadable
	"Pre-declared class body attrs continue to work alongside the new
	dynInstVars storage — no regression."

	self assert: (testModule @env1:___pyAttrLoad___: #declared_read) equals: 'preset'.
%

! --- setattr / getattr builtins ---

category: 'Grail-Tests - setattr / getattr'
method: ClassAttributeTestCase
testSetattrOnClassWrites
	"setattr(C, 'name', value) stores into the class's dynInstVars."

	self assert: (testModule @env1:___pyAttrLoad___: #via_setattr_read) equals: 'hello'.
%

category: 'Grail-Tests - setattr / getattr'
method: ClassAttributeTestCase
testGetattrOnClassReads
	"getattr(C, 'name') reads back through the dynInstVars store."

	self assert: (testModule @env1:___pyAttrLoad___: #via_getattr_read) equals: 'hello'.
%

! --- hasattr ---

category: 'Grail-Tests - hasattr'
method: ClassAttributeTestCase
testHasattrBrandNew
	"hasattr(C, 'name') is True for a dynamically-set class attribute."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_brand_new) equals: true.
%

category: 'Grail-Tests - hasattr'
method: ClassAttributeTestCase
testHasattrMissing
	"hasattr(C, 'never_set') is False."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_missing) equals: false.
%

category: 'Grail-Tests - hasattr'
method: ClassAttributeTestCase
testHasattrDeclared
	"hasattr(C, 'declared') is True for pre-declared class attrs."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_declared) equals: true.
%

! --- delattr / del ---

category: 'Grail-Tests - delattr / del'
method: ClassAttributeTestCase
testDelattrRemovesClassAttribute
	"After delattr(C, 'name'), reading C.name raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #delattr_target_before)
		equals: 'soon gone'.
	self assert: (testModule @env1:___pyAttrLoad___: #delattr_after)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - delattr / del'
method: ClassAttributeTestCase
testDelStatementRemovesClassAttribute
	"`del C.name` removes the slot from dynInstVars."

	self assert: (testModule @env1:___pyAttrLoad___: #del_stmt_after)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - delattr / del'
method: ClassAttributeTestCase
testDelattrMissingRaisesAttributeError
	"delattr(C, 'never_set') raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #delattr_missing)
		equals: 'attribute_error'.
%

! --- Rebind ---

category: 'Grail-Tests - Rebind'
method: ClassAttributeTestCase
testRebindClassAttribute
	"Successive C.name = v stores overwrite — final value reads back."

	self assert: (testModule @env1:___pyAttrLoad___: #counter_after_rebind) equals: 3.
%

! --- Per-class isolation ---

category: 'Grail-Tests - Per-class isolation'
method: ClassAttributeTestCase
testTwoClassesGetSeparateStorage
	"Each class has its own dynInstVars; setting C.tag on one doesn't
	leak into the other."

	self assert: (testModule @env1:___pyAttrLoad___: #box_tag) equals: 'box-tag'.
	self assert: (testModule @env1:___pyAttrLoad___: #other_tag) equals: 'other-tag'.
%

! --- cls.__dict__ ---

category: 'Grail-Tests - Class __dict__'
method: ClassAttributeTestCase
testClassDictReadsOwnAttrs
	"cls.__dict__ is a dict of the class's OWN attributes: class-body
	data attrs read as values, methods appear under their Python names,
	and Grail machinery (dynInstVars, ___...___ selectors) does not
	leak in.  Regresses the PythonInstance instance-__dict__ shadowing
	bug: a CLASS access used to answer an UnboundMethod wrapping the
	per-instance view (test_enum's member_dir then died on .items())."

	self assert: (testModule @env1:___pyAttrLoad___: #dict_x) equals: 7.
	self assert: (testModule @env1:___pyAttrLoad___: #dict_names) equals: 'X|method_a'.
%

category: 'Grail-Tests - Class __dict__'
method: ClassAttributeTestCase
testClassDictSeesSetattr
	"A post-definition setattr(cls, ...) store (dynInstVars-backed)
	shows up in a subsequent cls.__dict__ snapshot."

	self assert: (testModule @env1:___pyAttrLoad___: #dict_after_setattr) equals: 9.
%

category: 'Grail-Tests - Class __dict__'
method: ClassAttributeTestCase
testInstanceDictUnaffectedByClassDict
	"instance.__dict__ keeps its live per-instance view -- the class
	__dict__ special-case triggers only for Behavior receivers."

	self assert: (testModule @env1:___pyAttrLoad___: #inst_dict_y) equals: 5.
%

category: 'Grail-Tests - Reserved names'
method: ClassAttributeTestCase
testReservedClassObjectNamesIsolated
	"A Python class attribute whose name is an inherited kernel class-object
	instVar (``name'', ``format'', ...) is an ordinary Python attribute stored
	in dynInstVars, NOT the class's structural slot.  So ``cls.name'' reads the
	Python value, ``cls.__name__'' still reports the real class name, and each
	class keeps its own per-class value -- and importing such a class no longer
	overwrites the Smalltalk class name (which crashed GemStone 4.0 MR#6's
	permitSessionMethodFor: with ``None asSymbol'').  This is the Django
	cached_property (`name = None`) regression.  See
	docs/Python_Class_Attribute_Namespaces.md."

	self assert: (testModule @env1:___pyAttrLoad___: #reserved_name_is_none).
	self assert: (testModule @env1:___pyAttrLoad___: #reserved_format) equals: 'custom'.
	self assert: (testModule @env1:___pyAttrLoad___: #reserved_qualname) equals: 'ReservedName'.
	self assert: (testModule @env1:___pyAttrLoad___: #reserved_child_name) equals: 'child'.
	self assert: (testModule @env1:___pyAttrLoad___: #reserved_parent_still_none).
	self assert: (testModule @env1:___pyAttrLoad___: #reserved_child_qualname) equals: 'ReservedChild'.
%
