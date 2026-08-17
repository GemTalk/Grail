! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StdlibModuleNamesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StdlibModuleNamesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StdlibModuleNamesTestCase - sys.stdlib_module_names, and its drift guard.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StdlibModuleNamesTestCase removeAllMethods.
StdlibModuleNamesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Runtime Information'
method: StdlibModuleNamesTestCase
testStdlibModuleNames
	"``sys.stdlib_module_names'' names Python's standard library.

	It was an empty frozenset.  traceback.py reads it to answer ``Did you forget
	to import 'io'?'' for a NameError naming a stdlib module, so the hint could
	never fire.

	CPython's value is a BUILD-TIME CONSTANT compiled into the interpreter rather
	than a runtime scan of the stdlib directory, so vendoring the list is the
	faithful implementation, not a shortcut.  Deriving it from Grail's own
	src/python/stdlib was considered and rejected: Grail ships neither ``io.py''
	nor ``_io'', which are precisely the two cases the hint exists for, so a
	derived set answers neither.  The list therefore describes PYTHON's standard
	library, not Grail's -- the hint is advice about the language, and importing
	a module Grail lacks fails loudly on its own.

	All eight checks answer identically under real CPython 3.14.6.  See
	tests/python/stdlib_module_names.py."

	| mod |
	importlib @env1:modules removeKey: #'stdlib_module_names' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stdlib_module_names.py')
		name: 'stdlib_module_names'.
	#( 'it_is_a_frozenset'
	   'it_is_not_empty'
	   'it_contains_public_modules'
	   'it_contains_private_modules'
	   'it_excludes_non_modules'
	   'a_stdlib_name_gets_an_import_hint'
	   'a_private_stdlib_name_gets_an_import_hint'
	   'a_non_stdlib_name_gets_no_import_hint' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'stdlib_module_names check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - Runtime Information'
method: StdlibModuleNamesTestCase
testStdlibModuleNamesMatchTheVendoredFile
	"The DRIFT GUARD, and the reason sys.gs may hold the names as a literal.

	scripts/cpython_314_stdlib_modules.txt is the source of truth -- it is
	already shared with scripts/cpython_import_census.py -- while sys.gs needs
	an inline literal, because sys initialisation does no file I/O.  Two copies
	of one list drift silently, so this asserts they are the same SET.

	This check lives here and NOT in the Python fixture on purpose: under real
	CPython the fixture sees CPython's OWN stdlib_module_names (290 names on
	3.14.6) rather than Grail's, so comparing it against Grail's vendored file
	(297) would fail for a reason that has nothing to do with Grail being wrong.
	That asymmetry is also why the fixture asserts no COUNT.

	A mismatch here means the file was updated and sys.gs was not (or the
	reverse).  The failure names the difference in both directions rather than
	just the sizes -- a count tells you something moved, not what."

	| path file source names live missingFromLive missingFromFile |
	path := importlib grailDir , '/scripts/cpython_314_stdlib_modules.txt'.
	file := GsFile open: path mode: 'rb' onClient: false.
	file isNil ifTrue: [^ self assert: false description: 'cannot read ' , path].
	source := [file contentsAsUtf8 decodeToUnicode] ensure: [file close].
	names := IdentitySet new.
	(source subStrings: (String with: Character lf)) do: [:raw |
		| line |
		line := raw trimSeparators.
		(line isEmpty or: [(line at: 1) = $#])
			ifFalse: [names add: line asSymbol]].
	self assert: names size > 100
		description: 'vendored list looks empty: ' , names size printString.
	"sys.stdlib_module_names is a Python frozenset; read its elements as Symbols
	so the two sides compare on the same representation."
	live := IdentitySet new.
	((sys @env1:instance) @env1:___pyAttrLoad___: #'stdlib_module_names') @env0:do: [:each |
		live @env0:add: each @env0:asString asSymbol].
	missingFromLive := names @env0:reject: [:n | live @env0:includes: n].
	missingFromFile := live @env0:reject: [:n | names @env0:includes: n].
	self assert: (missingFromLive @env0:isEmpty and: [missingFromFile @env0:isEmpty])
		description: 'sys.stdlib_module_names has drifted from '
			, 'scripts/cpython_314_stdlib_modules.txt -- in the file but not in sys: '
			, missingFromLive asArray printString
			, '; in sys but not in the file: '
			, missingFromFile asArray printString
%
