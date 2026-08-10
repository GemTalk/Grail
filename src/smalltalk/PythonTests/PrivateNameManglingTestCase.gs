! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrivateNameManglingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PrivateNameManglingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PrivateNameManglingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PrivateNameManglingTestCase - CPython private-name mangling (_Py_Mangle)
! ===============================================================================
! ``self.__x'' inside class C compiles to _C__x, so a private attribute is
! per-class: a subclass writing its own __x gets a different slot.
!
! Also guards the two things that broke while implementing it -- mangled
! method calls keeping the direct-send fast path (a stack-depth issue, not
! just a speed one), and super() continuing to pass its arguments.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PrivateNameManglingTestCase removeAllMethods.
PrivateNameManglingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - mangling'
method: PrivateNameManglingTestCase
testPrivateNameMangling
	"CPython's _Py_Mangle: an identifier written in a class body with two
	or more leading underscores and not two trailing ones becomes
	_<Class><name>.  That is what makes a private attribute PER-CLASS --
	a subclass's own __x is a different slot, and cannot read the base's.

	Two implementation hazards are pinned here as well, because both were
	invisible in a pass/fail count:

	MANGLED CALLS MUST KEEP THE FAST PATH.  The name sets CallAst consults
	to decide a direct self-send were collected BEFORE the compiler knew
	which class it was in, so they held UNMANGLED names; the membership
	test missed and every private call fell onto the much heavier
	attribute-load route.  That is a stack-depth regression, not merely a
	slow one: a private recursion bottomed out at depth 400 where the
	public equivalent reached 1137, and it died with an uncatchable
	`cross frame of C primitive' instead of raising RecursionError --
	which is what crashed test_richcmp's MiscTest.test_recursion, whose
	UserList comparisons run through UserList.__eq__ -> self.__cast().

	SUPER() MUST KEEP WORKING.  Setting the compiler's current-class
	marker early enough to mangle also made isModuleScopeClassDef answer
	false for every class (that marker IS its `nested inside another
	class' test), routing super() through the method-local closure-cell
	path, where it silently dropped arguments: werkzeug's Request lost
	`environ' and a whole SUnit shard died -- while the summary still
	read `0 failed', because the shard's 1149 tests simply never ran."

	| mod results |
	importlib @env1:modules removeKey: #'private_name_mangling' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/private_name_mangling.py')
		name: 'private_name_mangling'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('base_reads_own' 'derived_reads_own' 'derived_reads_base'
	  'mangled_in_dict' 'unmangled_not_in_dict' 'both_slots_on_derived'
	  'public_untouched' 'base_helper' 'derived_helper'
	  'base_helper_via_derived' 'dunder_not_mangled'
	  'single_underscore_untouched' 'trailing_dunder_untouched'
	  'super_passes_args' 'private_recursion_is_catchable') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
