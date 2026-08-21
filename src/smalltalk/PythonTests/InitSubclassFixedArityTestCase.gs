! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'InitSubclassFixedArityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
InitSubclassFixedArityTestCase comment:
'``__init_subclass__'' with declared parameters -- the fixed-arity hook.

PEP 487''s hook receives the class header''s keywords: ``class C(Base, x=42)''
calls ``Base.__init_subclass__(cls=C, x=42)''.  A hook with a REQUIRED
parameter exercises a corner Grail got catastrophically wrong: the generated
keyword-binding forwarder re-dispatched to the fixed-arity method with a
VIRTUAL self-send, and with self a CLASS the lookup ran the metaclass chain
-- ``a Metaclass3 does not understand #__init_subclass__:'', an UNCATCHABLE
Smalltalk error that killed the module mid-import, at every ``class C(Base,
x=1)'' whose hook declares a parameter.

The repair is in the DNU handler, scoped to the one selector family whose
instance-side methods legitimately take class receivers: an
``__init_subclass__''-family selector arriving at a class whose own
INSTANCE-side chain owns it finishes the dispatch the way it was started,
non-virtually, via performMethod:.  Everything else keeps failing exactly as
before.

Deliberately NOT covered: forwarding a hook''s __func__ to a class UNRELATED
to the defining one.  Grail''s UnboundMethod documents that a function
grafted onto an unrelated class needs the whole function object to travel,
not a (class, selector) handle; the fixture uses the subclass shape
@deprecated actually forwards to.

See tests/python/init_subclass_fixed_arity.py.'
%

expectvalue /Class
doit
InitSubclassFixedArityTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
InitSubclassFixedArityTestCase removeAllMethods: 0.
InitSubclassFixedArityTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: InitSubclassFixedArityTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass_fixed_arity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass_fixed_arity.py')
		name: 'init_subclass_fixed_arity'.
%

category: 'Grail-Helpers'
method: InitSubclassFixedArityTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: InitSubclassFixedArityTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the header keyword'
method: InitSubclassFixedArityTestCase
testTheHeaderKeywordBindsToTheParameter
	"The case that used to be an uncatchable MNU killing the module."

	self assertAll: #('the_header_keyword_binds_to_the_parameter'
		'each_subclass_gets_its_own_value')
%

category: 'Grail-Tests - the header keyword'
method: InitSubclassFixedArityTestCase
testDefaultsAndOmissions
	"An omitted keyword takes the parameter''s default; omitting a REQUIRED
	one is CPython''s TypeError, not a silent skip."

	self assertAll: #('a_default_fills_an_omitted_keyword'
		'a_missing_required_keyword_raises')
%

category: 'Grail-Tests - the forwarding shapes'
method: InitSubclassFixedArityTestCase
testFuncForwardingWithAnExplicitClass
	"__func__ called with the class made explicit -- the shape @deprecated''s
	wrapper forwards through."

	self assertAll: #('func_forwarding_with_an_explicit_class')
%

category: 'Grail-Tests - the forwarding shapes'
method: InitSubclassFixedArityTestCase
testDeprecatedWithAFixedArityBaseHook
	"test_existing_init_subclass_in_base end to end: decoration sees the
	original value, the subclass re-runs the hook with its own, and the
	warning is emitted."

	self assertAll: #('deprecated_with_a_fixed_arity_base_hook')
%
