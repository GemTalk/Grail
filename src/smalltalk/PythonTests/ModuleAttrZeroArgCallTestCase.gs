! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleAttrZeroArgCallTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ModuleAttrZeroArgCallTestCase comment:
'``m.f()'''' and ``m.f'''' are the SAME Smalltalk send when there are no
arguments.

A module attribute read compiles to a unary send, and so does a zero-argument
call: both emit ``(m) f''''.  Whether that collapse is right depends entirely
on what the method DOES.

  * a FUNCTION -- os.getcwd, hashlib.md5, random.random -- performs the work
    and answers the result, so performing it IS calling it.  Harmless.
  * a VALUE ACCESSOR answers something the caller then means to call, and the
    collapse silently DROPS the call:

        io.BufferedIOBase()          ->  the CLASS      (wrong)
        C := io.BufferedIOBase. C()  ->  an instance    (right)

    The same expression, two spellings, two answers.

WHY THE RULE IS OPT-IN, which is the part worth keeping: the first fix used the
category allowlist the READ path uses -- function categories call, everything
else is a value -- and it is UNSOUND.  Real functions live in ad-hoc
categories (os.getcwd in ``Grail-File and Directory Operations'''', hashlib.md5
in ``Grail-Constructors''''), so declining the collapse for everything unlisted
broke them.  MEASURED, NOT GUESSED: hashlib.md5() began failing with ``Hash
class does not understand #__call__''''.

So a module DECLARES its value accessors -- ``Grail-Type Accessors'''' -- and
only those decline.  Everything else compiles exactly as before, which makes
the change additive rather than a reinterpretation of every module method.

THE REGRESSION HALF OF THIS TEST IS AS IMPORTANT AS THE FIX HALF.  It pins the
zero-argument module FUNCTIONS that must keep working, because those are what
the unsound version broke.

Cost of the collapse: 65 tests in test_sax, where saxutils builds an
io.BufferedIOBase() by hand and the class it got back reported a truthy
``closed'''', so XMLGenerator over a BytesIO died with ``write to closed
file'''' about a stream that was open.'
%

doit
ModuleAttrZeroArgCallTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ModuleAttrZeroArgCallTestCase removeAllMethods: 0.
ModuleAttrZeroArgCallTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleAttrZeroArgCallTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_zero_arg_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_zero_arg_call.py')
		name: 'module_attr_zero_arg_call'.
%

category: 'Grail-Helpers'
method: ModuleAttrZeroArgCallTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ModuleAttrZeroArgCallTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ModuleAttrZeroArgCallTestCase
testEverySpellingOfAValueAccessorCallAgrees
	"``io.BufferedIOBase()'', ``C := io.BufferedIOBase. C()'' and
	``getattr(io, ...)()'' must answer the same thing.  Only the FIRST
	collapsed into the attribute read, which is why it alone was wrong."

	self assertAll: #('every_spelling_gives_an_instance'
		'each_io_base_instantiates')
%

category: 'Grail-Tests'
method: ModuleAttrZeroArgCallTestCase
testZeroArgModuleFunctionsStillWork
	"THE REGRESSION HALF.  These live in ad-hoc categories and are NOT
	declared value accessors, so they still take the collapsed path --
	performing them IS the call.  The first attempt at this fix broke every
	one of them, which is how the opt-in rule was arrived at."

	self assertAll: #('zero_arg_module_functions_still_work')
%

category: 'Grail-Tests'
method: ModuleAttrZeroArgCallTestCase
testACallWithArgumentsIsUntouched
	"Only ZERO-argument calls ever collapsed -- ``m.f(a)'' emits ``(m) f: a'',
	which no read could be confused with.  Pinned so the rule cannot widen."

	self assertAll: #('a_call_with_arguments_is_untouched')
%

category: 'Grail-Tests'
method: ModuleAttrZeroArgCallTestCase
testWhatTheCollapseActuallyCost
	"XMLGenerator over a BytesIO -- the CPython path for that case, and 65
	test_sax failures.  The StringIO form took a different branch and already
	worked; it is pinned alongside so a change to the rule cannot quietly
	break the half that was fine."

	self assertAll: #('xmlgenerator_over_a_bytesio'
		'xmlgenerator_over_a_stringio')
%
