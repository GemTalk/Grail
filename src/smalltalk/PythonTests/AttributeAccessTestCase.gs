! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeAccessTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeAccessTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeAccessTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeAccessTestCase
!
! Symmetric counterpart to AttributeStoreTestCase.  The store side
! now writes straight to dynamicInstVarAt:put: regardless of whether
! a same-named selector exists; these tests pin down that the READ /
! QUERY / DELETE paths see the same store consistently and that
! del / delattr truly REMOVE the slot so a previously-shadowed
! class method becomes visible again.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeAccessTestCase removeAllMethods.
AttributeAccessTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributeAccessTestCase
setUp
	"Reload tests/python/attribute_access.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'attribute_access' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_access.py')
		name: 'attribute_access'.
%

! --- getattr ---

category: 'Grail-Tests - getattr'
method: AttributeAccessTestCase
testGetattrExisting
	"getattr(h, 'value') returns the stored value."

	self assert: (testModule @env1:___pyAttrLoad___: #getattr_existing) equals: 42.
%

category: 'Grail-Tests - getattr'
method: AttributeAccessTestCase
testGetattrWithDefault
	"getattr(h, 'missing', 'fallback') returns the default when missing."

	self assert: (testModule @env1:___pyAttrLoad___: #getattr_with_default) equals: 'fallback'.
%

category: 'Grail-Tests - getattr'
method: AttributeAccessTestCase
testGetattrMissingNoDefault
	"getattr(h, 'missing') raises AttributeError when no default given."

	self assert: (testModule @env1:___pyAttrLoad___: #getattr_missing_no_default)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - getattr'
method: AttributeAccessTestCase
testGetattrReturnsCallableMethod
	"getattr(h, 'method_name') on an unshadowed method yields a callable
	that returns the method's result when invoked."

	self assert: (testModule @env1:___pyAttrLoad___: #getattr_method_call)
		equals: 'method_result'.
%

! --- hasattr ---

category: 'Grail-Tests - hasattr'
method: AttributeAccessTestCase
testHasattrPresent
	"hasattr(h, 'attr') is True after the attribute is set."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_present) equals: true.
%

category: 'Grail-Tests - hasattr'
method: AttributeAccessTestCase
testHasattrMissing
	"hasattr(h, 'no_such_attr') is False for an unset name."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_missing) equals: false.
%

category: 'Grail-Tests - hasattr'
method: AttributeAccessTestCase
testHasattrMethod
	"hasattr(h, 'method_name') is True — a class method counts as an
	attribute even though the instance slot is empty."

	self assert: (testModule @env1:___pyAttrLoad___: #hasattr_method) equals: true.
%

! --- del statement ---

category: 'Grail-Tests - del statement'
method: AttributeAccessTestCase
testDelRemovesAttribute
	"After `del h.tmp`, reading h.tmp raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #del_before) equals: 'present'.
	self assert: (testModule @env1:___pyAttrLoad___: #del_after_lookup)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - del statement'
method: AttributeAccessTestCase
testDelUnshadowsMethod
	"Setting h.method_name = 'shadowed' shadows the class method.
	After `del h.method_name`, reads fall through to the class's
	method again (lazy-wrapped as a callable)."

	self assert: (testModule @env1:___pyAttrLoad___: #unshadow_before)
		equals: 'shadowed'.
	self assert: (testModule @env1:___pyAttrLoad___: #unshadow_after_is_callable)
		equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #unshadow_after_call)
		equals: 'method_result'.
%

category: 'Grail-Tests - del statement'
method: AttributeAccessTestCase
testDelMissingRaisesAttributeError
	"`del h.never_set` raises AttributeError when no such attribute exists."

	self assert: (testModule @env1:___pyAttrLoad___: #del_missing)
		equals: 'attribute_error'.
%

! --- delattr builtin ---

category: 'Grail-Tests - delattr'
method: AttributeAccessTestCase
testDelattrRemovesAttribute
	"After delattr(h, 'x'), reading h.x raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #delattr_after_lookup)
		equals: 'attribute_error'.
%

category: 'Grail-Tests - delattr'
method: AttributeAccessTestCase
testDelattrReturnsNone
	"Per CPython, builtins.delattr returns None."

	self assert: (testModule @env1:___pyAttrLoad___: #delattr_result_is_none)
		equals: true.
%

category: 'Grail-Tests - delattr'
method: AttributeAccessTestCase
testDelattrMissingRaisesAttributeError
	"delattr(h, 'never_set') raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #delattr_missing)
		equals: 'attribute_error'.
%
