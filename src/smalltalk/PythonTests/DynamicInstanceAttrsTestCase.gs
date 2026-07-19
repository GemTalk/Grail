! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DynamicInstanceAttrsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DynamicInstanceAttrsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DynamicInstanceAttrsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DynamicInstanceAttrsTestCase
!
! Phase B: instance attributes via dynamicInstVarAt: storage.  Same
! design as Phase A (DynamicGlobalsTestCase) applied to PythonInstance
! attributes instead of module globals.  Goal: del obj.x truly unbinds
! the attribute, hasattr correctly reports False, setattr from outside
! reaches the same backing store as bare assignment from inside.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DynamicInstanceAttrsTestCase removeAllMethods.
DynamicInstanceAttrsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DynamicInstanceAttrsTestCase
setUp
	"Load tests/python/phase_b_instance_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'phase_b_instance_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/phase_b_instance_attrs.py')
		name: 'phase_b_instance_attrs'.
%

category: 'Grail-Tests - Instance Attrs'
method: DynamicInstanceAttrsTestCase
testInstanceAttrSetAtInit
	"Construction-time __init__ assignment should round-trip through
	dynamic-instVar storage (or static today — either works for this
	probe).  Sanity check that the fixture itself is well-formed."

	self assert: (testModule @env1:___pyAttrLoad___: #'initial_value') equals: 42.
	self assert: (testModule @env1:___pyAttrLoad___: #'present_before_del') equals: true.
%

category: 'Grail-Tests - Instance Attrs'
method: DynamicInstanceAttrsTestCase
testDelInstanceAttrTrulyUnbinds
	"Phase B red light: after `del obj.x`, hasattr(obj, 'x') should
	return False because the binding is truly removed from the
	instance's attribute namespace.  Today, AttributeAst del either
	errors or nils the static instVar slot — the binding persists and
	hasattr reports True.  After Phase B, del emits
	``removeDynamicInstVar:'' on the instance and hasattr reaches
	AttributeError (which it catches into false)."

	self assert: (testModule @env1:___pyAttrLoad___: #'present_after_del') equals: false.
%

category: 'Grail-Tests - Instance Attrs'
method: DynamicInstanceAttrsTestCase
testSetattrRebindsAfterDel
	"After `del obj.x; obj.x = 100`, the attribute should be readable
	again with the new value.  Verifies the dynamic-instVar store
	accepts a re-bind cleanly (no stale class-level shadow, no
	residual nil from the static slot)."

	self assert: (testModule @env1:___pyAttrLoad___: #'present_after_rebind') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'rebound_value') equals: 100.
%
