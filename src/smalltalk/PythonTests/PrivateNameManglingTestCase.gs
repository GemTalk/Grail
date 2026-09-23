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
	  'super_passes_args') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Testing'
classmethod: PrivateNameManglingTestCase
skippedTests
	"Kermit 52108: resignalAs: from the stack-overflow handler can re-trip the
	stack limit in the interpreter.  See #testPrivateRecursionIsCatchable."

	^ self
		skipping: #(#testPrivateRecursionIsCatchable)
		whenNativeCodeIsOffBecause: 'Kermit 52108: resignalAs: re-trips the stack limit in the interpreter'
%

category: 'Grail-Tests - mangling'
method: PrivateNameManglingTestCase
testPrivateRecursionIsCatchable
	"A private method recursion -- self.__go(n + 1) -- must take the direct-send
	fast path and so reach a normal depth and raise a CATCHABLE RecursionError
	(see testPrivateNameMangling for the history).

	Its own fixture (tests/python/private_name_mangling_recursion.py) and its
	own test, SKIPPED WHEN NATIVE CODE IS OFF (see the class-side #skippedTests),
	because of a GemStone VM defect: Kermit 52108.  resignalAs: from the
	AlmostOutOfStackError handler -- what ___recursionGuard___ does -- re-arms
	the yellow-zone guard page with no margin, so when the trip lands in a method prologue the replacement
	RecursionError trips the limit again while it is being dispatched, and the
	second one escapes the ``except RecursionError:'' already committed to the
	first.  At module level that aborted the load of the shared fixture and
	lost all fifteen mangling checks, which is why this one moved out.

	It reproduces only in the interpreter (every Darwin arm64 gem; Linux with
	GEM_NATIVE_CODE_ENABLED=0), not with native code on, so CI still checks
	it.  Plain-Smalltalk reproduction: branch repro/resignal-retrip,
	tests/vm/resignal_retrip_repro.gs.  Remove the skip when Kermit 52108 is
	fixed."

	| mod results |
	importlib @env1:modules removeKey: #'private_name_mangling_recursion' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/private_name_mangling_recursion.py')
		name: 'private_name_mangling_recursion'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	self assert: ((results @env1:__getitem__: 'private_recursion_is_catchable') = true)
		description: 'private_recursion_is_catchable'
%
