! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DirExcludesInternalsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DirExcludesInternalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DirExcludesInternalsTestCase - dir() must not report Grail plumbing.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DirExcludesInternalsTestCase removeAllMethods.
DirExcludesInternalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Attribute Access'
method: DirExcludesInternalsTestCase
testDirExcludesInternals
	"Grail derives dir() from Smalltalk SELECTORS, so anything reachable on the
	chain can leak out under a Python-looking name.  Found by sweeping dir()
	against CPython across 42 subjects (scripts/dir_parity.py); three sources,
	three different fixes:

	  * ``perform'', ``value'' and ``with'' were never methods anyone wrote.
	    They are the kernel selectors ``perform:env:'', ``value:value:'' and
	    ``with:perform:env:'' -- the dispatch and call protocol Grail is built
	    on -- TRUNCATED AT THE FIRST COLON.  A Grail method selector is
	    ``name:'' followed by zero or more ``_:'', so object>>__dir__ now checks
	    the whole encoding instead of truncating.  These three alone polluted 40
	    of the 42 subjects.

	    They could not be fixed by the ``___''-prefix convention that covers
	    Grail's own helpers: they are kernel selectors, ``value:value:'' is
	    deliberately the universal call protocol, and a prefix filter never sees
	    them anyway because ``with:perform:env:'' is an ordinary selector.

	  * ``dynInstVars'' and ``_replaceFirst'' WERE genuine Grail-added methods
	    with ordinary names, and are now spelt ``___dynInstVars___'' /
	    ``___replaceFirst___''.

	Measured: 777 extra names -> 641, with ZERO names lost.  That second number
	is the one that matters and is why the fixture's positive checks outnumber
	its negative ones -- dir() drives unittest's getTestCaseNames, inspect and
	pydoc, so over-filtering silently stops tests being discovered, which is far
	worse than the leak being fixed.  The four method-shape checks cover the
	four distinct selector encodings (unary, fixed-arity with one and with two
	parameters, and the varargs transport form).

	All ten checks answer identically under real CPython 3.14.6, which has no
	such attributes to leak.  See tests/python/dir_excludes_internals.py."

	| mod |
	importlib @env1:modules removeKey: #'dir_excludes_internals' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_excludes_internals.py')
		name: 'dir_excludes_internals'.
	#( 'a_plain_object_reports_no_internals'
	   'an_instance_reports_no_internals'
	   'a_class_reports_no_internals'
	   'a_string_reports_no_internals'
	   'an_exception_reports_no_internals'
	   'every_method_shape_is_still_listed'
	   'data_attributes_are_still_listed'
	   'inherited_names_are_still_listed'
	   'the_standard_dunders_are_still_listed'
	   'dir_is_sorted_and_unique' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'dir() check failed: ' , k , ' -> ' , answer printString]
%
