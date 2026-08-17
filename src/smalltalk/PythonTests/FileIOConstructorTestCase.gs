! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FileIOConstructorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FileIOConstructorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FileIOConstructorTestCase
!
! ``io.FileIO(name, mode)'' -- CONSTRUCTING one, and SUBCLASSING it.
!
! FileIO is what open() returns, and it could not be instantiated by name.  The
! two halves failed differently, which is the part worth remembering: the BASE
! class raised (no constructor matched) while a SUBCLASS silently answered an
! UNINITIALISED instance, and that surfaced far away as a Smalltalk ``nil does
! not understand #close''.
!
! See tests/python/fileio_constructor.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FileIOConstructorTestCase removeAllMethods.
FileIOConstructorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - io'
method: FileIOConstructorTestCase
testFileIOConstructor
	"``io.FileIO(name, mode)'', and a Python subclass of it.

	Grail reaches file objects through open(), which routes to FileIO's
	___open___ class method, so nothing ever called ``io.FileIO(...)'' by name and
	the class open() returns had no Python-visible constructor.  How that failed
	is the instructive part:

	    io.FileIO(p, 'rb')          -> TypeError: takes wrong number of arguments
	    class Sub(io.FileIO): pass
	    Sub(p, 'rb')                -> an UNINITIALISED instance, no error

	The base class raised because no constructor matched.  The SUBCLASS succeeded
	because the general class-construction path allocates and then asks
	___pyBuiltinSubclassInit___ to initialise from the built-in base -- and that
	knew list, set, frozenset and complex, not FileIO.  The GsFile and the
	readable/writable/closed bookkeeping were never written, so the failure
	surfaced later as ``a UndefinedObject does not understand #close'': a
	Smalltalk error naming neither the class nor the missing initialisation.

	A MISSING CONSTRUCTOR IS LOUDER ON THE CLASS THAT LACKS IT THAN ON THE CLASS
	THAT INHERITS IT.  That is why the subclass checks sit beside the base ones
	here, and why the fix has two halves -- a real constructor on FileIO, and a
	FileIO branch in ___pyBuiltinSubclassInit___ that initialises in place.

	What it was blocking: 20 of test_wave's 25 errors.  CPython's audiotests.py
	builds ``class UnseekableIO(io.FileIO)'' overriding tell/seek to raise, to
	prove wave can read and write a stream it cannot seek.  test_wave went
	25 errors -> 5 (the rest want array.cast, which is unrelated).

	Mode NORMALISATION is checked because FileIO differs from open() here on
	purpose: ``io.FileIO(p, 'r').mode'' is 'rb' while ``open(p).mode'' is 'r' in
	CPython too, so making the two agree would be wrong.

	All fourteen checks answer identically under real CPython 3.14.6."

	| mod |
	importlib @env1:modules removeKey: #'fileio_constructor' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_constructor.py')
		name: 'fileio_constructor'.
	[#( 'the_default_mode_is_binary_read'
	   'a_mode_is_reported_normalised'
	   'a_text_mode_is_rejected'
	   'readable_and_writable_follow_the_mode'
	   'it_reads_what_open_wrote'
	   'it_works_as_a_context_manager'
	   'the_mode_keyword_is_accepted'
	   'a_missing_name_is_a_typeerror'
	   'a_subclass_constructs'
	   'a_subclass_reads'
	   'a_subclass_closes'
	   'a_subclass_works_as_a_context_manager'
	   'a_subclass_override_wins'
	   'a_subclass_writes' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'FileIO constructor check failed: ' , k
				, ' -> ' , answer printString]]
		ensure: [
			"The fixture writes two files under /tmp; remove them however this
			 test ends, so a failing run does not leave a stale one behind for the
			 next."
			mod @env1:_cleanup]
%
