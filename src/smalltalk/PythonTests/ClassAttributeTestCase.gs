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
	mods @env0:removeKey: #'class_attribute' ifAbsent: [].
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
