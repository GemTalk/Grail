! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DeprecatedCooperativeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DeprecatedCooperativeTestCase comment:
'PEP 702''s @deprecated where it meets the rest of the class machinery.

THE METACLASS EATS ITS KEYWORDS FIRST.  CPython evaluates ``class
Foo(metaclass=MyMeta, cls=''haha'')'' as ``MyMeta(''Foo'', bases, ns,
cls=''haha'')'' -- the header keywords are the metaclass''s to bind or
forward, and __init_subclass__ receives only what its __new__ passes on to
type.__new__.  Grail had it upside down twice over: the keywords never
reached the metaclass, and the hook chain got all of them.  Consumption is
reproduced from the __new__''s signature spec, following __wrapped__ first so
a decorated __new__ (@deprecated''s own wrapper) reads the WRAPPED
function''s parameters.  Named and keyword-only parameters consume their
keyword; a **kwargs catch-all consumes EVERYTHING REMAINING -- measured, not
guessed: CPython leaves the hook chain empty-handed there, and the first
reading ("unconsumed keywords flow through") was plausible and wrong.

A SIBLING BASE''S HOOK GETS THE KEYWORDS.  The vendored _py_warnings now
carries the post-3.14.0 upstream fix: @deprecated''s builtin-case wrapper
delegates cooperatively -- super(arg, cls).__init_subclass__(**kw) -- instead
of forwarding into the captured builtin, which raised.  The other base order
needs Grail''s super() itself to find an ASSIGNED hook on the MRO: a Python
object in the attribute store, which the walk over compiled method
dictionaries slid straight past to object''s terminal no-op.  The lookup now
answers a third pair shape, { hook. #assigned }, run by the same runner class
creation uses.

See tests/python/deprecated_cooperative.py -- whose sibling C-order check is
XFAIL under CPython 3.14.0 itself: the vendored corpus is AHEAD of the
reference interpreter there, the one inversion of the usual rule.'
%

expectvalue /Class
doit
DeprecatedCooperativeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DeprecatedCooperativeTestCase removeAllMethods: 0.
DeprecatedCooperativeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: DeprecatedCooperativeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'deprecated_cooperative' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/deprecated_cooperative.py')
		name: 'deprecated_cooperative'.
%

category: 'Grail-Helpers'
method: DeprecatedCooperativeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: DeprecatedCooperativeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - metaclass keywords'
method: DeprecatedCooperativeTestCase
testTheMetaclassReceivesItsKeyword
	"...and a @deprecated metaclass still does, through __wrapped__."

	self assertAll: #('the_metaclass_receives_its_keyword'
		'a_deprecated_metaclass_still_receives_it')
%

category: 'Grail-Tests - metaclass keywords'
method: DeprecatedCooperativeTestCase
testAKwargsCatchallConsumesEverything
	"Measured against CPython: the hook chain is left empty-handed, and a
	hook requiring a keyword raises -- not the plausible other reading."

	self assertAll: #('a_kwargs_catchall_consumes_everything')
%

category: 'Grail-Tests - sibling delegation'
method: DeprecatedCooperativeTestCase
testBothBaseOrders
	"C(A, B): the wrapper delegates cooperatively and the keyword reaches
	B''s hook.  D(B, A): B''s own super() finds A''s ASSIGNED wrapper on the
	MRO -- the third pair shape in the super() lookup."

	self assertAll: #('the_sibling_hook_receives_the_keyword'
		'the_hooks_own_super_reaches_the_wrapper')
%
