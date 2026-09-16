! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFunctionsFirstClassTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ModuleFunctionsFirstClassTestCase comment:
'A module function must be an OBJECT, not merely something you can call.

Grail reads a module attribute by PERFORMING the Smalltalk method behind it,
unless the method''''s CATEGORY says it is a function -- in which case the read
answers a BoundMethod.  That list is what makes ``from random import random''''
bind the function rather than a float.

About thirty zero-argument module functions were filed in AD-HOC categories --
os.getcwd in ``Grail-File and Directory Operations'''', hashlib.md5 in
``Grail-Constructors'''', _thread.get_ident in ``Grail-Threading'''' -- so the
read performed them and handed back the RESULT:

    hashlib.md5()          a hash object   -- worked
    f := hashlib.md5. f()  TypeError       -- CPython gives a hash object

Only the call form worked, AND BY COINCIDENCE: a zero-argument call and an
attribute read compile to the same unary send, so performing the method WAS
calling it.  The name was never first-class.

WHAT COUNTS AS A FUNCTION HERE WAS DECIDED BY READING EVERY CANDIDATE, not by
its name, because the categories had already been shown untrustworthy in the
sibling fix (a zero-argument module call answering the attribute).  CPython
narrowed the list -- which names it exposes as callable non-classes -- but did
not decide it, because CPython flags sys.excepthook too.

TWO GROUPS WERE DELIBERATELY LEFT ALONE:

  * sys.excepthook and friends are ``^ self at: #excepthook'''' -- DICTIONARY
    READS answering a stored hook.  CPython has them as data attributes
    holding a function, so performing is already right; calling them functions
    would wrap the ACCESSOR instead of answering the hook.
  * builtins.__dir__ is the __dir__ PROTOCOL method that dir() calls
    internally, not a module-level function.'
%

doit
ModuleFunctionsFirstClassTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ModuleFunctionsFirstClassTestCase removeAllMethods: 0.
ModuleFunctionsFirstClassTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleFunctionsFirstClassTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_functions_first_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_functions_first_class.py')
		name: 'module_functions_first_class'.
%

category: 'Grail-Helpers'
method: ModuleFunctionsFirstClassTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ModuleFunctionsFirstClassTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ModuleFunctionsFirstClassTestCase
testAModuleFunctionSurvivesBeingBound
	"``f := os.getcwd. f()'' -- the shape that was broken, across os,
	hashlib, secrets and _thread."

	self assertAll: #('a_module_function_survives_being_bound')
%

category: 'Grail-Tests'
method: ModuleFunctionsFirstClassTestCase
testAndIsStillCallableDirectly
	"The half that already worked must keep working: a direct ``os.getcwd()''
	takes the attribute-call fast path, which emits a direct send and bypasses
	the read entirely -- so recategorising cannot disturb it.  Asserted rather
	than argued."

	self assertAll: #('and_is_still_callable_directly'
		'both_spellings_give_the_same_answer')
%

category: 'Grail-Tests'
method: ModuleFunctionsFirstClassTestCase
testAFunctionCanBeStoredAndCalledLater
	"What first-class actually buys: a table of constructors, which is how
	real code uses hashlib."

	self assertAll: #('a_function_can_be_stored_and_called_later')
%

category: 'Grail-Tests'
method: ModuleFunctionsFirstClassTestCase
testHookAccessorsAreUntouched
	"sys.__excepthook__ holds a callable and is a DATA attribute in CPython
	too, so reading it must answer the hook -- not a bound accessor.  Pinned
	so a later widening of the function list cannot swallow it."

	self assertAll: #('hook_accessors_are_untouched')
%
