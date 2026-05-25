! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DynamicGlobalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DynamicGlobalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DynamicGlobalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DynamicGlobalsTestCase
!
! Module-level names added at module-init time (e.g. via
! globals().update(...)) should be readable from the rest of the
! module body.  CPython resolves bare reads through __globals__ at
! runtime; Grail needs the same effect via a runtime self-at-lookup
! fallback in NameAst codegen when in module-body/method context.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DynamicGlobalsTestCase removeAllMethods.
DynamicGlobalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DynamicGlobalsTestCase
setUp
	"Load tests/python/dynamic_globals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'dynamic_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dynamic_globals.py')
		name: 'dynamic_globals'.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testDynamicGlobalReadDirect
	"After globals().update({'DYN_X': 11, 'DYN_Y': 22}), reading DYN_X
	from module top level should return 11.  Phase A: module-scope
	reads land in dynamicInstVarAt: storage, so we probe via
	___pyAttrLoad___: (the same path Python ``mod.attr'' takes)
	rather than the legacy env-1 unary accessor."

	self assert: (testModule @env1:___pyAttrLoad___: #'result_x') equals: 11.
	self assert: (testModule @env1:___pyAttrLoad___: #'result_y') equals: 22.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testDynamicGlobalReadInExpression
	"Reading dynamic globals inside an expression also works."

	self assert: (testModule @env1:___pyAttrLoad___: #'result_sum') equals: 33.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testDelRemovesModuleGlobal
	"After `del predeclared`, reading `predeclared` should raise
	NameError.  Today this happens to pass via the codegen-emitted
	dynamicInstVarAt:ifAbsent:[NameError] wrapper (Phase A) or, on
	the legacy static-instVar path, the UnboundLocalError check
	(which is a NameError subclass)."

	self assert: (testModule @env1:___pyAttrLoad___: #'del_made_name_unbound') equals: true.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testHasattrFalseAfterDel
	"Phase A red light → green: after `del deletable`, hasattr(mod,
	'deletable') should return False because the binding is truly
	removed from the module's attribute namespace (the dynamic-instVar
	slot is gone, and ___pyAttrLoad___ falls through to AttributeError,
	which hasattr catches)."

	self assert: (testModule @env1:___pyAttrLoad___: #'deletable_present_before_del') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'deletable_present_after_del') equals: false.
%

category: 'Grail-Tests - Setattr Dispatch'
method: DynamicGlobalsTestCase
testSetattrRespectsDnuDispatch
	"Regression: when setattr targets an attribute name with no
	statically-declared setter on the receiver's class, the call must
	dispatch through the receiver's doesNotUnderstand handler — for a
	PythonInstance subclass that means the value lands in __dict__
	and is reachable via getattr / hasattr / mod.attr.

	An earlier ``builtins>>setattr:'' used
	``whichClassIncludesSelector:'' to decide whether a static
	``name:'' setter existed; that precheck saw nil for an undeclared
	attribute and silently stored the value via
	``dynamicInstVarAt:put:'' on the receiver, bypassing __dict__
	entirely.  Subsequent getattr / attribute reads returned None
	because they followed the __dict__ path and never consulted the
	dynamic-instVar slot.  This was the root cause of the Jinja2
	template-render regression and was fixed by switching setattr to
	``on: MessageNotUnderstood do:'' — the perform: actually fires
	DNU, the handler captures the call, and the value lands where
	Python expects it."

	| mod mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'setattr_dnu_dispatch' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/setattr_dnu_dispatch.py')
		name: 'setattr_dnu_dispatch'.
	self assert: (mod @env1:___pyAttrLoad___: #'extra_value') equals: 42.
	self assert: (mod @env1:___pyAttrLoad___: #'extra_present') equals: true.
%
