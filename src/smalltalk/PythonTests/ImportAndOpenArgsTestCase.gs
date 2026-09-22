! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportAndOpenArgsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportAndOpenArgsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportAndOpenArgsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportAndOpenArgsTestCase
!
! __import__() and open(): arguments that were not checked, and keywords that
! were not read.
!
! Four of these produced a WRONG ANSWER or an uncatchable Smalltalk error
! rather than the exception CPython raises:
!
!   __import__(1, 2, 3, 4)      fell through to importlib's own scan and died
!                               with ``a SmallInteger does not understand
!                               #indexOf:startingAt:'' -- UNCATCHABLE, out of a
!                               builtin, where CPython raises TypeError
!   __import__(name='sys')      reported the argument MISSING, having been
!                               supplied by name
!   __import__('sys',           not detected as given twice
!               name='sys')
!   open('a\0b')                opened the TRUNCATED path and reported
!                               FileNotFoundError for a name the caller never
!                               asked for.  That is the wrong exception for the
!                               wrong reason: a caller catching it to CREATE
!                               the file goes on to create the wrong one.
!
! And one LATENT bug the keyword work exposed: importlib read its keyword
! arguments with bare __getitem__, which raises KeyError for a key that is not
! there.  So supplying ANY keyword without supplying all of them failed on the
! first one missing -- ``__import__('sys', fromlist=['path'])'' raised
! ``KeyError: 'globals'''.  It survived because callers in the corpus pass
! either no keywords at all (kwargs nil, which the other branch covers) or the
! whole set, and a partial call is the ordinary spelling.
!
! The EMPTY NAME has a case either way, which is why both are here.
! ``__import__('')'' is a bad argument and a ValueError.  ``__import__('', g,
! l, ('foo',), 1)'' is the spelling of ``from . import foo'': at level 1 an
! empty name means the package itself, which is legal and must fail as an
! ImportError about the missing parent -- so a blanket ValueError would turn a
! handled case into an unhandled one.
!
! That second case also needed CPython's package RESOLUTION, which Grail did
! not have: __package__, then __spec__'s parent, and only then a fallback to
! __name__ that is WARNED about (bpo-37409, ImportWarning) because it is a
! guess that can silently resolve to the wrong package.  Grail read
! __package__ alone and raised immediately, so a relative import from a
! namespace carrying only __spec__ failed where CPython succeeds.  The test
! asserts the warning AND the ImportError together, which is what says the
! fallback was attempted rather than skipped.
!
! Drives tests/python/import_and_open_args.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_import and test_open.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportAndOpenArgsTestCase removeAllMethods.
ImportAndOpenArgsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportAndOpenArgsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'import_and_open_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_and_open_args.py')
		name: 'import_and_open_args'.
%

category: 'Grail-Private'
method: ImportAndOpenArgsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - __import__ keywords'
method: ImportAndOpenArgsTestCase
testImportReadsItsParametersByName
	"The PARTIAL row is the one that found the latent bug: supplying one
	keyword without the rest raised KeyError for the first one missing, which
	no caller in the corpus had ever done."

	self assertMatchesCPythonAt: 'import_positional'.
	self assertMatchesCPythonAt: 'import_by_name'.
	self assertMatchesCPythonAt: 'import_name_and_level'.
	self assertMatchesCPythonAt: 'import_partial_keywords'.
%

category: 'Grail-Tests - __import__ arguments'
method: ImportAndOpenArgsTestCase
testImportChecksItsArguments
	"A non-string name reached importlib's own scan and died with an
	UNCATCHABLE Smalltalk error out of a builtin -- the caller could neither
	handle it nor see what it meant."

	self assertMatchesCPythonAt: 'import_non_string'.
	self assertMatchesCPythonAt: 'import_empty_name'.
	self assertMatchesCPythonAt: 'import_name_twice'.
	self assertMatchesCPythonAt: 'import_missing_module'.
	self assertMatchesCPythonAt: 'import_nul_in_name'.
%

category: 'Grail-Tests - Relative imports'
method: ImportAndOpenArgsTestCase
testTheRelativeFallbackWarnsBeforeItFails
	"THE SAME EMPTY NAME, and it must NOT be the ValueError above: at level 1
	it is ``from . import foo'', which is legal and fails as an ImportError
	about the missing parent.  The warning is asserted with it, because that
	is what says CPython's fallback chain (__package__, then __spec__.parent,
	then a warned guess at __name__) was walked rather than skipped."

	self assertMatchesCPythonAt: 'relative_without_package'.
%

category: 'Grail-Tests - open'
method: ImportAndOpenArgsTestCase
testOpenRefusesAnEmbeddedNul
	"Both spellings: the bytes one arrives as bytes and the path coercion
	turns it into the bytes object's printString, in which the NUL is no
	longer a NUL -- so a check on the coerced form alone lets it through."

	self assertMatchesCPythonAt: 'open_nul_str'.
	self assertMatchesCPythonAt: 'open_nul_bytes'.
%

category: 'Grail-Tests - Controls'
method: ImportAndOpenArgsTestCase
testAnOrdinaryMissingFileIsUnaffected
	"THE CONTROL: the new check refuses what cannot be a path, not everything
	that fails to open."

	self assertMatchesCPythonAt: 'open_missing_file'.
%

category: 'Grail-Tests - Controls'
method: ImportAndOpenArgsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '13 checks, 0 disagreeing [], keys match: True'
%
