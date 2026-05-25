! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeStoreTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeStoreTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeStoreTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeStoreTestCase
!
! Python: `obj.foo = value` writes via type(obj).__setattr__, which by
! default stores into the instance dict.  A regular method named `foo`
! is NOT a data descriptor — the store does NOT dispatch to it; the
! instance attribute simply shadows the method on later reads.
!
! Pre-fix, Grail's AssignAst (for non-self receivers) and
! builtins.setattr emitted/sent `obj @env1:foo: value`, so a class
! method `foo:` was incorrectly invoked as a "setter".  Fix: both
! paths write straight to dynamicInstVarAt:put: regardless of whether
! a same-named selector exists on the class.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeStoreTestCase removeAllMethods.
AttributeStoreTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributeStoreTestCase
setUp
	"Reload tests/python/attribute_store.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'attribute_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_store.py')
		name: 'attribute_store'.
%

category: 'Grail-Tests - Direct attr store'
method: AttributeStoreTestCase
testDirectStoreWritesValue
	"After `c.value = 42`, reading c.value returns 42."

	self assert: (testModule @env1:___pyAttrLoad___: #direct_value_after) equals: 42.
%

category: 'Grail-Tests - Direct attr store'
method: AttributeStoreTestCase
testDirectStoreDoesNotInvokeMethod
	"The `value:` method on Counter must NOT be invoked by `c.value = 42`.
	Pre-fix, AssignAst's non-self path emitted `obj @env1:value: 42`
	which dispatched to the method — appending 42 to side_effects."

	self assert: (testModule @env1:___pyAttrLoad___: #direct_side_effects_count) equals: 0.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrWritesValue
	"After setattr(c, 'value', 99), reading c.value returns 99."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_value_after) equals: 99.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrDoesNotInvokeMethod
	"builtins.setattr must store into the dict slot, not dispatch
	to a same-named class method."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_side_effects_count) equals: 0.
%

category: 'Grail-Tests - Sanity'
method: AttributeStoreTestCase
testStoreOfBrandNewAttrStillWorks
	"Sanity: a non-colliding attribute name still round-trips."

	self assert: (testModule @env1:___pyAttrLoad___: #brand_new_attr_after) equals: 'hello'.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrReturnsNone
	"Per CPython, builtins.setattr returns None.  Capturing the
	return value of setattr(c, 'foo', 42) must yield None, NOT the
	stored 42 (which is what we'd get if the helper bubbled aValue
	out for codegen convenience)."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_return_is_none) equals: true.
%

category: 'Grail-Tests - Sanity'
method: AttributeStoreTestCase
testUnshadowedMethodStillCallable
	"Sanity: until shadowed, the method is reachable through the class.
	c4.value(7) appends 7 to side_effects."

	| sideEffects |
	sideEffects := testModule @env1:___pyAttrLoad___: #unshadowed_side_effects.
	self assert: sideEffects @env0:size equals: 1.
	self assert: (sideEffects @env0:at: 1) equals: 7.
%
