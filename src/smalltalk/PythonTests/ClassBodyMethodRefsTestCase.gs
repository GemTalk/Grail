! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyMethodRefsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyMethodRefsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyMethodRefsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyMethodRefsTestCase
!
! Regression for class-body references to sibling methods.
!
! Pre-fix, ``class C: def f(); pair = (f,)'' raised NameError on
! ``f'' at class-init time.  ClassDefAst's class-attribute value
! emit ran with the class compile context popped, and NameAst had
! no class-scope resolution path for sibling method references.
!
! Fixes:
!   - ClassDefAst re-pushes the class compile context for the
!     class-attribute value emit loop.
!   - NameAst emits ``(BoundMethod receiver: nil selector: #f)''
!     when the name resolves to a class-scope function.
!   - BoundMethod's call protocol treats nil-receiver as
!     ``the receiver is positional[1]'' — matching CPython's
!     ``C.__dict__['f'](instance, ...)'' unbound-function semantics.
!
! Originally surfaced loading werkzeug.wrappers.response, which
! does ``data = property(get_data, set_data, ...)''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyMethodRefsTestCase removeAllMethods.
ClassBodyMethodRefsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyMethodRefsTestCase
setUp
	"Load tests/python/class_body_method_refs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'class_body_method_refs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_method_refs.py')
		name: 'class_body_method_refs'.
%

category: 'Grail-Tests'
method: ClassBodyMethodRefsTestCase
testPairResolves
	"``class Box: def first; def second; pair = (first, second)''
	resolves the bare names at class-init time."

	self assert: testModule @env1:pair_resolves equals: true
%

category: 'Grail-Tests'
method: ClassBodyMethodRefsTestCase
testPairCallableWithInstance
	"``Box.pair[0](instance)'' invokes ``first'' on the instance.
	Unbound BoundMethod (receiver=nil) pops positional[1] as the
	dispatch receiver."

	self assert: testModule @env1:pair_callable_with_instance equals: true
%

category: 'Grail-Tests'
method: ClassBodyMethodRefsTestCase
testPropertyDescriptorUsesMethods
	"``x = property(get_x, set_x)'' inside a class body materializes
	a descriptor whose getter / setter dispatch the class-body
	references on the instance."

	self assert: testModule @env1:property_descriptor_uses_methods equals: true
%
