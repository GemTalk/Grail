! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleAttrsAreNotDictMethodsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleAttrsAreNotDictMethodsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleAttrsAreNotDictMethodsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleAttrsAreNotDictMethodsTestCase - a module read is not a dict operation
! ===============================================================================
! A Grail module IS a SymbolDictionary, and ___pyAttrLoad___'s module branch
! resolved a unary selector with whichClassIncludesSelector:, which walks the
! WHOLE superclass chain, then PERFORMED whatever it found.  Above `module' that
! chain is SymbolDictionary, IdentityDictionary, KeyValueDictionary,
! AbstractDictionary, Collection, Object -- which carry the env-1 Python dict
! protocol, against the module's own storage.
!
! So a plain hasattr destroyed a module:
!
!     hasattr(json, 'clear')    answered True AND emptied json for the rest of
!                               the session -- json.JSONEncoder then raised
!                               AttributeError, surviving abort and
!                               importlib resetSessionForReinstall
!     hasattr(json, 'popitem')  deleted an entry, and once clear() had run,
!                               raised KeyError: popitem(): dictionary is empty
!
! and keys/values/items/copy answered the dict's view of the module (#1233).  It
! is reachable from ordinary introspection: inspect.getmembers and pydoc walk
! module namespaces, and an MCP eval_python reports the halt as a bare "Internal
! error".
!
! The repair refuses an owner ABOVE `module', so the read falls through to
! AttributeError -- what CPython answers.  Scoped by measurement rather than
! guesswork: across the loaded modules every one of those six names resolves to
! KeyValueDictionary with a nil category, while every legitimate attribute
! (__name__ and __doc__ on `module' itself, a module's own Grail-Accessors and
! Grail-Methods) is module-side.  So nothing legitimate is lost.
!
! WHAT IS LEFT OF #1233, and is NOT addressed here: update/pop/setdefault/get
! take arguments, so an earlier branch answers a function handle for them --
! wrong, but it performs nothing; reading sys.breakpoint still halts the gem
! because it is misfiled as an accessor; a module's body still owns the plain
! selector `initialize', so a user's def initialize() is shadowed; and the
! default for an unlisted module-side category is still perform.
!
! tests/python/module_attrs_are_not_dict_methods.py holds the 9 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.  Without the repair it
! does not merely fail -- it does not LOAD, because reading `clear' empties the
! module and `popitem' two names later raises on the empty dict.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleAttrsAreNotDictMethodsTestCase removeAllMethods.
ModuleAttrsAreNotDictMethodsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleAttrsAreNotDictMethodsTestCase
setUp

	importlib @env1:modules removeKey: #'module_attrs_are_not_dict_methods' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attrs_are_not_dict_methods.py')
		name: 'module_attrs_are_not_dict_methods'
%

category: 'Grail-Helpers'
method: ModuleAttrsAreNotDictMethodsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ModuleAttrsAreNotDictMethodsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - attributes'
method: ModuleAttrsAreNotDictMethodsTestCase
testAnInheritedDictMethodIsNotAModuleAttribute

	self assertAll: #('no_inherited_dict_method_is_a_module_attribute'
		'getattr_raises_attribute_error_for_each')
%

category: 'Grail-Tests - attributes'
method: ModuleAttrsAreNotDictMethodsTestCase
testTheModuleSurvivesReadingEveryOneOfThem
	"The order these are read in is the order that emptied the module and then
	raised KeyError on the empty dict."

	self assertAll: #('the_module_survives_reading_every_one'
		'and_textwrap_too')
%

category: 'Grail-Tests - attributes'
method: ModuleAttrsAreNotDictMethodsTestCase
testTheReadsThatShouldWorkAreUnchanged

	self assertAll: #('a_modules_own_names_still_read'
		'dunder_accessors_still_read'
		'a_missing_name_is_still_an_attribute_error'
		'hasattr_is_false_for_a_missing_name'
		'the_module_is_still_iterable_by_dir')
%

category: 'Grail-Tests - attributes'
method: ModuleAttrsAreNotDictMethodsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
